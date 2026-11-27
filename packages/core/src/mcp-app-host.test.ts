import { afterEach, expect, test } from 'bun:test';
import { AppBridge } from '@modelcontextprotocol/ext-apps/app-bridge';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  type JSONRPCMessage,
  ToolListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { describeState } from './mcp-app-host.js';
import { MCPWeb } from './web.js';

type Globals = { window?: unknown; document?: unknown; WebSocket?: unknown };
const globals = globalThis as Globals;
const originalWindow = globals.window;
const originalDocument = globals.document;
const originalWebSocket = globals.WebSocket;

afterEach(() => {
  globals.window = originalWindow;
  globals.document = originalDocument;
  globals.WebSocket = originalWebSocket;
});

/** Messages the view posted to the host window. */
let postedToHost: JSONRPCMessage[] = [];

/**
 * Puts the test in a frame: `window.parent` is a host window, and messages
 * between the two go through `postMessage` as in a browser. The document is
 * a view served by the bridge, unless `view` is `false`. With `hostAnswers:
 * 'error'`, the parent answers every request with an error.
 */
function enterFrame({
  hostAnswers,
  view = true,
}: {
  hostAnswers: boolean | 'error';
  view?: boolean;
}) {
  enterDocument(view);
  postedToHost = [];
  const events = new EventTarget();
  const hostWindow: { postMessage?: (message: JSONRPCMessage) => void } = {};
  globals.window = {
    parent: hostWindow,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };

  const hostTransport: Transport = {
    async start() {},
    async send(message) {
      const event = new Event('message');
      Object.defineProperties(event, {
        data: { value: message },
        source: { value: hostWindow },
      });
      queueMicrotask(() => events.dispatchEvent(event));
    },
    async close() {
      hostTransport.onclose?.();
    },
  };
  hostWindow.postMessage = (message) => {
    postedToHost.push(message);
    if (hostAnswers === 'error') {
      if ('method' in message && 'id' in message) {
        hostTransport.send({
          jsonrpc: '2.0',
          id: message.id,
          error: { code: -32601, message: 'Not an MCP App host' },
        });
      }
    } else if (hostAnswers) {
      queueMicrotask(() => hostTransport.onmessage?.(message));
    }
  };
  return hostTransport;
}

/** A document with events for activity tracking, and the view mark. */
function enterDocument(view: boolean) {
  const document = Object.assign(new EventTarget(), {
    visibilityState: 'visible',
    head: {
      querySelector: (selector: string) =>
        view && selector === 'meta[name="mcp-web-view"]' ? {} : null,
    },
  });
  globals.document = document;
}

/** Records the bridge URLs MCPWeb opens, without connecting. */
function stubWebSocket() {
  const urls: string[] = [];
  globals.WebSocket = class {
    static OPEN = 1;
    readyState = 0;
    constructor(url: string) {
      urls.push(url);
    }
    send() {}
    close() {}
  };
  return urls;
}

