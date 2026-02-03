import { createDemoServer } from '../lib/create-demo-server.ts';

const agentUrl =
  Deno.env.get('AGENT_URL') ?? 'https://checkers-agent.demos.mcp-web.dev';

createDemoServer({
  bridge: {
    name: 'MCP-Web Checkers Demo',
    description: 'Play Spanish checkers against an AI opponent',
    agentUrl,
  },
  staticDir: './static',
});
