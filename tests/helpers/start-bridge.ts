#!/usr/bin/env node
import { MCPWebBridge } from '@mcp-web/bridge';

export interface Env {
  WS_PORT: string;
  MCP_PORT: string;
  NAME: string;
  DESCRIPTION: string;
  AGENT_URL: string;
}

// Read config from environment or args
const config = {
  wsPort: Number.parseInt(process.env.WS_PORT || '3001', 10),
  mcpPort: Number.parseInt(process.env.MCP_PORT || '3002', 10),
  name: process.env.NAME || 'Test Bridge',
  description: process.env.DESCRIPTION || 'Test bridge server',
  agentUrl: process.env.AGENT_URL,
};

console.error('[Bridge] Starting with config:', config);

const bridge = new MCPWebBridge(config);

// Handle shutdown
process.on('SIGTERM', async () => {
  console.error('[Bridge] Shutting down...');
  await bridge.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.error('[Bridge] Shutting down...');
  await bridge.close();
  process.exit(0);
});

console.error('[Bridge] Ready');
