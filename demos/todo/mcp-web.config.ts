import type { MCPWebConfig } from '@mcp-web/types';

const config: MCPWebConfig = {
  name: 'MCP-Web Todo Demo',
  description:
    'Manage a todo list - add, complete, delete, and organize tasks',
  bridgeUrl: 'localhost:3001',
  autoConnect: true,
};

export default config;
