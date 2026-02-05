import type { MCPWebConfig } from '@mcp-web/types';

const config: MCPWebConfig = {
  name: 'MCP-Web Checkers Game',
  description: 'Interactive checkers game where human plays against AI',
  bridgeUrl: 'localhost:3001',
  agentUrl: 'localhost:3003',
  autoConnect: true,
};

export default config;

// Port constants for serve-agent.ts and vite.config.ts
export const PORTS = {
  BRIDGE: 3001,
  AGENT: 3003,
  FRONTEND: 3000,
} as const;
