/**
 * Node.js server for the Checkers AI Agent
 *
 * This script imports the shared agent logic from demos/checkers/agent.ts
 * and serves it using @hono/node-server.
 *
 * Configuration is read from environment variables.
 */

import { serve } from '@hono/node-server';
import { createApp, type AgentConfig } from '../../checkers/agent.ts';

const agentConfig: AgentConfig = {
  bridgeUrl:
    process.env.BRIDGE_URL ?? 'https://checkers.demo.mcp-web.dev',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') ?? [
    'https://checkers.demo.mcp-web.dev',
  ],
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  googleApiKey:
    process.env.GOOGLE_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  cerebrasApiKey: process.env.CEREBRAS_API_KEY,
  modelProvider: process.env.MODEL_PROVIDER,
  modelName: process.env.MODEL_NAME,
};

const port = Number(process.env.PORT) || 8000;
const app = createApp(agentConfig);

console.log('Starting Checkers AI Agent...');
console.log(`Connecting to MCP bridge at ${agentConfig.bridgeUrl}`);

serve(
  {
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0',
  },
  (info) => {
    const host =
      info.address === '0.0.0.0' ? 'localhost' : info.address;
    console.log(`\nCheckers AI Agent ready!`);
    console.log(`   Server: http://${host}:${info.port}`);
    console.log(`   Health: http://${host}:${info.port}/health`);
    console.log(
      `   Query endpoint: PUT http://${host}:${info.port}/query/:uuid`,
    );
  },
);
