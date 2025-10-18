#!/usr/bin/env tsx

import { MCPWebBridge } from '@mcp-web/bridge';
import { MCP_WEB_CONFIG, PORTS } from 'checkers-shared';

console.log('🌉 Starting MCP Bridge for Checkers Demo...');

// Create MCPWebBridge instance for the bridge
new MCPWebBridge(MCP_WEB_CONFIG);

console.log('✅ Bridge started successfully!');
console.log(`   WebSocket server: ws://localhost:${PORTS.BRIDGE_WS}`);
console.log(`   MCP server: http://localhost:${PORTS.BRIDGE_MCP}`);
console.log(`   Agent URL: http://localhost:${PORTS.AGENT}`);
console.log('');
console.log('🎮 Checkers demo bridge is ready!');
console.log('   1. Start the agent: cd ../agent && pnpm start');
console.log('   2. Start the frontend: cd ../app && pnpm dev');
console.log(`   3. Open http://localhost:${PORTS.FRONTEND}`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down MCP Bridge...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down MCP Bridge...');
  process.exit(0);
});
