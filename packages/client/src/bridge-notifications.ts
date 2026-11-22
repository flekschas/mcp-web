import { setTimeout as sleep } from 'node:timers/promises';

const MIN_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30_000;
/** How long a stream must stay open before it resets the backoff. */
const STABLE_STREAM_MS = 30_000;
const SESSION_DELETE_TIMEOUT_MS = 2000;

/** The MCP lists the bridge sends `list_changed` notifications for. */
export type BridgeList = 'tools' | 'resources';
const LISTS: BridgeList[] = ['tools', 'resources'];

interface WatchBridgeNotificationsOptions {
  /** Bridge HTTP URL, the same one MCP requests are posted to. */
  url: string;
  authToken?: string;
  timeout: number;
  /**
   * Called when the bridge reports that a list changed, and for every list
   * whenever a stream opens because changes may have been missed while it was
   * not open.
   */
  onListChanged: (list: BridgeList) => void;
}

/**
 * Keeps an MCP session with the bridge open and listens to its notification
 * stream, reconnecting with a backoff until the returned stop function is
 * called.
 */
export function watchBridgeNotifications({
  url,
  authToken,
  timeout,
  onListChanged,
}: WatchBridgeNotificationsOptions): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  const authHeaders: Record<string, string> = authToken
    ? { Authorization: `Bearer ${authToken}` }
    : {};

  const run = async () => {
    let retryDelay = MIN_RETRY_DELAY_MS;
    let isFailing = false;

    while (!signal.aborted) {
      let sessionId: string | undefined;
      let openedAt: number | undefined;
      try {
        sessionId = await initializeSession(url, authHeaders, timeout, signal);
        const response = await openStream(
          url,
          { ...authHeaders, 'Mcp-Session-Id': sessionId },
          timeout,
          signal,
        );
        const contentType = response.headers.get('content-type') ?? '';
        const mediaType = contentType.split(';')[0].trim().toLowerCase();
        if (
          !response.ok ||
          !response.body ||
          mediaType !== 'text/event-stream'
        ) {
          await response.body?.cancel();
          throw new Error(
            `HTTP ${response.status} ${contentType}: ${response.statusText}`,
          );
        }

        openedAt = Date.now();
        isFailing = false;
        for (const list of LISTS) onListChanged(list);

        for await (const data of readEventData(response.body)) {
          const message = JSON.parse(data) as { method?: unknown };
          const list = LISTS.find(
            (name) => message.method === `notifications/${name}/list_changed`,
          );
          if (list) onListChanged(list);
        }
        if (Date.now() - openedAt < STABLE_STREAM_MS) {
          throw new Error('Stream ended right after opening');
        }
      } catch (error) {
        if (signal.aborted) break;
        if (!isFailing) {
          isFailing = true;
          console.error(
            `[MCPWebClient] Bridge notification stream unavailable, retrying: ${error instanceof Error ? error.message : error}`,
          );
        }
      } finally {
        if (sessionId) {
          fetch(url, {
            method: 'DELETE',
            headers: { ...authHeaders, 'Mcp-Session-Id': sessionId },
            signal: AbortSignal.timeout(SESSION_DELETE_TIMEOUT_MS),
          }).catch(() => {});
        }
      }

      // Only a stable stream resets the backoff, so a bridge that keeps
      // ending streams right away cannot cause a tight loop.
      if (openedAt !== undefined && Date.now() - openedAt >= STABLE_STREAM_MS) {
        retryDelay = MIN_RETRY_DELAY_MS;
      }
      await sleep(retryDelay, undefined, { signal }).catch(() => {});
      retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
    }
  };

  void run();

  return () => controller.abort();
}

async function initializeSession(
  url: string,
  authHeaders: Record<string, string>,
  timeout: number,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: '@mcp-web/client', version: '1.0.0' },
      },
    }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeout)]),
  });

  const body = (await response.json()) as { error?: { message?: string } };
  const sessionId = response.headers.get('mcp-session-id');
  if (!sessionId) {
    throw new Error(body.error?.message ?? `HTTP ${response.status}`);
  }
  return sessionId;
}

/**
 * Opens the notification stream. `timeout` applies until the response headers
 * arrive. Reading the body is only bound to `signal`.
 */
async function openStream(
  url: string,
  headers: Record<string, string>,
  timeout: number,
  signal: AbortSignal,
): Promise<Response> {
  const headersTimeout = new AbortController();
  const timer = setTimeout(() => headersTimeout.abort(), timeout);
  try {
    return await fetch(url, {
      headers: { ...headers, Accept: 'text/event-stream' },
      signal: AbortSignal.any([signal, headersTimeout.signal]),
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Yields the data of each server-sent event. */
async function* readEventData(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let data: string[] = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) return;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line === '') {
        if (data.length > 0) yield data.join('\n');
        data = [];
      } else if (line.startsWith('data:')) {
        data.push(line.slice(line.startsWith('data: ') ? 6 : 5));
      }
    }
  }
}
