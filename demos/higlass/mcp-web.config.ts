import type { MCPWebConfig } from '@mcp-web/types';

const config: MCPWebConfig = {
  name: 'MCP-Web HiGlass',
  description: 'Fast genome browser',
  bridgeUrl: 'localhost:3011',
  icon: 'https://storage.googleapis.com/mcp-web/favicon-higlass.svg',
  persistAuthToken: true,
};

export default config;
