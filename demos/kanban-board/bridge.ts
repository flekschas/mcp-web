#!/usr/bin/env tsx

import { MCPWebBridgeNode } from '@mcp-web/bridge';

console.log('🌉 Starting MCP Bridge for Kanban Board Demo...');

const bridge = new MCPWebBridgeNode({
  name: 'Kanban Board',
  description: 'Control a project management kanban board',
  port: 3001,
  icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjE2IiB4PSI2IiB5PSI0IiByeD0iMiIvPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEyIiB4PSIxNCIgeT0iNCIgcng9IjIiLz48L3N2Zz4=',
});

console.log('✅ Bridge started successfully!');

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down MCP Bridge...');
  bridge.close().then(() => process.exit(0));
});
