const config = {
  name: 'MCP-Web GenomeSpy',
  description: 'Create and edit GenomeSpy genomics charts',
  bridgeUrl: 'genomespy.demo.mcp-web.dev',
  persistAuthToken: true,
  // An open page keeps the hosted bridge running and billed.
  idleTimeoutMs: 15 * 60 * 1000,
};

export default config;
