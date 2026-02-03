#!/usr/bin/env tsx

import { MCPWebBridgeNode } from '@mcp-web/bridge';

// Port constant shared with mcp-web.config.ts (but we can't import it because
// that file uses Vite-specific import.meta.env which doesn't work in tsx)
const BRIDGE_PORT = 3001;

console.log('Starting MCP Bridge for React Todo Demo...');

const bridge = new MCPWebBridgeNode({
  name: 'MCP-Web Todo App (React)',
  description: 'Simple todo application with React + Jotai demonstrating MCP Web integration',
  port: BRIDGE_PORT,
});

// Wait for the bridge to be ready before printing success
bridge.ready()
  .then(() => {
    console.log('Frontend: http://localhost:5175');
  })
  .catch(() => {
    // Error already logged by MCPWebBridgeNode
    process.exit(1);
  });

process.on('SIGINT', () => {
  console.log('\nShutting down MCP Bridge...');
  bridge.close().then(() => process.exit(0));
});
