/**
 * An open connection keeps a hosted bridge running, so an unused page
 * disconnects, and reconnects once someone uses it again.
 */

import { afterEach, beforeEach, expect, test } from 'bun:test';
import { MCPWebBridgeNode } from '@mcp-web/bridge';
import { MCPWebClient } from '@mcp-web/client';
import { MCPWeb } from '@mcp-web/core';

const PORT = 4331;
const AUTH_TOKEN = 'idle-token';

let bridge: MCPWebBridgeNode | undefined;
// Disconnected after each test, so a failed test leaves no page retrying.
let webs: MCPWeb[] = [];
let page: EventTarget & { visibilityState: string };

const startBridge = () =>
  new MCPWebBridgeNode({ name: 'Idle', description: 'Idle', port: PORT });

beforeEach(() => {
  bridge = startBridge();
  // The frontend listens for interaction on the document.
  page = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  (globalThis as { document?: unknown }).document = page;
});

afterEach(async () => {
  for (const web of webs) web.disconnect();
  webs = [];
  delete (globalThis as { document?: unknown }).document;
  await bridge?.close();
  bridge = undefined;
});

function createWeb(idleTimeoutMs: number) {
  const web = new MCPWeb({
    name: 'Idle',
    description: 'Idle',
    bridgeUrl: `localhost:${PORT}`,
    authToken: AUTH_TOKEN,
    persistAuthToken: false,
    autoConnect: false,
    idleTimeoutMs,
  });
  webs.push(web);
  return web;
}

const createClient = () =>
  new MCPWebClient({
    serverUrl: `http://localhost:${PORT}`,
    authToken: AUTH_TOKEN,
  });

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(condition: () => boolean, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('condition never held');
    await wait(10);
  }
}

test('an unused page disconnects and reconnects on the next interaction', async () => {
  const web = createWeb(300);
  await web.connect();
  expect(web.connected).toBe(true);
  expect(web.idleDisconnectAt).toBeGreaterThan(Date.now());

  await until(() => !web.connected);
  expect(web.idle).toBe(true);
  expect(web.idleDisconnectAt).toBeUndefined();

  page.dispatchEvent(new Event('keydown'));
  await until(() => web.connected);
  expect(web.idle).toBe(false);

  web.disconnect();
});

test('returning to the tab reconnects', async () => {
  const web = createWeb(300);
  await web.connect();
  await until(() => web.idle);

  page.dispatchEvent(new Event('visibilitychange'));
  await until(() => web.connected);

  web.disconnect();
});

test('interaction keeps the page connected', async () => {
  const web = createWeb(1000);
  await web.connect();

  for (let i = 0; i < 6; i++) {
    await wait(300);
    page.dispatchEvent(new Event('pointermove'));
  }
  expect(web.connected).toBe(true);

  web.disconnect();
});

test('tool calls keep the page connected', async () => {
  const web = createWeb(1000);
  web.addTool({
    name: 'ping',
    description: 'Ping',
    handler: () => ({ pong: true }),
  });
  await web.connect();

  const client = createClient();
  for (let i = 0; i < 6; i++) {
    await wait(300);
    await client.callTool('ping');
  }
  expect(web.connected).toBe(true);

  web.disconnect();
});

test('a tool call that runs longer than the timeout still gets answered', async () => {
  const web = createWeb(1000);
  web.addTool({
    name: 'slow',
    description: 'Slow',
    handler: async () => {
      await wait(1500);
      return { done: true };
    },
  });
  await web.connect();

  const result = await createClient().callTool('slow');
  expect(JSON.stringify(result)).toContain('done');
  expect(web.connected).toBe(true);

  web.disconnect();
});

function addHangingTool(web: MCPWeb) {
  web.addTool({
    name: 'hang',
    description: 'Never answers',
    handler: () => new Promise<never>(() => {}),
  });
}

test('a call that never finishes keeps the page connected for one more timeout at most', async () => {
  const web = createWeb(500);
  addHangingTool(web);
  await web.connect();

  createClient()
    .callTool('hang')
    .catch(() => {});
  await until(() => web.idle, 2_500);
}, 10_000);

test('a call still running from an earlier socket does not keep a new one connected', async () => {
  const web = createWeb(1000);
  addHangingTool(web);
  await web.connect();

  createClient()
    .callTool('hang')
    .catch(() => {});
  await wait(100);

  web.disconnect();
  await web.connect();
  const reconnectedAt = Date.now();

  await until(() => web.idle, 2_000);
  expect(Date.now() - reconnectedAt).toBeLessThan(1_500);
}, 10_000);

test('an automatic reconnect does not count as activity', async () => {
  const web = createWeb(7000);
  const connectedAt = Date.now();
  await web.connect();

  await bridge?.close();
  await until(() => !web.connected);
  bridge = startBridge();

  // The page retries after 5 s and is connected again well before its deadline.
  await until(() => web.connected, 6_500);
  await until(() => web.idle, 2_500);
  expect(Date.now() - connectedAt).toBeLessThan(8_000);
}, 15_000);

test('a retry pending at the idle disconnect does not open a second socket', async () => {
  const web = createWeb(1500);
  await web.connect();

  // A dropped socket schedules a retry in 5 s.
  await bridge?.close();
  bridge = undefined;
  await until(() => web.idle, 3_000);

  // Accepts sockets but never authenticates them, so the next attempt stays
  // open while the old retry would fire.
  let opened = 0;
  const server = Bun.serve({
    port: PORT,
    fetch: (request, server) =>
      server.upgrade(request) ? undefined : new Response('no'),
    websocket: {
      open: () => {
        opened++;
      },
      message: () => {},
    },
  });

  try {
    for (let i = 0; i < 15; i++) {
      page.dispatchEvent(new Event('keydown'));
      await wait(300);
    }
    expect(opened).toBe(1);
  } finally {
    web.disconnect();
    server.stop(true);
  }
}, 15_000);
