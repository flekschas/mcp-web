/**
 * Cloudflare Worker entry point for the checkers demo.
 *
 * Serves the built frontend from the ASSETS binding and routes bridge traffic
 * to the Durable Object. Also exports the query index, which routes the agent's
 * `/query/:uuid/*` callbacks.
 */

import { createCloudflareBridge } from '@mcp-web/bridge/cloudflare';
import config from './mcp-web.config.ts';

interface Env {
  AGENT_URL?: string;
}

const bridge = createCloudflareBridge<Env>({
  config: (env) => ({
    ...config,
    ...(env.AGENT_URL ? { agentUrl: env.AGENT_URL } : {}),
  }),
});

export const MCPWebBridgeObject = bridge.DurableObject;
export const MCPWebQueryIndex = bridge.QueryIndex;
export default bridge.worker;
