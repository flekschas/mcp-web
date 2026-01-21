#!/usr/bin/env tsx

import { MCPWebBridgeNode } from '@mcp-web/bridge';

console.log('🌉 Starting MCP Bridge for React Todo Demo...');

const bridge = new MCPWebBridgeNode({
  name: 'MCP-Web Todo App (React)',
  description: 'Simple todo application with React + Jotai demonstrating MCP Web integration',
  port: 3001,
});

console.log('✅ Bridge started successfully!');
console.log('   Frontend: http://localhost:5175');

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down MCP Bridge...');
  bridge.close().then(() => process.exit(0));
});
