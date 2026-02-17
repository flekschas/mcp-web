import type { MCPWebConfig } from '@mcp-web/types';

const config: MCPWebConfig = {
  name: 'MCP-Web Checkers',
  description: 'Interactive checkers game where human plays against AI',
  bridgeUrl: 'localhost:3001',
  agentUrl: 'localhost:3003',
  autoConnect: true,
  icon: 'https://storage.googleapis.com/mcp-web/favicon-checkers.svg',
};

export default config;
