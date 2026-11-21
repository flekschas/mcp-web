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
