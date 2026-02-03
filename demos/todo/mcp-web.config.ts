import type { MCPWebConfig } from '@mcp-web/types';

export const PORTS = { BRIDGE: 3001, FRONTEND: 5175 } as const;

// Bridge server address (protocol determined automatically based on page context)
// Note: import.meta.env is only available in Vite context (frontend build)
const bridgeHost = import.meta.env?.VITE_BRIDGE_HOST ?? 'localhost';
const bridgePort = import.meta.env?.VITE_BRIDGE_PORT
  ? Number(import.meta.env.VITE_BRIDGE_PORT)
  : import.meta.env?.PROD ? 443 : PORTS.BRIDGE;

export const MCP_WEB_CONFIG: MCPWebConfig = {
  name: 'MCP-Web Todo',
  description:
    'Simple todo application with React + Jotai demonstrating MCP-Web',
  bridgeUrl: `${bridgeHost}:${bridgePort}`,
  autoConnect: true,
};
