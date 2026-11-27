import type { MCPWebConfig } from '@mcp-web/types';

const config: MCPWebConfig = {
  name: 'MCP-Web Todo',
  description: 'Manage a todo list - add, complete, delete, and organize tasks',
  bridgeUrl: 'localhost:3001',
  autoConnect: true,
  mcpApp: {
    page: 'index.html',
    // The view loads its fonts from Google Fonts.
    csp: {
      resourceDomains: [
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
      ],
    },
  },
  icon: 'https://storage.googleapis.com/mcp-web/favicon-todo.svg',
};

export default config;
