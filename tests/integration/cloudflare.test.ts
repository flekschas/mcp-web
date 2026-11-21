/**
 * Integration tests for the Cloudflare Workers + Durable Objects adapter.
 *
 * Runs the bridge under `wrangler dev`, which executes the real workerd
 * runtime with real Durable Objects, and drives it through the same frontend
 * and client packages a browser and an MCP client would use.
 */

import { afterAll, beforeAll, expect, test } from 'bun:test';
import { MCPWebClient, type MCPWebClientConfig } from '@mcp-web/client';
import { MCPWeb } from '@mcp-web/core';
import { deriveRoomId } from '@mcp-web/types';
import type { TextContent } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { startWorker } from '../helpers/cloudflare/start-worker';

const PORT = 3891;
const BRIDGE_URL = `localhost:${PORT}`;

let worker: Awaited<ReturnType<typeof startWorker>> | undefined;

const baseConfig = {
  name: 'test',
  description: 'Cloudflare adapter test',
  bridgeUrl: BRIDGE_URL,
  persistAuthToken: false,
  autoConnect: false,
};

const clientConfig: MCPWebClientConfig = {
  serverUrl: `http://${BRIDGE_URL}`,
};

function sessionsFrom(result: { content: unknown[] }) {
  return JSON.parse((result.content[0] as TextContent).text).sessions;
}

beforeAll(async () => {
  worker = await startWorker({ port: PORT });
}, 120_000);

afterAll(async () => {
  await worker?.stop();
}, 30_000);

test('health endpoint responds', async () => {
  const response = await fetch(`http://${BRIDGE_URL}/health`);
  expect(response.status).toBe(200);
  expect(((await response.json()) as { status: string }).status).toBe('ok');
});

test('server info is served without a token', async () => {
  const response = await fetch(`http://${BRIDGE_URL}/`, {
    headers: { accept: 'application/json' },
  });

  expect(response.status).toBe(200);
  const info = (await response.json()) as { name: string; version: string };
  expect(info.name).toBe('Test Bridge');
  expect(info.version).toBeTruthy();
});

test('an SSE request without a session id ends the stream', async () => {
  const response = await fetch(`http://${BRIDGE_URL}/`, {
    headers: { accept: 'text/event-stream' },
  });

  expect(response.status).toBe(200);

  // An error stream that never ends holds the object in memory until the
  // client gives up, which on Workers is billed duration.
  const body = await Promise.race([
    response.text(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('SSE error stream never ended')),
        5_000,
      ),
    ),
  ]);

  expect(body).toContain('Mcp-Session-Id header required');
});

test('a WebSocket upgrade without a room is rejected', async () => {
  const response = await fetch(`http://${BRIDGE_URL}/?session=abc`, {
    headers: { Upgrade: 'websocket', Connection: 'Upgrade' },
  });

  expect(response.status).toBe(400);
  expect(await response.text()).toContain('Missing room parameter');
});

test('a frontend tool is listed and callable through MCP', async () => {
  const authToken = 'cf-roundtrip-token';
  const mcpWeb = new MCPWeb({ ...baseConfig, authToken });

  mcpWeb.addTool({
    name: 'add_numbers',
    description: 'Adds two numbers',
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    outputSchema: z.object({ sum: z.number() }),
    handler: ({ a, b }: { a: number; b: number }) => ({ sum: a + b }),
  });

  await mcpWeb.connect();

  const client = new MCPWebClient({ ...clientConfig, authToken });

  const tools = await client.listTools();
  expect(tools.tools.map((tool) => tool.name)).toContain('add_numbers');

  const result = await client.callTool('add_numbers', { a: 2, b: 40 });
  expect((result.content[0] as TextContent).text).toContain('42');

  mcpWeb.disconnect();
});

test('sessions on different tokens are isolated across objects', async () => {
  const tokenA = 'cf-isolation-a';
  const tokenB = 'cf-isolation-b';

  // Different tokens must land in different Durable Objects, otherwise this
  // test would pass on in-object filtering alone
  expect(await deriveRoomId(tokenA)).not.toBe(await deriveRoomId(tokenB));

  const webA = new MCPWeb({ ...baseConfig, authToken: tokenA });
  webA.addTool({
    name: 'only_in_a',
    description: 'Belongs to token A',
    inputSchema: z.object({}),
    outputSchema: z.object({ ok: z.boolean() }),
    handler: () => ({ ok: true }),
  });
  await webA.connect();

  const webB = new MCPWeb({ ...baseConfig, authToken: tokenB });
  webB.addTool({
    name: 'only_in_b',
    description: 'Belongs to token B',
    inputSchema: z.object({}),
    outputSchema: z.object({ ok: z.boolean() }),
    handler: () => ({ ok: true }),
  });
  await webB.connect();

  const clientA = new MCPWebClient({ ...clientConfig, authToken: tokenA });
  const namesA = (await clientA.listTools()).tools.map((tool) => tool.name);

  expect(namesA).toContain('only_in_a');
  expect(namesA).not.toContain('only_in_b');

  webA.disconnect();
  webB.disconnect();
});