async function connectHost(hostTransport: Transport) {
  const host = new AppBridge(
    null,
    { name: 'test-host', version: '1.0.0' },
    { updateModelContext: { text: {} } },
  );
  const contexts: string[] = [];
  host.onupdatemodelcontext = async ({ content }) => {
    // An empty context clears the previous one.
    const block = content?.[0];
    contexts.push(block?.type === 'text' ? block.text : '');
    return {};
  };
  let toolListChanges = 0;
  host.setNotificationHandler(ToolListChangedNotificationSchema, () => {
    toolListChanges++;
  });
  await host.connect(hostTransport);
  return { host, contexts, toolListChanges: () => toolListChanges };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test('in an MCP App view, tools are offered to the host as app tools', async () => {
  const hostTransport = enterFrame({ hostAnswers: true });
  const webSocketUrls = stubWebSocket();
  const { host, contexts, toolListChanges } = await connectHost(hostTransport);

  let todos = ['Buy milk'];
  const mcp = new MCPWeb({
    name: 'Todo',
    description: 'Todos',
    mcpApp: true,
    version: '2.3.1',
    autoConnect: false,
  });
  // Known before the handshake, so the page can render for a view at once.
  expect(mcp.isMCPApp).toBe(true);
  const [, , removeTodos] = mcp.addStateTools({
    name: 'todos',
    description: 'The todo list',
    schema: z.array(z.string()),
    get: () => todos,
    set: (value) => {
      todos = value;
    },
  });
  mcp.addApp({
    name: 'show_stats',
    description: 'Show statistics',
    component: () => null,
    handler: () => ({}),
  });
  mcp.addTool({
    name: 'count_todos',
    description: 'Count the todos',
    handler: () => todos.length,
    _meta: { ui: { visibility: ['model', 'app'] } },
  });
  mcp.addTool({
    name: 'show_list',
    description: 'Opens a view with the older flat resource URI',
    handler: () => ({}),
    _meta: { 'ui/resourceUri': 'ui://list/app.html' },
  });
  mcp.addTool({
    name: 'count_big',
    description: 'Returns a result that is not JSON',
    handler: () => ({ count: 1n }),
  });

  expect(await mcp.connect()).toBe(true);
  expect(mcp.isMCPApp).toBe(true);
  expect(mcp.connected).toBe(true);
  expect(webSocketUrls).toEqual([]);
  expect(host.getAppVersion()).toEqual({ name: 'Todo', version: '2.3.1' });

  const { tools } = await host.listTools({});
  // Tools that open views are left out: they need the bridge.
  expect(tools.map((tool) => tool.name).sort()).toEqual([
    'count_big',
    'count_todos',
    'get_todos',
    'set_todos',
  ]);
  const big = await host.callTool({ name: 'count_big', arguments: {} });
  expect(big.isError).toBe(true);
  for (const tool of tools) expect(tool.inputSchema.type).toBe('object');

  const result = await host.callTool({
    name: 'set_todos',
    arguments: { value: ['Buy milk', 'Walk the dog'] },
  });
  expect(result.isError).toBeUndefined();
  expect(todos).toEqual(['Buy milk', 'Walk the dog']);

  const failed = await host.callTool({
    name: 'set_todos',
    arguments: { value: 'not a list' },
  });
  expect(failed.isError).toBe(true);

  // The host gets the state on connect and again once changes settle.
  expect(contexts[0]).toContain('- todos: ["Buy milk"]');
  await wait(1100);
  expect(contexts.at(-1)).toContain('- todos: ["Buy milk","Walk the dog"]');

  mcp.addTool({
    name: 'clear_todos',
    description: 'Remove all todos',
    handler: () => {
      todos = [];
    },
  });
  await wait(10);
  expect(toolListChanges()).toBe(1);

  // Removing the last state clears the state the host has.
  removeTodos();
  await wait(1100);
  expect(contexts.at(-1)).toBe('');

  mcp.disconnect();
  expect(mcp.isMCPApp).toBe(true);
  expect(mcp.connected).toBe(false);
});

test('in an MCP App view, a tool with an output schema returns structured content', async () => {
  const hostTransport = enterFrame({ hostAnswers: true });
  stubWebSocket();
  const { host } = await connectHost(hostTransport);

  let count: number | null = 2;
  const mcp = new MCPWeb({
    name: 'Todo',
    description: 'Todos',
    mcpApp: true,
    autoConnect: false,
  });
  mcp.addTool({
    name: 'count_todos',
    description: 'Counts todos',
    outputSchema: z.object({ count: z.number() }),
    handler: () => (count === null ? null : { count }),
  });
  expect(await mcp.connect()).toBe(true);

  const { tools } = await host.listTools({});
  expect(tools[0].outputSchema).toMatchObject({ type: 'object' });
  expect(await host.callTool({ name: 'count_todos', arguments: {} })).toEqual({
    content: [{ type: 'text', text: '{\n  "count": 2\n}' }],
    structuredContent: { count: 2 },
  });

  count = null;
  const invalid = await host.callTool({ name: 'count_todos', arguments: {} });
  expect(invalid.isError).toBe(true);
  expect(invalid.structuredContent).toBeUndefined();
  mcp.disconnect();
});

test('with disableAppTools, a view connects to the bridge', async () => {
  const hostTransport = enterFrame({ hostAnswers: true });
  const webSocketUrls = stubWebSocket();
  const { host } = await connectHost(hostTransport);
  let initialized = false;
  host.oninitialized = () => {
    initialized = true;
  };

  const mcp = new MCPWeb({
    name: 'Todo',
    description: 'Todos',
    mcpApp: true,
    bridgeUrl: 'bridge.test',
    disableAppTools: true,
  });
  mcp.addTool({
    name: 'count_todos',
    description: 'Counts todos',
    handler: () => 1,
  });
  await wait(50);

  expect(webSocketUrls).toHaveLength(1);
  // The host gets its handshake, but no tools.
  expect(initialized).toBe(true);
  expect((await host.listTools({})).tools).toEqual([]);
  expect(mcp.isMCPApp).toBe(true);
  mcp.disconnect();
});

test('with disableAppTools, a failed handshake is retried and disconnect() ends it', async () => {
  enterFrame({ hostAnswers: 'error' });
  stubWebSocket();
  const handshakes = () =>
    postedToHost.filter(
      (message) => 'method' in message && message.method === 'ui/initialize',
    ).length;

  const mcp = new MCPWeb({
    name: 'Todo',
    description: 'Todos',
    mcpApp: true,
    bridgeUrl: 'bridge.test',
    disableAppTools: true,
  });
  await wait(50);
  expect(handshakes()).toBe(1);

  void mcp.connect();
  await wait(50);
  expect(handshakes()).toBe(2);
  mcp.disconnect();
});

test('with disableAppTools, disconnect() closes the host connection', async () => {
  const hostTransport = enterFrame({ hostAnswers: true });
  stubWebSocket();
  const { host } = await connectHost(hostTransport);

  const mcp = new MCPWeb({
    name: 'Todo',
    description: 'Todos',
    mcpApp: true,
    bridgeUrl: 'bridge.test',
    disableAppTools: true,
  });
  await wait(50);
  expect((await host.listTools({})).tools).toEqual([]);

  mcp.disconnect();
  await wait(10);
  const answer = await Promise.race([
    host.listTools({}).then(() => 'answered'),
    wait(200).then(() => 'no answer'),
  ]);
  expect(answer).toBe('no answer');
});

test('in a view whose host refuses the handshake, connect() fails', async () => {
  enterFrame({ hostAnswers: 'error' });
  const webSocketUrls = stubWebSocket();

  const mcp = new MCPWeb({
    name: 'Todo',
    description: 'Todos',
    mcpApp: true,
    bridgeUrl: 'bridge.test',
    autoConnect: false,
  });
  expect(await mcp.connect()).toBe(false);
  expect(mcp.connecting).toBe(false);
  expect(mcp.connected).toBe(false);
  expect(mcp.isMCPApp).toBe(true);
  // The bridge is no fallback inside a host.
  expect(webSocketUrls).toEqual([]);
});

test('reconnecting during the handshake sends one handshake', async () => {
  const hostTransport = enterFrame({ hostAnswers: true });
  stubWebSocket();
  await connectHost(hostTransport);

  const mcp = new MCPWeb({
    name: 'Todo',
    description: 'Todos',
    mcpApp: true,
    autoConnect: false,
  });
  const first = mcp.connect();
  mcp.disconnect();
  const second = mcp.connect();
  expect(await first).toBe(false);
  expect(await second).toBe(true);

  const handshakes = postedToHost.filter(
    (message) => 'method' in message && message.method === 'ui/initialize',
  );
  expect(handshakes).toHaveLength(1);
  mcp.disconnect();
});

test('a clear sent while an update is pending reaches the host', async () => {
  const hostTransport = enterFrame({ hostAnswers: true });
  stubWebSocket();
  const { host } = await connectHost(hostTransport);
  const contexts: string[] = [];
  let acknowledgeFirst = () => {};
  const firstAcknowledged = new Promise<void>((resolve) => {
    acknowledgeFirst = resolve;
  });
  host.onupdatemodelcontext = async ({ content }) => {
    const block = content?.[0];
    contexts.push(block?.type === 'text' ? block.text : '');
    if (contexts.length === 1) await firstAcknowledged;
    return {};
  };

  const mcp = new MCPWeb({
    name: 'Todo',
    description: 'Todos',
    mcpApp: true,
    autoConnect: false,
  });
  const [, , removeTodos] = mcp.addStateTools({
    name: 'todos',
    description: 'The todo list',
    schema: z.array(z.string()),
    get: () => ['Buy milk'],
    set: () => {},
  });
  await mcp.connect();
  await wait(10);
  expect(contexts).toHaveLength(1);

  removeTodos();
  await wait(1100);
  acknowledgeFirst();
  await wait(20);
  expect(contexts).toEqual([expect.stringContaining('Buy milk'), '']);
  mcp.disconnect();
});

test('a framed page that was not built as a view connects to the bridge', async () => {
  const hostTransport = enterFrame({ hostAnswers: true, view: false });
  const webSocketUrls = stubWebSocket();
  const { host } = await connectHost(hostTransport);
  let initialized = false;
  host.oninitialized = () => {
    initialized = true;
  };

  // A site that frames the web app can answer like a host.
  const mcp = new MCPWeb({
    name: 'Todo',
    description: 'Todos',
    mcpApp: true,
    bridgeUrl: 'bridge.test',
  });
  await wait(50);

  expect(webSocketUrls).toHaveLength(1);
  expect(initialized).toBe(false);
  expect(mcp.isMCPApp).toBe(false);
  mcp.disconnect();
});

test('describeState shortens a large state, keeping the others', () => {
  const text = describeState(
    'Todo',
    new Map<string, () => unknown>([
      ['rows', () => 'x'.repeat(30_000)],
      ['filter', () => 'open'],
      ['selected', () => 3],
    ]),
  );
  expect(text).toStartWith('Current state of Todo:\n- rows: "xxx');
  expect(text).toContain(
    '(truncated, call the getter tool for the full value)',
  );
  expect(text).toContain('- filter: "open"');
  expect(text).toContain('- selected: 3');
  expect(text?.length).toBeLessThanOrEqual(20_000);

  const manyStates = new Map<string, () => unknown>();
  for (let i = 0; i < 350; i++) manyStates.set(`count${i}`, () => i);
  for (let i = 0; i < 2000; i++) manyStates.set(`flag${i}`, () => true);
  const cutText = describeState('Todo', manyStates);
  expect(cutText?.length).toBeLessThanOrEqual(20_000);
  expect(cutText).toEndWith('call their getter tools)');

  const manyLargeStates = new Map<string, () => unknown>();
  for (let i = 0; i < 20; i++) {
    manyLargeStates.set(`state${i}`, () => 'x'.repeat(5_000));
  }
  const longName = describeState('x'.repeat(20_000), new Map([['a', () => 1]]));
  expect(longName?.length).toBeLessThanOrEqual(20_000);

  const longText = describeState('Todo', manyLargeStates);
  expect(longText).toContain('- state19: "xxx');
  expect(longText?.length).toBeLessThanOrEqual(20_000);
});

test('with mcpApp, the name open_app is taken', () => {
  const mcp = new MCPWeb({
    name: 'Todo',
    description: 'Todos',
    mcpApp: true,
    autoConnect: false,
  });
  const tool = {
    name: 'open_app',
    description: 'Opens something',
    handler: () => 'opened',
  };
  expect(() => mcp.addTool(tool)).toThrow('taken by the bridge');
  expect(() =>
    new MCPWeb({
      name: 'Todo',
      description: 'Todos',
      autoConnect: false,
    }).addTool(tool),
  ).not.toThrow();
});

test('in an MCP App view, idleTimeoutMs keeps the host connection', async () => {
  const hostTransport = enterFrame({ hostAnswers: true });
  const document = globals.document as EventTarget;
  const webSocketUrls = stubWebSocket();
  await connectHost(hostTransport);

  const mcp = new MCPWeb({
    name: 'Todo',
    description: 'Todos',
    mcpApp: true,
    autoConnect: false,
    idleTimeoutMs: 1000,
  });
  expect(await mcp.connect()).toBe(true);
  expect(mcp.idleDisconnectAt).toBeUndefined();

  // A frozen view keeps its host connection.
  document.dispatchEvent(new Event('freeze'));
  document.dispatchEvent(new Event('pointerdown'));
  expect(mcp.idle).toBe(false);
  expect(mcp.isMCPApp).toBe(true);
  expect(webSocketUrls).toEqual([]);
  mcp.disconnect();
});

test('disconnecting during the handshake sends no state', async () => {
  const hostTransport = enterFrame({ hostAnswers: true });
  stubWebSocket();
  const { contexts } = await connectHost(hostTransport);

  const mcp = new MCPWeb({
    name: 'Todo',
    description: 'Todos',
    mcpApp: true,
    autoConnect: false,
  });
  mcp.addStateTools({
    name: 'todos',
    description: 'The todo list',
    schema: z.array(z.string()),
    get: () => ['Buy milk'],
    set: () => {},
  });

  const connecting = mcp.connect();
  mcp.disconnect();
  expect(await connecting).toBe(false);
  await wait(50);
  expect(contexts).toEqual([]);
  expect(mcp.connected).toBe(false);
});
