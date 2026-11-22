/**
 * Cloudflare Worker entry point for the Checkers AI Agent.
 *
 * The agent is a runtime-agnostic Hono app, so this only has to build its
 * config from the Worker `env` and hand over `app.fetch`.
 *
 * The app is created once per isolate.
 */

import { type AgentConfig, createApp } from '../../checkers/agent.ts';

interface Env {
  BRIDGE_URL?: string;
  ALLOWED_ORIGINS?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  CEREBRAS_API_KEY?: string;
  MODEL_PROVIDER?: string;
  MODEL_NAME?: string;
}

let app: ReturnType<typeof createApp> | undefined;

function getApp(env: Env) {
  if (app) return app;

  const config: AgentConfig = {
    bridgeUrl: env.BRIDGE_URL ?? 'https://checkers.demo.mcp-web.dev',
    allowedOrigins: env.ALLOWED_ORIGINS?.split(',') ?? [
      'https://checkers.demo.mcp-web.dev',
    ],
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    openaiApiKey: env.OPENAI_API_KEY,
    googleApiKey: env.GOOGLE_API_KEY ?? env.GOOGLE_GENERATIVE_AI_API_KEY,
    cerebrasApiKey: env.CEREBRAS_API_KEY,
    modelProvider: env.MODEL_PROVIDER,
    modelName: env.MODEL_NAME,
  };

  app = createApp(config);
  return app;
}

export default {
  fetch(
    request: Request,
    env: Env,
    ctx: unknown,
  ): Response | Promise<Response> {
    return getApp(env).fetch(request, env, ctx as never);
  },
};
