#!/usr/bin/env tsx

import { MCPWebBridgeNode } from '@mcp-web/bridge';
import { PORTS } from './mcp-web.config.js';

console.log('🌉 Starting MCP Bridge for Checkers Demo...');

const bridge = new MCPWebBridgeNode({
  name: 'MCP-Web Checkers Game',
  description: 'Interactive checkers game where human plays against AI',
  port: PORTS.BRIDGE,
  agentUrl: `http://localhost:${PORTS.AGENT}`,
});

console.log('✅ Bridge started successfully!');
console.log(`   Agent URL: http://localhost:${PORTS.AGENT}`);
console.log('');
console.log('🎮 Checkers demo bridge is ready!');
console.log('   1. Start the agent: cd ../agent && pnpm start');
console.log('   2. Start the frontend: cd ../app && pnpm dev');
console.log(`   3. Open http://localhost:${PORTS.FRONTEND}`);

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down MCP Bridge...');
  bridge.close().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down MCP Bridge...');
  bridge.close().then(() => process.exit(0));
});
