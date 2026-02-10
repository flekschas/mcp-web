#!/usr/bin/env tsx

import { MCPWebBridgeNode } from '@mcp-web/bridge';
import config from './mcp-web.config.js';

console.log('🌉 Starting MCP Bridge for HiGlass Demo...');

const bridge = new MCPWebBridgeNode({
  name: 'HiGlass',
  description: 'Control the HiGlass web-based genome browser',
  port: 3001,
  icon: config.icon,
});

console.log('✅ Bridge started successfully!');

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down MCP Bridge...');
  bridge.close().then(() => process.exit(0));
});
