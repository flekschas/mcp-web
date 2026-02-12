#!/usr/bin/env tsx

import { MCPWebBridgeNode } from '@mcp-web/bridge';
import config from './mcp-web.config.js';

console.log('🌉 Starting MCP Bridge for HiGlass Demo...');

const bridgeUrl = new URL(config.bridgeUrl?.startsWith("http") ? config.bridgeUrl : `http://${config.bridgeUrl}`);

const bridge = new MCPWebBridgeNode({
  name: 'HiGlass',
  description: 'Control the HiGlass web-based genome browser',
  port: Number(bridgeUrl.port),
  icon: config.icon,
});

console.log('✅ Bridge started successfully!');

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down MCP Bridge...');
  bridge.close().then(() => process.exit(0));
});
