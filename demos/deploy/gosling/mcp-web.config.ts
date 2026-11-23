const config = {
  name: 'MCP-Web Gosling',
  description: 'Create and edit Gosling genomics charts',
  bridgeUrl: 'gosling.demo.mcp-web.dev',
  persistAuthToken: true,
  // An open page keeps the hosted bridge running and billed.
  idleTimeoutMs: 15 * 60 * 1000,
};

export default config;
