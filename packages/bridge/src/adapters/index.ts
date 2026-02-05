/**
 * Bridge adapters for different JavaScript runtimes.
 *
 * Each adapter wraps the core MCPWebBridge class and provides
 * runtime-specific I/O implementations.
 *
 * Available adapters:
 * - `MCPWebBridgeNode` - Node.js (production ready)
 * - `MCPWebBridgeDeno` - Deno / Deno Deploy
 * - `MCPWebBridgeBun` - Bun runtime
 * - `MCPWebBridgeParty` / `createPartyKitBridge` - PartyKit / Cloudflare
 */

// Node.js adapter (production ready)
export { Bridge, MCPWebBridgeNode } from './node.js';
export type { MCPWebBridgeNodeConfig, MCPWebBridgeNodeSSLConfig } from './node.js';

// Deno adapter
export { MCPWebBridgeDeno } from './deno.js';
export type { MCPWebBridgeDenoConfig } from './deno.js';

// Bun adapter
export { MCPWebBridgeBun } from './bun.js';
export type { MCPWebBridgeBunConfig } from './bun.js';

// PartyKit adapter
export { AlarmScheduler, createPartyKitBridge, MCPWebBridgeParty } from './partykit.js';
export type { MCPWebBridgePartyConfig } from './partykit.js';
