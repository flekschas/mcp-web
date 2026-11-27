const config = {
  name: 'MCP-Web HiGlass',
  description: 'Fast genome browser',
  bridgeUrl: 'higlass.demo.mcp-web.dev',
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
  // An open page keeps the hosted bridge running and billed.
  idleTimeoutMs: 15 * 60 * 1000,
};

export default config;
