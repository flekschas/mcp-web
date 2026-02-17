#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MCPWebClient } from './client.js';
import { MCPWebClientConfigSchema } from './schemas.js';

export type { Query } from '@mcp-web/types';
// Export for programmatic use
export { MCPWebClient } from './client.js';
export type * from './types.js';

// Only run as CLI if this is the main module in Node.js
// Guard against running in Deno or when bundled
// Uses realpathSync on both sides to handle symlinks (e.g. npx, pnpm)
// @ts-expect-error - Deno global exists in Deno runtime
const isDeno = typeof Deno !== 'undefined';
const isNodeCLI = !isDeno &&
  typeof process !== 'undefined' &&
  process.argv?.[1] &&
  realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);

if (isNodeCLI) {
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.error('Shutting down MCP Bridge Client...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.error('Shutting down MCP Bridge Client...');
    process.exit(0);
  });

  const config = MCPWebClientConfigSchema.parse({
    serverUrl: process.env.MCP_SERVER_URL,
    authToken: process.env.AUTH_TOKEN,
    ...(process.env.TIMEOUT !== undefined ? { timeout: Number.parseInt(process.env.TIMEOUT, 10) } : {})
  });

  // Start the client
  const client = new MCPWebClient(config);
  client.run().catch((error) => {
    console.error('Failed to start MCP Bridge Client:', error);
    process.exit(1);
  });
}
