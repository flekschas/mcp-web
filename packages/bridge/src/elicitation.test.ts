import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from 'bun:test';
import { MCPWebBridge } from './core.js';
import type { Scheduler } from './runtime/scheduler.js';
import type {
  BridgeHandlers,
  HttpResponse,
  WebSocketConnection,
} from './runtime/types.js';

const AUTH_TOKEN = 'elicitation-token';
const originalFetch = globalThis.fetch;

/** Runs scheduled callbacks only when a test fires them. */
class ManualScheduler implements Scheduler {
  timers = new Map<string, { callback: () => void; delayMs: number }>();
  #nextId = 0;

  schedule(callback: () => void, delayMs: number): string {
    const id = String(++this.#nextId);
    this.timers.set(id, { callback, delayMs });
    return id;
  }

  cancel(id: string): void {
    this.timers.delete(id);
  }

  scheduleInterval(): string {
    return 'interval';
  }

  cancelInterval(): void {}

  dispose(): void {
    this.timers.clear();
  }

  /** The delays of the pending one-time callbacks. */
  get delays(): number[] {
    return [...this.timers.values()].map((timer) => timer.delayMs);
  }

  fireAll(): void {
    const timers = [...this.timers.values()];
    this.timers.clear();
    for (const timer of timers) timer.callback();
  }
}

class FakeSocket implements WebSocketConnection {
  readyState = 'OPEN' as const;
  sent: { type: string; requestId?: string }[] = [];
  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }
  close(): void {}
  onMessage(): void {}
  offMessage(): void {}
}

let now = 0;
let scheduler: ManualScheduler;
let bridge: MCPWebBridge;
let handlers: BridgeHandlers;

/** Connects a page with a `greet` tool. */
function connectPage(sessionId: string): FakeSocket {
  const ws = new FakeSocket();
  handlers.onWebSocketConnect(
    sessionId,
    ws,
    new URL(`ws://localhost?session=${sessionId}`),
  );
  const send = (message: object) =>
    handlers.onWebSocketMessage(sessionId, ws, JSON.stringify(message));
  send({
    type: 'authenticate',
    sessionId,
    authToken: AUTH_TOKEN,
    origin: 'http://localhost',
    timestamp: now,
  });
  send({
    type: 'register-tool',
    tool: {
      name: 'greet',
      description: 'Greet',
      inputSchema: { type: 'object' },
    },
  });
  return ws;
}

/** Who sends a request: its auth token, if any, and MCP session, if any. */
interface Caller {
  authToken?: string | null;
  mcpSessionId?: string;
}

/** Sends a JSON-RPC message to the bridge like an MCP host would. */
const postMcp = (
  body: object,
  { authToken = AUTH_TOKEN, mcpSessionId }: Caller = {},
) => {
  const headers: Record<string, string | undefined> = {
    authorization: authToken ? `Bearer ${authToken}` : undefined,
    'content-type': 'application/json',
    'mcp-session-id': mcpSessionId,
  };
  return handlers.onHttpRequest({
    method: 'POST',
    url: 'http://localhost/',
    headers: { get: (name) => headers[name] ?? null },
    text: async () => JSON.stringify({ jsonrpc: '2.0', ...body }),
  }) as Promise<HttpResponse>;
};

/** Starts an MCP session like an MCP host would and returns its ID. */
async function initialize(authToken = AUTH_TOKEN): Promise<string> {
  const response = await postMcp(
    {
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    },
    { authToken },
  );
  return response.headers['Mcp-Session-Id'];
}

/** Calls `greet` like an MCP host would, and waits until the page has it. */
async function callGreet(
  ws: FakeSocket,
  { meta, ...caller }: Caller & { meta?: object } = {},
) {
  const response = postMcp(
    {
      id: 1,
      method: 'tools/call',
      params: {
        name: 'greet',
        arguments: {},
        ...(meta && { _meta: meta }),
      },
    },
    caller,
  );

  let toolCall: { requestId?: string } | undefined;
  while (!toolCall) {
    await Promise.resolve();
    toolCall = ws.sent.find((message) => message.type === 'tool-call');
  }
  return { response, requestId: toolCall.requestId as string };
}

const send = (sessionId: string, ws: FakeSocket, message: object) =>
  handlers.onWebSocketMessage(sessionId, ws, JSON.stringify(message));

const advance = (ms: number) => {
  now += ms;
  setSystemTime(new Date(now));
};

beforeEach(() => {
  now = Date.UTC(2026, 0, 1);
  setSystemTime(new Date(now));
  scheduler = new ManualScheduler();
  bridge = new MCPWebBridge(
    { name: 'test', description: 'Test bridge', agentUrl: 'http://agent.test' },
    scheduler,
  );
  handlers = bridge.getHandlers();
});

afterEach(async () => {
  setSystemTime();
  await bridge.close();
});

