#!/usr/bin/env tsx

import { MCPWebBridgeNode } from '@mcp-web/bridge';

console.log('Starting MCP Bridge for React Todo Demo...');

const bridge = new MCPWebBridgeNode({
  name: 'MCP-Web Todo App (React)',
  description: 'Simple todo application with React + Jotai demonstrating MCP Web integration',
  port: 3001,
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
