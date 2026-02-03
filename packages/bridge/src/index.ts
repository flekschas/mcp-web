/**
 * @mcp-web/bridge - MCP Web Bridge for connecting web frontends to AI agents.
 *
 * This package provides a runtime-agnostic bridge that mediates between
 * web frontends and AI agents via the Model Context Protocol (MCP).
 *
 * @example Node.js (recommended)
 * ```typescript
 * import { MCPWebBridgeNode } from '@mcp-web/bridge';
 *
 * const bridge = new MCPWebBridgeNode({
 *   name: 'My App',
 *   description: 'My awesome app',
 *   port: 3001,
 * });
 * ```
 *
 * @example Custom adapter (advanced)
 * ```typescript
 * import { MCPWebBridge } from '@mcp-web/bridge';
 *
 * const core = new MCPWebBridge(config);
 * const handlers = core.getHandlers();
 * // Wire handlers to your runtime's WebSocket/HTTP servers
 * ```
 */

// Re-export types from @mcp-web/types
export type {
  QueryAcceptedMessage,
  QueryCompleteBridgeMessage,
  QueryCompleteClientMessage,
  QueryFailureMessage,
  QueryMessage,
  QueryProgressMessage,
} from '@mcp-web/types';

export {
  InternalErrorCode,
  InvalidAuthenticationErrorCode,
  MissingAuthenticationErrorCode,
  QueryNotActiveErrorCode,
  QueryNotFoundErrorCode,
  UnknownMethodErrorCode,
} from '@mcp-web/types';
export type { MCPWebBridgeBunConfig, MCPWebBridgeDenoConfig, MCPWebBridgeNodeConfig, MCPWebBridgePartyConfig } from './adapters/index.js';
// Adapters
// Deno adapter
// Bun adapter
// PartyKit adapter
export { AlarmScheduler, Bridge, createPartyKitBridge, MCPWebBridgeBun, MCPWebBridgeDeno, MCPWebBridgeNode, MCPWebBridgeParty } from './adapters/index.js';
// Core bridge (runtime-agnostic)
// Backwards compatibility: re-export MCPWebBridge as the old name
// Note: The old MCPWebBridge class used dual ports. The new architecture
// uses single port via adapters. For migration, use MCPWebBridgeNode.
/**
 * @deprecated Use MCPWebBridgeNode for new code. This export exists for backwards compatibility.
 */
export { MCPWebBridge, MCPWebBridge as MCPWebBridgeCore } from './core.js';
// Runtime abstractions (for custom adapter authors)
export type {
  BridgeAdapterConfig,
  BridgeHandlers,
  HttpRequest,
  HttpResponse,Scheduler,
  WebSocketConnection
} from './runtime/index.js';
export {
  createHttpResponse,
  jsonResponse,NoopScheduler,
  readyStateToString,TimerScheduler,
  WebSocketReadyState
} from './runtime/index.js';
// Legacy types (for backwards compatibility)
export type {
  ActivityMessage,
  AuthenticatedMessage,
  AuthenticateMessage,
  BridgeMessage,
  FrontendMessage,
  QueryTracking,
  RegisterResourceMessage,
  RegisterToolMessage,
  ResourceReadMessage,
  ResourceResponseMessage,
  ToolCallMessage,
  ToolResponseMessage,
  TrackedToolCall,
} from './types.js';
