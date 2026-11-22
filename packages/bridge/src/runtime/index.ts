/**
 * Runtime abstraction layer for MCP Web Bridge.
 *
 * This module provides interfaces and utilities that allow the bridge
 * to work across different JavaScript runtimes (Node.js, Bun, Cloudflare).
 */

export type { Scheduler } from './scheduler.js';
export { NoopScheduler, TimerScheduler } from './scheduler.js';
export type {
  BridgeAdapterConfig,
  BridgeHandlers,
  HttpRequest,
  HttpResponse,
  WebSocketConnection,
} from './types.js';
export {
  createHttpResponse,
  jsonResponse,
  readyStateToString,
  WebSocketReadyState,
} from './types.js';
