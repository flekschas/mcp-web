/**
 * Cloudflare Worker entry point for the vega-lite demo.
 *
 * Serves the built frontend from the ASSETS binding and routes bridge traffic
 * to the Durable Object.
 */

import { createCloudflareBridge } from '@mcp-web/bridge/cloudflare';
import config from './mcp-web.config.ts';

const bridge = createCloudflareBridge({ config });

export const MCPWebBridgeObject = bridge.DurableObject;
export default bridge.worker;
