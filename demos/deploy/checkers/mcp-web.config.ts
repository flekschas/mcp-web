import type { MCPWebConfig } from 'npm:@mcp-web/types@^0.1.0';

const agentUrl =
  Deno.env.get('AGENT_URL') ?? 'checkers-agent.demos.mcp-web.dev';

const config: MCPWebConfig = {
  name: 'MCP-Web Checkers Demo',
  description: 'Play Spanish checkers against an AI opponent',
  agentUrl,
};

export default config;
