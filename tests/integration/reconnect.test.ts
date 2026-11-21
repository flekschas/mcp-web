/**
 * The frontend has to come back on its own after the bridge goes away, which
 * on Cloudflare happens on every deploy.
 */

import { expect, test } from 'bun:test';
import { MCPWebBridgeNode } from '@mcp-web/bridge';
import { MCPWeb } from '@mcp-web/core';

const PORT = 4322;

test('the frontend reconnects after the bridge restarts', async () => {
  const config = { name: 'Reconnect', description: 'Reconnect', port: PORT };
  let bridge = new MCPWebBridgeNode(config);

  const web = new MCPWeb({
    name: 'Reconnect',
    description: 'Reconnect',
    bridgeUrl: `localhost:${PORT}`,
    authToken: 'reconnect-token',
    persistAuthToken: false,
    autoConnect: false,
  });

  await web.connect();
  expect(web.connected).toBe(true);

  await bridge.close();
  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(web.connected).toBe(false);

  bridge = new MCPWebBridgeNode(config);

  // The frontend waits 5 s before retrying.
  const deadline = Date.now() + 15_000;
  while (!web.connected && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const reconnected = web.connected;
  web.disconnect();
  await bridge.close();

  expect(reconnected).toBe(true);
}, 30_000);

/** Polls until `condition` holds, or throws. */
async function until(condition: () => boolean, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('condition never held');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/**
 * Accepts sockets and never answers `authenticate`, so a frontend stays in its
 * handshake for as long as a test needs. Counts sockets and records when each
 * one has sent its authentication message.
 */
function silentBridge(port: number) {
  let opened = 0;
  let authenticated = 0;

  const server = Bun.serve({
    port,
    fetch: (request, server) =>
      server.upgrade(request) ? undefined : new Response('no'),
    websocket: {
      open: () => {
        opened++;
      },
      message: (_ws, data) => {
        if (JSON.parse(String(data)).type === 'authenticate') authenticated++;
      },
    },
  });

  return {
    stop: () => server.stop(true),
    get opened() {
      return opened;
    },
    get authenticated() {
      return authenticated;
    },
  };
}

function handshakeClient(port: number, authToken: string) {
  return new MCPWeb({
    name: 'Handshake',
    description: 'Handshake',
    bridgeUrl: `localhost:${port}`,
    authToken,
    persistAuthToken: false,
    autoConnect: false,
  });
}

test('a disconnect during authentication does not block later connects', async () => {
  const bridge = silentBridge(4323);
  const web = handshakeClient(4323, 'handshake-token');

  const attempt = web.connect();
  // `connecting` is set before the room lookup, so waiting on it would not
  // reach the handshake. The server says when the socket has authenticated.
  await until(() => bridge.authenticated === 1);

  web.disconnect();

  const settled = await Promise.race([
    attempt,
    new Promise<string>((resolve) =>
      setTimeout(() => resolve('still pending'), 3_000),
    ),
  ]);

  expect(settled).toBe(false);
  expect(web.connecting).toBe(false);

  await bridge.stop();
}, 15_000);

test('a cancelled attempt does not release the flag a retry holds', async () => {
  const bridge = silentBridge(4324);
  const web = handshakeClient(4324, 'retry-token');

  // Cancelled while deriving its room, so it settles after the retry below has
  // already taken ownership of the connecting flag.
  const cancelled = web.connect();
  web.disconnect();

  const retry = web.connect();
  await until(() => bridge.authenticated === 1);

  expect(await cancelled).toBe(false);
  expect(web.connecting).toBe(true);

  // A second caller has to wait for the socket already in its handshake.
  const concurrent = web.connect();
  await new Promise((resolve) => setTimeout(resolve, 300));

  expect(bridge.opened).toBe(1);

  web.disconnect();
  expect(await retry).toBe(false);
  expect(await concurrent).toBe(false);

  await bridge.stop();
}, 15_000);
