#!/usr/bin/env node

import { MCPWebClient } from './client.js';
import { MCPWebClientConfigSchema } from './schemas.js';

// Export for programmatic use
export { MCPWebClient } from './client.js';
export type { MCPWebClientConfig, MCPWebClientConfigInput } from './types.js';
export type { Query } from '@mcp-web/types';

// Only run as CLI if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
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
