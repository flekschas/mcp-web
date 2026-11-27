import { afterEach, beforeEach, expect, test } from 'bun:test';
import type { Elicit } from '@mcp-web/types';
import { MCPWeb } from './web.js';

type Message = { type: string; [key: string]: unknown };

/** A socket to a bridge that the test plays. */
class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  static latest: FakeWebSocket | undefined;

  readyState = FakeWebSocket.CONNECTING;
  sent: Message[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;

  constructor() {
    FakeWebSocket.latest = this;
    queueMicrotask(() => {
      this.readyState = FakeWebSocket.OPEN;
      this.onopen?.();
    });
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  /** Sends a message from the bridge to the page. */
  receive(message: Message) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

const globals = globalThis as { WebSocket?: unknown };
let realWebSocket: unknown;

beforeEach(() => {
  realWebSocket = globals.WebSocket;
  globals.WebSocket = FakeWebSocket;
});

afterEach(() => {
  globals.WebSocket = realWebSocket;
});

const waitFor = async (condition: () => boolean) => {
  while (!condition()) await new Promise((resolve) => setTimeout(resolve, 1));
};

/**
 * A connected page with a `greet` tool whose handler asks for the language.
 * Each question waits until the test answers it.
 */
async function connectPage() {
  const mcp = new MCPWeb({
    name: 'test',
    description: 'Test app',
    autoConnect: false,
    persistAuthToken: false,
  });
  let handlerElicit: Elicit | undefined;
  let callSignal: AbortSignal | undefined;
  mcp.addTool({
    name: 'greet',
    description: 'Greet the user',
    handler: async (_input, { elicit, signal }) => {
      handlerElicit = elicit;
      callSignal = signal;
      const language = await elicit('Which language?', ['English', 'German']);
      return { greeting: language === 'German' ? 'Hallo!' : 'Hello!' };
    },
  });

  const questions: { signal: AbortSignal; answer: (choice: string) => void }[] =
    [];
  mcp.onElicit(
    (_request, { signal }) =>
      new Promise((resolve) => {
        questions.push({
          signal,
          answer: (choice) =>
            resolve({ action: 'accept', content: { choice } }),
        });
      }),
  );

  const connected = mcp.connect();
  await waitFor(() => FakeWebSocket.latest?.readyState === FakeWebSocket.OPEN);
  const ws = FakeWebSocket.latest as FakeWebSocket;
  ws.receive({ type: 'authenticated' });
  await connected;

  const call = async (requestId: string) => {
    ws.receive({ type: 'tool-call', requestId, toolName: 'greet' });
    await waitFor(() => questions.length > 0);
  };
  const response = async (requestId: string) => {
    await waitFor(() =>
      ws.sent.some(
        (m) => m.type === 'tool-response' && m.requestId === requestId,
      ),
    );
    return ws.sent.find(
      (m) => m.type === 'tool-response' && m.requestId === requestId,
    )?.result;
  };
  return {
    mcp,
    ws,
    questions,
    call,
    response,
    handlerElicit: () => handlerElicit,
    callSignal: () => callSignal,
  };
}

const typesSent = (ws: FakeWebSocket, requestId: string) =>
  ws.sent.filter((m) => m.requestId === requestId).map((m) => m.type);

test('tells the bridge while the call waits on the user', async () => {
  const { mcp, ws, questions, call, response } = await connectPage();
  await call('call-1');
  expect(typesSent(ws, 'call-1')).toEqual(['elicitation-waiting']);

  questions[0].answer('German');
  expect(await response('call-1')).toEqual({ greeting: 'Hallo!' });
  expect(typesSent(ws, 'call-1')).toEqual([
    'elicitation-waiting',
    'elicitation-answered',
    'tool-response',
  ]);
  mcp.disconnect();
});

test('cancels the question when the bridge stops waiting', async () => {
  const { mcp, ws, questions, call, response, callSignal } =
    await connectPage();
  await call('call-1');

  ws.receive({
    type: 'tool-call-cancelled',
    requestId: 'call-1',
    reason: 'Tool call timeout',
  });
  expect(questions[0].signal.aborted).toBe(true);
  expect(callSignal()?.aborted).toBe(true);
  expect(JSON.stringify(await response('call-1'))).toContain(
    'The tool call was cancelled: Tool call timeout',
  );

  // A late answer changes nothing.
  questions[0].answer('German');
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(ws.sent.filter((m) => m.type === 'tool-response')).toHaveLength(1);
  mcp.disconnect();
});

test('cancels the question when the connection closes', async () => {
  const { mcp, questions, call } = await connectPage();
  await call('call-1');

  mcp.disconnect();
  expect(questions[0].signal.aborted).toBe(true);
});

test('an answered question stays answered when its call ends', async () => {
  const { mcp, questions, call, response, callSignal } = await connectPage();
  await call('call-1');
  questions[0].answer('English');
  await response('call-1');

  expect(callSignal()?.aborted).toBe(true);
  expect(questions[0].signal.aborted).toBe(false);
  mcp.disconnect();
});

test('a handler cannot ask once its call has finished', async () => {
  const { mcp, questions, call, response, handlerElicit } = await connectPage();
  await call('call-1');
  questions[0].answer('English');
  await response('call-1');

  await expect(handlerElicit()?.('Still there?')).rejects.toThrow(
    'The tool call has already finished',
  );
  mcp.disconnect();
});
