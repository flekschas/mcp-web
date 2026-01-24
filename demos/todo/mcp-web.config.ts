import type { MCPWebConfig } from '@mcp-web/types';

export const PORTS = { BRIDGE: 3001, FRONTEND: 5175 } as const;

export const MCP_WEB_CONFIG: MCPWebConfig = {
  name: 'MCP-Web Todo',
  description: 'Simple todo application with React + Jotai demonstrating MCP-Web',
  host: 'localhost',
  wsPort: PORTS.BRIDGE,
  mcpPort: PORTS.BRIDGE,
  autoConnect: true,
};
