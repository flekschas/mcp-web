import { MCP_APP_VIEW_META_NAME, type Tool } from '@mcp-web/types';
import type { App } from '@modelcontextprotocol/ext-apps';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/** Claude ignores every tool of a view that offers more than this. */
const MAX_APP_TOOLS = 64;

/** Delay after the last change before the state is sent to the host. */
const STATE_DELAY_MS = 1000;

/**
 * Longest state text sent to the host, so a large state can't flood the
 * model.
 */
const MAX_STATE_TEXT_LENGTH = 20_000;

const TRUNCATED = '… (truncated, call the getter tool for the full value)';

/** Longest note about states left out of the state text. */
const OMITTED_MAX_LENGTH = 60;

/**
 * What MCPWeb gives the host connection.
 *
 * @internal
 */
export interface AppToolSource {
  /** Name of the app, as shown to the host. */
  name: string;
  /** Version of the app, as shown to the host. */
  version?: string;
  listTools(): Tool[];
  callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<CallToolResult>;
  /** Text for the model about the current state, or undefined for none. */
  describeState(): string | undefined;
}

/**
 * A connection to the MCP App host that shows this page as a view.
 *
 * @internal
 */
export interface MCPAppHost {
  /** Tells the host that the tool list changed. */
  toolsChanged(): void;
  /** Sends the current state to the host now. */
  sendState(): void;
  /** Sends the current state to the host once changes settle. */
  stateChanged(): void;
  close(): Promise<void>;
}

/**
 * Whether this page is a view that the bridge served to an MCP App host, and
 * runs in a frame, as views do. Only the bridge adds the view mark, so a site
 * that frames the web app, or the view's public file, can't use its tools.
 *
 * @internal
 */
export function runsAsMCPAppView(): boolean {
  const win = globalThis.window;
  if (win === undefined || win.parent === undefined || win.parent === win) {
    return false;
  }
  return !!globalThis.document?.head?.querySelector(
    `meta[name="${MCP_APP_VIEW_META_NAME}"]`,
  );
}

/**
 * Offers the tools of `source` to the MCP App host around this page.
 *
 * Resolves to `null` when the handshake fails or is cancelled, or when
 * ext-apps fails to load.
 *
 * @param options.transport - Channel to the host. Defaults to `postMessage`
 *   with the parent window.
 * @param options.signal - Cancels the handshake.
 *
 * @internal
 */