describe('tool call timeout while the page asks the user', () => {
  test('pauses while waiting on the user and resumes with the time left', async () => {
    const ws = connectPage('page');
    const { response, requestId } = await callGreet(ws);
    expect(scheduler.delays).toEqual([30_000]);

    advance(10_000);
    send('page', ws, { type: 'elicitation-waiting', requestId });
    // Only the limit on answering is left.
    expect(scheduler.delays).toEqual([5 * 60_000]);

    // The user takes longer than the timeout to answer.
    advance(60_000);
    send('page', ws, { type: 'elicitation-answered', requestId });
    expect(scheduler.delays).toEqual([20_000]);

    send('page', ws, { type: 'tool-response', requestId, result: 'Hallo!' });
    expect((await response).body).toContain('Hallo!');
    expect(scheduler.delays).toEqual([]);
  });

  test('times out once the user has answered and the time left runs out', async () => {
    const ws = connectPage('page');
    const { response, requestId } = await callGreet(ws);
    send('page', ws, { type: 'elicitation-waiting', requestId });
    send('page', ws, { type: 'elicitation-answered', requestId });

    scheduler.fireAll();
    expect((await response).body).toContain('Tool call timeout');
  });

  test('stays paused until all questions asked at once are answered', async () => {
    const ws = connectPage('page');
    const { requestId } = await callGreet(ws);
    send('page', ws, { type: 'elicitation-waiting', requestId });
    send('page', ws, { type: 'elicitation-waiting', requestId });

    send('page', ws, { type: 'elicitation-answered', requestId });
    expect(scheduler.delays).toEqual([5 * 60_000]);

    send('page', ws, { type: 'elicitation-answered', requestId });
    expect(scheduler.delays).toEqual([30_000]);
  });

  test('gives all questions of a call 5 minutes in total', async () => {
    const ws = connectPage('page');
    const { requestId } = await callGreet(ws);
    send('page', ws, { type: 'elicitation-waiting', requestId });
    advance(3 * 60_000);
    send('page', ws, { type: 'elicitation-answered', requestId });

    send('page', ws, { type: 'elicitation-waiting', requestId });
    expect(scheduler.delays).toEqual([2 * 60_000]);
  });

  test('fails the call and tells the page when the AI app cancels it', async () => {
    const ws = connectPage('page');
    const { response, requestId } = await callGreet(ws);
    send('page', ws, { type: 'elicitation-waiting', requestId });
    const cancel = {
      method: 'notifications/cancelled',
      params: { requestId: 1 },
    };

    // Another app can't cancel it.
    expect((await postMcp(cancel, { authToken: 'other-token' })).status).toBe(
      202,
    );
    expect(scheduler.delays).toEqual([5 * 60_000]);

    expect((await postMcp(cancel)).status).toBe(202);
    expect((await response).body).toContain(
      'The AI app cancelled the tool call',
    );
    expect(ws.sent.at(-1)).toEqual({
      type: 'tool-call-cancelled',
      requestId,
      reason: 'The AI app cancelled the tool call',
    });
  });

  test('a call in an MCP session is cancelled only with its token', async () => {
    const ws = connectPage('page');
    const mcpSessionId = await initialize();
    const { response } = await callGreet(ws, { mcpSessionId });
    const cancel = {
      method: 'notifications/cancelled',
      params: { requestId: 1 },
    };

    await postMcp(cancel, { authToken: 'other-token', mcpSessionId });
    expect(scheduler.delays).toEqual([30_000]);

    await postMcp(cancel, { mcpSessionId });
    expect((await response).body).toContain(
      'The AI app cancelled the tool call',
    );
  });

  test('a call of a query is cancelled by naming the query', async () => {
    const ws = connectPage('page');
    globalThis.fetch = (async () =>
      new Response(null, { status: 200 })) as unknown as typeof fetch;
    try {
      send('page', ws, {
        type: 'query',
        uuid: 'query-1',
        prompt: 'Greet me',
        context: [],
      });
      while (!ws.sent.some((message) => message.type === 'query_accepted')) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
    const meta = { queryId: 'query-1' };
    const { response } = await callGreet(ws, { meta, authToken: null });

    await postMcp(
      {
        method: 'notifications/cancelled',
        params: { requestId: 1, _meta: meta },
      },
      { authToken: null },
    );
    expect((await response).body).toContain(
      'The AI app cancelled the tool call',
    );
  });

  test('fails the call and tells the page when the user does not answer', async () => {
    const ws = connectPage('page');
    const { response, requestId } = await callGreet(ws);
    send('page', ws, { type: 'elicitation-waiting', requestId });

    scheduler.fireAll();
    expect((await response).body).toContain('The user did not answer in time');
    expect(ws.sent.at(-1)).toEqual({
      type: 'tool-call-cancelled',
      requestId,
      reason: 'The user did not answer in time',
    });
  });

  test('tells the page when the call times out', async () => {
    const ws = connectPage('page');
    const { response, requestId } = await callGreet(ws);

    scheduler.fireAll();
    expect((await response).body).toContain('Tool call timeout');
    expect(ws.sent.at(-1)).toEqual({
      type: 'tool-call-cancelled',
      requestId,
      reason: 'Tool call timeout',
    });
  });

  test('fails the call when the bridge closes', async () => {
    const ws = connectPage('page');
    const { response, requestId } = await callGreet(ws);
    send('page', ws, { type: 'elicitation-waiting', requestId });

    await bridge.close();
    expect((await response).body).toContain(
      'The bridge shut down before the tool call finished',
    );
  });

  test('ignores messages about calls of other sessions', async () => {
    const ws = connectPage('page');
    const other = connectPage('other');
    const { requestId } = await callGreet(ws, { meta: { sessionId: 'page' } });

    send('other', other, { type: 'elicitation-waiting', requestId });
    expect(scheduler.delays).toEqual([30_000]);
  });

  test("fails the call when the page's session closes", async () => {
    const ws = connectPage('page');
    const { response, requestId } = await callGreet(ws);
    send('page', ws, { type: 'elicitation-waiting', requestId });

    handlers.onWebSocketClose('page');
    expect((await response).body).toContain(
      'Session closed before the tool call finished',
    );
  });
});
