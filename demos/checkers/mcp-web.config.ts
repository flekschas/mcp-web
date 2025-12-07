import type { MCPWebConfig } from '@mcp-web/types';

// Port configuration
export const PORTS = {
  BRIDGE_WS: 3001,
  BRIDGE_MCP: 3002,
  AGENT: 3003,
  FRONTEND: 3000
} as const;

// MCPWeb configuration (to be used when creating instances)
export const MCP_WEB_CONFIG: MCPWebConfig = {
  name: 'MCP-Web Checkers Game',
  description: 'Interactive checkers game where human plays against AI',
  host: 'localhost',
  wsPort: PORTS.BRIDGE_WS,
  mcpPort: PORTS.BRIDGE_MCP,
  agentUrl: `http://localhost:${PORTS.AGENT}`,
  autoConnect: true
};
