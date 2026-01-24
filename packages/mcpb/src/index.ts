/**
 * @mcp-web/mcpb - MCPB Bundle Generation for MCP-Web
 *
 * This package provides utilities for generating pre-configured MCPB bundles
 * that can be installed in Claude Desktop with a single click.
 *
 * @example
 * ```typescript
 * import { MCPWeb } from '@mcp-web/core';
 * import { getMcpBundle } from '@mcp-web/mcpb';
 *
 * const mcp = new MCPWeb({
 *   name: 'My App',
 *   description: 'AI-controllable application',
 *   autoConnect: true,
 * });
 *
 * // Generate bundle
 * const bundle = await getMcpBundle(mcp, {
 *   displayName: 'My App - Claude Extension',
 *   version: '1.0.0',
 * });
 *
 * // Download in browser
 * bundle.download();
 * ```
 *
 * @packageDocumentation
 */

export { getMcpBundle } from './get-mcp-bundle.js';
export type {
  ManifestJson,
  McpBundleOptions,
  McpBundleResult,
} from './types.js';
