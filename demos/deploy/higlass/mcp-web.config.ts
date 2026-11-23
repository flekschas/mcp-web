const config = {
  name: 'MCP-Web HiGlass',
  description: 'Fast genome browser',
  bridgeUrl: 'higlass.demo.mcp-web.dev',
  icon: 'https://storage.googleapis.com/mcp-web/favicon-higlass.svg',
  persistAuthToken: true,
  // An open page keeps the hosted bridge running and billed.
  idleTimeoutMs: 15 * 60 * 1000,
};

export default config;
