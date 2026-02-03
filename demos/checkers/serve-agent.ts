#!/usr/bin/env tsx
/**
 * Node.js server for the Checkers AI Agent
 *
 * This script loads environment variables from .env and starts
 * the Hono server using @hono/node-server.
 *
 * Usage:
 *   pnpm dev:agent     # Development with watch mode
 *   tsx serve-agent.ts # Direct execution
 */

import { serve } from '@hono/node-server';
import { config } from 'dotenv';
import { createApp, type AgentConfig } from './agent.js';
import { PORTS } from './mcp-web.config.js';

// Load environment variables from .env file
config();

const agentConfig: AgentConfig = {
  bridgeUrl: process.env.BRIDGE_URL ?? `http://localhost:${PORTS.BRIDGE}`,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') ?? [
    `http://localhost:${PORTS.FRONTEND}`,
    `http://localhost:${PORTS.BRIDGE}`,
  ],
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  googleApiKey: process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  cerebrasApiKey: process.env.CEREBRAS_API_KEY,
  modelProvider: process.env.MODEL_PROVIDER,
  modelName: process.env.MODEL_NAME,
};

const port = Number(process.env.PORT) || PORTS.AGENT;
const app = createApp(agentConfig);

console.log(`🚀 Starting Checkers AI Agent on port ${port}...`);
console.log(`📡 Connecting to MCP bridge at ${agentConfig.bridgeUrl}`);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`\n🎯 Checkers AI Agent ready!`);
    console.log(`   Server: http://localhost:${info.port}`);
    console.log(`   Health: http://localhost:${info.port}/health`);
    console.log(`   Query endpoint: PUT http://localhost:${info.port}/query/:uuid`);
    console.log(`\n🎮 Ready to play checkers!`);
  }
);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Checkers AI Agent...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down Checkers AI Agent...');
  process.exit(0);
});
