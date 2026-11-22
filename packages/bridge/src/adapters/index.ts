/**
 * Bridge adapters for different JavaScript runtimes.
 *
 * Each adapter wraps the core MCPWebBridge class and provides
 * runtime-specific I/O implementations.
 *
 * Available adapters:
 * - `MCPWebBridgeNode` - Node.js (production ready)
 * - `MCPWebBridgeBun` - Bun runtime
 * - `createCloudflareBridge` - Cloudflare Workers + Durable Objects
 *
 * The Cloudflare adapter is exported from `@mcp-web/bridge/cloudflare` because
 * it needs Workers globals.
 */

export type { MCPWebBridgeBunConfig } from './bun.js';
// Bun adapter
export { MCPWebBridgeBun } from './bun.js';
export type {
  MCPWebBridgeNodeConfig,
  MCPWebBridgeNodeSSLConfig,
} from './node.js';
// Node.js adapter (production ready)
export { Bridge, MCPWebBridgeNode } from './node.js';
