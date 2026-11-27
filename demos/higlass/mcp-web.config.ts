import type { MCPWebConfig } from '@mcp-web/types';

const config: MCPWebConfig = {
  name: 'MCP-Web HiGlass',
  description: 'Fast genome browser',
  bridgeUrl: 'localhost:3011',
  icon: 'https://storage.googleapis.com/mcp-web/favicon-higlass.svg',
  persistAuthToken: true,
  // AI can open the whole app in the chat. The view loads tiles and gene
  // annotations from these servers.
  mcpApp: {
    page: 'index.html',
    csp: {
      connectDomains: [
        'https://higlass.io',
        'https://resgen.io',
        'https://s3.amazonaws.com',
      ],
    },
  },
};

export default config;