test('two frontends sharing a token share one object', async () => {
  const authToken = 'cf-shared-token';

  const first = new MCPWeb({
    ...baseConfig,
    authToken,
    sessionName: 'First',
  });
  await first.connect();

  const second = new MCPWeb({
    ...baseConfig,
    authToken,
    sessionName: 'Second',
  });
  await second.connect();

  const client = new MCPWebClient({ ...clientConfig, authToken });
  const sessions = sessionsFrom(await client.callTool('list_sessions'));

  expect(sessions).toHaveLength(2);
  expect(
    sessions.map((s: { session_name: string }) => s.session_name).sort(),
  ).toEqual(['First', 'Second']);

  first.disconnect();
  second.disconnect();
});

/** Initializes a Remote MCP session and returns the id the client is handed. */
async function initializeSession(authToken: string): Promise<string> {
  const response = await fetch(`http://${BRIDGE_URL}/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    }),
  });

  expect(response.status).toBe(200);
  const sessionId = response.headers.get('mcp-session-id');
  expect(sessionId).toBeTruthy();

  return sessionId as string;
}

test('an MCP session id alone reaches the object that issued it', async () => {
  const authToken = 'cf-session-id-token';
  const sessionId = await initializeSession(authToken);

  // The object is chosen before the request is read, so a session id that
  // carried no room would land on the anonymous object and be unknown there.
  expect(sessionId).toContain((await deriveRoomId(authToken)) as string);

  const stream = await fetch(`http://${BRIDGE_URL}/`, {
    headers: { accept: 'text/event-stream', 'mcp-session-id': sessionId },
  });

  expect(stream.status).toBe(200);

  const reader = (stream.body as ReadableStream<Uint8Array>).getReader();
  const notified = (async () => {
    const decoder = new TextDecoder();
    let buffered = '';
    while (!buffered.includes('\n\n')) {
      const { value, done } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
    }
    return buffered;
  })();

  // A session the object does not know is answered with an error event, so a
  // real notification is what distinguishes correct routing from a stream that
  // merely stayed open.
  const frontend = new MCPWeb({ ...baseConfig, authToken });
  await frontend.connect();
  frontend.addTool({
    name: 'after_subscribe',
    description: 'Registered while the stream is open',
    inputSchema: z.object({}),
    outputSchema: z.object({ ok: z.boolean() }),
    handler: () => ({ ok: true }),
  });

  const event = await Promise.race([
    notified,
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('no SSE event arrived')), 10_000),
    ),
  ]);

  expect(event).toContain('notifications/tools/list_changed');

  await reader.cancel();
  frontend.disconnect();

  const deleted = await fetch(`http://${BRIDGE_URL}/`, {
    method: 'DELETE',
    headers: { 'mcp-session-id': sessionId },
  });

  expect(deleted.status).toBe(200);
}, 20_000);

test('a socket whose token belongs to another room is closed', async () => {
  const authToken = 'cf-room-mismatch-token';
  const wrongRoom = await deriveRoomId('some-other-token');

  const socket = new WebSocket(
    `ws://${BRIDGE_URL}/?session=mismatch&room=${wrongRoom}`,
  );

  await new Promise((resolve) => socket.addEventListener('open', resolve));

  const closed = new Promise<CloseEvent>((resolve) =>
    socket.addEventListener('close', resolve as () => void),
  );

  socket.send(
    JSON.stringify({
      type: 'authenticate',
      authToken,
      origin: `http://${BRIDGE_URL}`,
      pageTitle: 'Test',
      userAgent: 'test',
      timestamp: Date.now(),
    }),
  );

  expect((await closed).code).toBe(1008);
});

test('a JSON GET outside the root is not claimed by the bridge', async () => {
  const response = await fetch(`http://${BRIDGE_URL}/data.json`, {
    headers: { accept: 'application/json' },
  });

  // No assets binding in the test worker, so anything the bridge does not
  // claim ends here rather than in server info.
  expect(response.status).toBe(404);
});

test('deleting a session ends its open SSE stream', async () => {
  const sessionId = await initializeSession('cf-sse-close-token');

  const stream = await fetch(`http://${BRIDGE_URL}/`, {
    headers: { accept: 'text/event-stream', 'mcp-session-id': sessionId },
  });

  const reader = (stream.body as ReadableStream<Uint8Array>).getReader();
  const ended = reader.read().then(({ done }) => done);

  const deleted = await fetch(`http://${BRIDGE_URL}/`, {
    method: 'DELETE',
    headers: { 'mcp-session-id': sessionId },
  });
  expect(deleted.status).toBe(200);

  // A stream that outlives its session keeps the Durable Object alive.
  const closed = await Promise.race([
    ended,
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5_000)),
  ]);

  expect(closed).toBe(true);
  await reader.cancel();
}, 15_000);
