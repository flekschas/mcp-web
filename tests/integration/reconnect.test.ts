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

test('a disconnect during the handshake does not block later connects', async () => {
  // Accepts the socket and never answers `authenticate`, so the frontend stays
  // in its handshake for as long as the test needs.
  const silent = Bun.serve({
    port: 4323,
    fetch: (request, server) =>
      server.upgrade(request) ? undefined : new Response('no'),
    websocket: { message: () => {} },
  });

  const web = new MCPWeb({
    name: 'Handshake',
    description: 'Handshake',
    bridgeUrl: 'localhost:4323',
    authToken: 'handshake-token',
    persistAuthToken: false,
    autoConnect: false,
  });

  const attempt = web.connect();
  await until(() => web.connecting);

  web.disconnect();

  const settled = await Promise.race([
    attempt,
    new Promise<string>((resolve) =>
      setTimeout(() => resolve('still pending'), 3_000),
    ),
  ]);

  expect(settled).toBe(false);
  expect(web.connecting).toBe(false);

  await silent.stop(true);
}, 15_000);
