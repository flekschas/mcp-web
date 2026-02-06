import type { MCPWebConfig } from '@mcp-web/types';

const config: MCPWebConfig = {
  name: 'MCP-Web Checkers Game',
  description: 'Interactive checkers game where human plays against AI',
  bridgeUrl: 'localhost:3001',
  agentUrl: 'localhost:3003',
  autoConnect: true,
};

export default config;
