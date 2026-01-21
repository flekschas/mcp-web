import type { MCPWebConfig } from '@mcp-web/types';

export const PORTS = {
  BRIDGE: 3001,  // Single port for both WebSocket and HTTP
  FRONTEND: 5175,
} as const;

export const MCP_WEB_CONFIG: MCPWebConfig = {
  name: 'MCP-Web Todo App (React)',
  description: 'Simple todo application with React + Jotai demonstrating MCP Web integration',
  host: 'localhost',
  wsPort: PORTS.BRIDGE,  // Both WS and HTTP use the same port now
  mcpPort: PORTS.BRIDGE,
  autoConnect: true,
};
