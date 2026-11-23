const config = {
  name: 'MCP-Web Checkers',
  description: 'Play Spanish checkers against an AI opponent',
  bridgeUrl: 'checkers.demo.mcp-web.dev',
  agentUrl: 'https://checkers-agent.demo.mcp-web.dev',
  autoConnect: true,
  // An open page keeps the hosted bridge running and billed.
  idleTimeoutMs: 15 * 60 * 1000,
};

export default config;
