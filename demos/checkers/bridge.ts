#!/usr/bin/env tsx

import { MCPWebBridgeNode } from '@mcp-web/bridge';
import config from './mcp-web.config.js';

console.log('🌉 Starting MCP Bridge for Checkers Demo...');

const bridgeUrl = new URL(config.bridgeUrl?.startsWith("http") ? config.bridgeUrl : `http://${config.bridgeUrl}`);
const agentUrl = new URL(config.agentUrl?.startsWith("http") ? config.agentUrl : `http://${config.agentUrl}`);

const bridge = new MCPWebBridgeNode({
  name: 'MCP-Web Checkers Game',
  description: 'Interactive checkers game where human plays against AI',
  port: Number(bridgeUrl.port || (bridgeUrl.protocol === 'https:' ? 443 : 80)),
  agentUrl: agentUrl.toString(),
  icon: config.icon,
});

console.log('✅ Bridge started successfully!');
console.log(`   Agent URL: ${config.agentUrl}`);
console.log('');
console.log('🎮 Checkers demo bridge is ready!');

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down MCP Bridge...');
  bridge.close().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down MCP Bridge...');
  bridge.close().then(() => process.exit(0));
});
