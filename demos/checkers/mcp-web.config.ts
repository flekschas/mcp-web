import type { MCPWebConfig } from '@mcp-web/types';

// Port configuration
export const PORTS = {
  BRIDGE: 3001,  // Single port for both WebSocket and HTTP
  AGENT: 3003,
  FRONTEND: 3000
} as const;

// MCPWeb configuration (to be used when creating instances)
export const MCP_WEB_CONFIG: MCPWebConfig = {
  name: 'MCP-Web Checkers Game',
  description: 'Interactive checkers game where human plays against AI',
  host: 'localhost',
  wsPort: PORTS.BRIDGE,
  mcpPort: PORTS.BRIDGE,
  agentUrl: `http://localhost:${PORTS.AGENT}`,
  autoConnect: true
};
