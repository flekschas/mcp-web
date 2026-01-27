#!/usr/bin/env node
import { MCPWebBridgeNode } from '@mcp-web/bridge';

export interface Env {
  PORT: string;
  NAME: string;
  DESCRIPTION: string;
  AGENT_URL: string;
}

// Read config from environment or args
// Support both old (WS_PORT/MCP_PORT) and new (PORT) configs for backwards compatibility
const port = Number.parseInt(process.env.PORT || process.env.WS_PORT || '3001', 10);

const config = {
  port,
  name: process.env.NAME || 'Test Bridge',
  description: process.env.DESCRIPTION || 'Test bridge server',
  ...(process.env.AGENT_URL && { agentUrl: process.env.AGENT_URL }),
};

console.error('[Bridge] Starting with config:', config);

const bridge = new MCPWebBridgeNode(config);

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
