import { afterEach, expect, test } from 'bun:test';
import { MCPWeb } from './web.js';

const globals = globalThis as { WebSocket?: unknown };
const originalWebSocket = globals.WebSocket;

afterEach(() => {
  globals.WebSocket = originalWebSocket;
});

test('a tool result that is not JSON still answers the bridge', async () => {
  const sockets: FakeWebSocket[] = [];
  class FakeWebSocket {
    static OPEN = 1;
    readyState = 1;
    sent: unknown[] = [];
    onmessage: ((event: { data: string }) => void) | null = null;
    constructor() {
      sockets.push(this);
    }
    send(data: string) {
      this.sent.push(JSON.parse(data));
    }
    close() {}
  }
  globals.WebSocket = FakeWebSocket;

  const mcp = new MCPWeb({
    name: 'Test',
    description: 'Test app',
    bridgeUrl: 'bridge.test',
    autoConnect: false,
  });
  mcp.addTool({
    name: 'count',
    description: 'Returns a bigint',
    handler: () => ({ count: 1n }),
  });
  mcp.connect();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const socket = sockets[0];
  socket.onmessage?.({
    data: JSON.stringify({
      type: 'tool-call',
      requestId: 'request-1',
      toolName: 'count',
      toolInput: {},
    }),
  });
  await new Promise((resolve) => setTimeout(resolve, 10));

  expect(socket.sent).toContainEqual({
    type: 'tool-response',
    requestId: 'request-1',
    result: { error: expect.stringContaining('Tool execution failed') },
  });
  mcp.disconnect();
});
