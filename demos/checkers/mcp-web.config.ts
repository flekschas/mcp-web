import type { MCPWebConfig } from '@mcp-web/types';

// Port configuration
export const PORTS = {
  BRIDGE: 3001, // Single port for both WebSocket and HTTP
  AGENT: 3003,
  FRONTEND: 3000,
} as const;

// Bridge server address (protocol determined automatically based on page context)
const bridgeHost = import.meta.env.VITE_BRIDGE_HOST ?? 'localhost';
const bridgePort = import.meta.env.VITE_BRIDGE_PORT
  ? Number(import.meta.env.VITE_BRIDGE_PORT)
  : import.meta.env.PROD ? 443 : PORTS.BRIDGE;
const agentUrl = import.meta.env.VITE_AGENT_URL ?? `localhost:${PORTS.AGENT}`;

// MCPWeb configuration (to be used when creating instances)
export const MCP_WEB_CONFIG: MCPWebConfig = {
  name: 'MCP-Web Checkers Game',
  description: 'Interactive checkers game where human plays against AI',
  bridgeUrl: `${bridgeHost}:${bridgePort}`,
  agentUrl,
  autoConnect: true,
};
