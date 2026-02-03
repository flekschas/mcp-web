/**
 * Deno server for the Checkers AI Agent
 *
 * This script imports the shared agent logic from demos/checkers/agent.ts
 * and serves it using Deno.serve().
 *
 * Configuration is read from environment variables.
 *
 * Usage:
 *   deno task start:agent  # Production
 *   deno task dev:agent    # Development with watch mode
 */

import { createApp, type AgentConfig } from '../../checkers/agent.ts';

const agentConfig: AgentConfig = {
  bridgeUrl: Deno.env.get('BRIDGE_URL') ?? 'https://checkers.demos.mcp-web.dev',
  allowedOrigins: Deno.env.get('ALLOWED_ORIGINS')?.split(',') ?? [
    'https://checkers.demos.mcp-web.dev',
  ],
  anthropicApiKey: Deno.env.get('ANTHROPIC_API_KEY'),
  openaiApiKey: Deno.env.get('OPENAI_API_KEY'),
  googleApiKey: Deno.env.get('GOOGLE_API_KEY') ?? Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY'),
  cerebrasApiKey: Deno.env.get('CEREBRAS_API_KEY'),
  modelProvider: Deno.env.get('MODEL_PROVIDER'),
  modelName: Deno.env.get('MODEL_NAME'),
};

const port = Number(Deno.env.get('PORT')) || 8000;
const app = createApp(agentConfig);

console.log(`🚀 Starting Checkers AI Agent...`);
console.log(`📡 Connecting to MCP bridge at ${agentConfig.bridgeUrl}`);

Deno.serve(
  {
    port,
    hostname: '0.0.0.0',
    onListen: ({ port, hostname }) => {
      const host = hostname === '0.0.0.0' ? 'localhost' : hostname;
      console.log(`\n🎯 Checkers AI Agent ready!`);
      console.log(`   Server: http://${host}:${port}`);
      console.log(`   Health: http://${host}:${port}/health`);
      console.log(`   Query endpoint: PUT http://${host}:${port}/query/:uuid`);
      console.log(`\n🎮 Ready to play checkers!`);
    },
  },
  app.fetch
);
