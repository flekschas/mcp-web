const config = {
  name: 'MCP-Web Vega-Lite',
  description: 'Create and edit Vega-Lite charts',
  bridgeUrl: 'vega-lite.demo.mcp-web.dev',
  persistAuthToken: true,
  // An open page keeps the hosted bridge running and billed.
  idleTimeoutMs: 15 * 60 * 1000,
};

export default config;
