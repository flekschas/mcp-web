/**
 * The bridge calls the agent from the server side, where no page context
 * supplies a protocol. These tests pin what the configured address turns into.
 */

import { afterEach, expect, test } from 'bun:test';
import { WebSocket } from 'ws';
import { MCPWebBridgeNode } from './adapters/node.js';

const PORT = 4155;

let bridge: MCPWebBridgeNode | undefined;
let client: WebSocket | undefined;
const realFetch = globalThis.fetch;

afterEach(async () => {
  globalThis.fetch = realFetch;
  client?.close();
  client = undefined;
  await bridge?.close();
  bridge = undefined;
});

/** Starts a bridge, runs one query through it and returns the URL it called. */
async function captureQueryUrl(agentUrl: string): Promise<string> {
  let called: (url: string) => void = () => {};
  const url = new Promise<string>((resolve) => {
    called = resolve;
  });

  globalThis.fetch = ((input: RequestInfo | URL) => {
    called(typeof input === 'string' ? input : input.toString());
    // Leaves the query in flight; the URL is all this test needs.
    return new Promise<Response>(() => {});
    // biome-ignore lint/suspicious/noExplicitAny: test stub
  }) as any;

  bridge = new MCPWebBridgeNode({
    name: 'Test Bridge',
    description: 'Test',
    port: PORT,
    agentUrl,
  });

  const socket = new WebSocket(`ws://localhost:${PORT}?session=agent-url`);
  client = socket;
  await new Promise<void>((resolve, reject) => {
    socket.on('open', () => resolve());
    socket.on('error', reject);
  });

  const authenticated = new Promise<void>((resolve) => {
    socket.on('message', (data: Buffer) => {
      if (JSON.parse(data.toString()).type === 'authenticated') resolve();
    });
  });
  socket.send(
    JSON.stringify({
      type: 'authenticate',
      authToken: 'agent-url-token',
      origin: 'http://localhost:3000',
      pageTitle: 'Test Page',
      userAgent: 'Test Agent',
      timestamp: Date.now(),
    }),
  );
  await authenticated;

  socket.send(
    JSON.stringify({
      type: 'query',
      uuid: 'query-agent-url',
      prompt: 'Test',
      context: [],
      tools: [],
    }),
  );

  return url;
}

test('an https agent address is called over https', async () => {
  expect(await captureQueryUrl('https://agent.example.com')).toBe(
    'https://agent.example.com/query/query-agent-url',
  );
});

test('a bare agent host falls back to http', async () => {
  expect(await captureQueryUrl('localhost:9999')).toBe(
    'http://localhost:9999/query/query-agent-url',
  );
});
