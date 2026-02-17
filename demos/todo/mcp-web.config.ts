import type { MCPWebConfig } from '@mcp-web/types';

const config: MCPWebConfig = {
  name: 'MCP-Web Todo',
  description:
    'Manage a todo list - add, complete, delete, and organize tasks',
  bridgeUrl: 'localhost:3001',
  autoConnect: true,
  icon: 'https://storage.googleapis.com/mcp-web/favicon-todo.svg',
};

export default config;