export async function connectToMCPAppHost(
  source: AppToolSource,
  { transport, signal }: { transport?: Transport; signal?: AbortSignal } = {},
): Promise<MCPAppHost | null> {
  let app: App | undefined;
  const cancel = () => void app?.close().catch(() => {});
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    // Loaded on demand, so other pages don't load ext-apps.
    const extApps = await import('@modelcontextprotocol/ext-apps');
    if (signal?.aborted) return null;
    app = new extApps.App(
      // The protocol requires a version.
      { name: source.name, version: source.version ?? '0.0.0' },
      { tools: { listChanged: true } },
      // Set up below, so `close()` can stop it.
      { autoResize: false },
    );
    setUpToolHandlers(app, source);
    await app.connect(
      transport ??
        new extApps.PostMessageTransport(window.parent, window.parent),
    );
  } catch (error) {
    if (!signal?.aborted) {
      console.warn('Could not connect to the MCP App host:', error);
    }
    cancel();
    return null;
  } finally {
    signal?.removeEventListener('abort', cancel);
  }
  if (signal?.aborted) {
    cancel();
    return null;
  }

  const connectedApp = app;
  let closed = false;

  // A size change queued for the next frame can run after `close()`.
  const sendSizeChanged = connectedApp.sendSizeChanged.bind(connectedApp);
  connectedApp.sendSizeChanged = (params) =>
    closed ? Promise.resolve() : sendSizeChanged(params);
  const stopResizing = globalThis.ResizeObserver
    ? connectedApp.setupSizeChangedNotifications()
    : undefined;

  // The host keeps the last state it got, so an empty text clears it. One
  // update is sent at a time; changes during it are sent right after.
  let sentStateText = '';
  let sending = false;
  let sendAgain = false;
  const sendState = async () => {
    if (!connectedApp.getHostCapabilities()?.updateModelContext?.text) return;
    if (sending) {
      sendAgain = true;
      return;
    }
    sending = true;
    do {
      sendAgain = false;
      const text = source.describeState() ?? '';
      if (text === sentStateText || closed) continue;
      try {
        await connectedApp.updateModelContext({
          content: text ? [{ type: 'text', text }] : [],
        });
        sentStateText = text;
      } catch (error) {
        console.debug('Failed to send the state to the MCP App host:', error);
      }
    } while (sendAgain && !closed);
    sending = false;
  };

  let stateTimer: ReturnType<typeof setTimeout> | undefined;
  let toolsChangedQueued = false;

  return {
    toolsChanged() {
      // Tools are often added in a batch, which needs only one notification.
      if (toolsChangedQueued || closed) return;
      toolsChangedQueued = true;
      queueMicrotask(() => {
        toolsChangedQueued = false;
        if (closed) return;
        connectedApp.sendToolListChanged().catch((error) => {
          console.debug('Failed to notify the MCP App host:', error);
        });
      });
    },
    sendState() {
      if (closed) return;
      clearTimeout(stateTimer);
      void sendState();
    },
    stateChanged() {
      if (closed) return;
      clearTimeout(stateTimer);
      stateTimer = setTimeout(sendState, STATE_DELAY_MS);
    },
    async close() {
      closed = true;
      clearTimeout(stateTimer);
      stopResizing?.();
      await connectedApp.close();
    },
  };
}

function setUpToolHandlers(app: App, source: AppToolSource) {
  let warnedAboutToolCount = false;
  app.onlisttools = async () => {
    const tools = source.listTools();
    if (tools.length > MAX_APP_TOOLS && !warnedAboutToolCount) {
      warnedAboutToolCount = true;
      console.warn(
        `MCP-Web offers ${tools.length} app tools, but Claude ignores every tool of a view with more than ${MAX_APP_TOOLS}. Consider code mode to offer state tools through one code tool.`,
      );
    }
    return { tools };
  };
  app.oncalltool = (params) =>
    source.callTool(params.name, params.arguments ?? {});
}

/**
 * Describes the current value of each state for the model.
 *
 * @internal
 */
export function describeState(
  appName: string,
  states: Map<string, () => unknown>,
): string | undefined {
  if (states.size === 0) return undefined;

  const heading = `Current state of ${appName.slice(0, 100)}:`;
  const values = new Map<string, string>();
  let textLength = heading.length + OMITTED_MAX_LENGTH;
  for (const [name, get] of states) {
    let json: string;
    try {
      json = JSON.stringify(get()) ?? 'undefined';
    } catch {
      json = '(not serializable)';
    }
    values.set(name, json);
    textLength += `\n- ${name}: `.length + TRUNCATED.length;
  }

  // Each value gets an equal share of what's left after the other text.
  const maxLength = Math.max(
    0,
    Math.floor((MAX_STATE_TEXT_LENGTH - textLength) / states.size),
  );
  let text = heading;
  let shown = 0;
  for (const [name, json] of values) {
    const value =
      json.length > maxLength ? json.slice(0, maxLength) + TRUNCATED : json;
    const line = `\n- ${name}: ${value}`;
    // With many states, their names alone can exceed the limit.
    if (
      text.length + line.length + OMITTED_MAX_LENGTH >
      MAX_STATE_TEXT_LENGTH
    ) {
      const omitted = values.size - shown;
      return `${text}\n… (${omitted} more states, call their getter tools)`;
    }
    text += line;
    shown++;
  }
  return text;
}
