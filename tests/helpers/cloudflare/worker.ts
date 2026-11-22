/**
 * Bridge worker for the Cloudflare integration tests.
 *
 * Every request reaches the Worker, so these tests exercise the bridge
 * protocol rather than asset routing.
 */

import { createCloudflareBridge } from '@mcp-web/bridge/cloudflare';

interface Env {
  AGENT_URL?: string;
}

const bridge = createCloudflareBridge<Env>({
  config: (env) => ({
    name: 'Test Bridge',
    description: 'Cloudflare test bridge',
    ...(env.AGENT_URL ? { agentUrl: env.AGENT_URL } : {}),
  }),
});

export const MCPWebBridgeObject = bridge.DurableObject;
export const MCPWebQueryIndex = bridge.QueryIndex;
export default bridge.worker;
