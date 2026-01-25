/**
 * MCPWebBridgeBun - Bun adapter for the MCP Web Bridge.
 *
 * Uses Bun.serve() with built-in WebSocket support for a single-port server.
 * Bun's server natively handles both HTTP and WebSocket on the same port.
 *
 * @example
 * ```typescript
 * // server.ts
 * import { MCPWebBridgeBun } from '@mcp-web/bridge';
 *
 * const bridge = new MCPWebBridgeBun({
 *   name: 'My App',
 *   description: 'My awesome app',
 *   port: 3001,
 * });
 *
 * // Bridge is now listening on ws://localhost:3001 and http://localhost:3001
 * ```
 *
 * @example Production deployment
 * ```typescript
 * import { MCPWebBridgeBun } from '@mcp-web/bridge';
 *
 * const bridge = new MCPWebBridgeBun({
 *   name: 'Production Bridge',
 *   description: 'Production MCP Web bridge server',
 *   port: Number(process.env.PORT) || 3001,
 *   hostname: '0.0.0.0',
 * });
 *
 * // Graceful shutdown
 * process.on('SIGTERM', async () => {
 *   await bridge.close();
 *   process.exit(0);
 * });
 * ```
 *
 * @remarks
 * This adapter requires Bun runtime (https://bun.sh).
 * Bun's `Bun.serve()` provides excellent performance with native WebSocket support.
 *
 * Key features:
 * - Single port for HTTP and WebSocket
 * - Native TypeScript support
 * - High performance HTTP and WebSocket handling
 *
 * @see https://bun.sh/docs/api/http
 * @see https://bun.sh/docs/api/websockets
 */

import type { MCPWebConfig } from '@mcp-web/types';
import { MCPWebBridge } from '../core.js';
import { TimerScheduler } from '../runtime/scheduler.js';
import type { HttpRequest, WebSocketConnection } from '../runtime/types.js';

/**
 * Configuration for the Bun bridge adapter.
 */
export interface MCPWebBridgeBunConfig extends Omit<MCPWebConfig, 'bridgeUrl'> {
  /** Port to listen on (default: 3001) */
  port?: number;

  /** Hostname to bind to (default: '0.0.0.0') */
  hostname?: string;
}

/**
 * WebSocket data attached to each connection for session tracking.
 */
interface WebSocketData {
  sessionId: string;
  wrapped: WebSocketConnection;
  messageHandlers: Set<(data: string) => void>;
  // biome-ignore lint/suspicious/noExplicitAny: Bun's ServerWebSocket type varies
  setSocket: (socket: any) => void;
  handlers: ReturnType<MCPWebBridge['getHandlers']>;
  url: URL;
}

/**
 * Wraps a Bun ServerWebSocket in our runtime-agnostic interface.
 */
function createBunWebSocketWrapper(): {
  wrapped: WebSocketConnection;
  messageHandlers: Set<(data: string) => void>;
  // biome-ignore lint/suspicious/noExplicitAny: Bun's ServerWebSocket type varies
  setSocket: (socket: any) => void;
} {
  const messageHandlers = new Set<(data: string) => void>();
  // biome-ignore lint/suspicious/noExplicitAny: Bun's ServerWebSocket type varies
  let wsSocket: any = null;

  const wrapped: WebSocketConnection = {
    send(data: string): void {
      if (wsSocket?.readyState === 1) {
        // OPEN
        wsSocket.send(data);
      }
    },

    close(code?: number, reason?: string): void {
      wsSocket?.close(code, reason);
    },

    get readyState(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' {
      if (!wsSocket) return 'CLOSED';
      switch (wsSocket.readyState) {
        case 0:
          return 'CONNECTING';
        case 1:
          return 'OPEN';
        case 2:
          return 'CLOSING';
        case 3:
        default:
          return 'CLOSED';
      }
    },

    onMessage(handler: (data: string) => void): void {
      messageHandlers.add(handler);
    },

    offMessage(handler: (data: string) => void): void {
      messageHandlers.delete(handler);
    },
  };

  return {
    wrapped,
    messageHandlers,
    // biome-ignore lint/suspicious/noExplicitAny: Bun's ServerWebSocket type varies
    setSocket: (socket: any) => {
      wsSocket = socket;
    },
  };
}

/**
 * Wraps a Bun Request in our runtime-agnostic HttpRequest interface.
 */
function wrapBunRequest(req: Request): HttpRequest {
  return {
    method: req.method,
    url: req.url,
    headers: {
      get(name: string): string | null {
        return req.headers.get(name);
      },
    },
    text(): Promise<string> {
      return req.text();
    },
  };
}

/**
 * Bun adapter for MCPWebBridge.
 * Provides a single-port server using Bun.serve() with native WebSocket support.
 *
 * @example
 * ```typescript
 * const bridge = new MCPWebBridgeBun({
 *   name: 'My App',
 *   description: 'My app',
 *   port: 3001,
 * });
 * ```
 */
export class MCPWebBridgeBun {
  #core: MCPWebBridge;
  // biome-ignore lint/suspicious/noExplicitAny: Bun.Server type varies
  #server: any;
  #port: number;
  #hostname: string;

  constructor(config: MCPWebBridgeBunConfig) {
    this.#port = config.port ?? 3001;
    this.#hostname = config.hostname ?? '0.0.0.0';

    // Create the core with a timer-based scheduler
    const scheduler = new TimerScheduler();
    this.#core = new MCPWebBridge(config, scheduler);
    const handlers = this.#core.getHandlers();

    // Start Bun server with WebSocket support
    // biome-ignore lint/suspicious/noExplicitAny: Bun global is runtime-specific
    this.#server = (globalThis as any).Bun.serve({
      port: this.#port,
      hostname: this.#hostname,

      // Handle HTTP requests
      fetch: async (req: Request, server: { upgrade: (req: Request, options: { data: WebSocketData }) => boolean }) => {
        const url = new URL(req.url);

      // Handle WebSocket upgrade
      if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
        const sessionId = url.searchParams.get('session');

        if (!sessionId) {
          return new Response('Missing session parameter', { status: 400 });
        }

        const { wrapped, messageHandlers, setSocket } = createBunWebSocketWrapper();

        const success = server.upgrade(req, {
          data: {
            sessionId,
            wrapped,
            // Store these for the websocket handlers
            messageHandlers,
            setSocket,
            handlers,
            url,
          } as WebSocketData,
        });

        if (success) {
          return undefined as unknown as Response; // Bun handles the upgrade
        }

        return new Response('WebSocket upgrade failed', { status: 500 });
      }

        // Handle regular HTTP requests
        const wrappedReq = wrapBunRequest(req);
        const httpResponse = await handlers.onHttpRequest(wrappedReq);

        return new Response(httpResponse.body, {
          status: httpResponse.status,
          headers: httpResponse.headers,
        });
      },

      // WebSocket handlers
      websocket: {
        // biome-ignore lint/suspicious/noExplicitAny: Bun's ServerWebSocket type varies
        open(ws: any) {
          const data = ws.data as WebSocketData & {
            messageHandlers: Set<(data: string) => void>;
            // biome-ignore lint/suspicious/noExplicitAny: Bun's ServerWebSocket type varies
            setSocket: (socket: any) => void;
            handlers: ReturnType<MCPWebBridge['getHandlers']>;
            url: URL;
          };

          // Connect the socket to the wrapper
          data.setSocket(ws);

          // Notify the bridge
          data.handlers.onWebSocketConnect(data.sessionId, data.wrapped, data.url);
        },

        // biome-ignore lint/suspicious/noExplicitAny: Bun's ServerWebSocket type varies
        message(ws: any, message: string | Buffer) {
          const data = ws.data as WebSocketData & {
            messageHandlers: Set<(data: string) => void>;
            handlers: ReturnType<MCPWebBridge['getHandlers']>;
          };

          const str = typeof message === 'string' ? message : message.toString();

          // Notify message handlers
          for (const handler of data.messageHandlers) {
            handler(str);
          }

          // Notify the bridge
          data.handlers.onWebSocketMessage(data.sessionId, data.wrapped, str);
        },

        // biome-ignore lint/suspicious/noExplicitAny: Bun's ServerWebSocket type varies
        close(ws: any) {
          const data = ws.data as WebSocketData & {
            handlers: ReturnType<MCPWebBridge['getHandlers']>;
          };

          data.handlers.onWebSocketClose(data.sessionId);
        },

      },
    });

    console.log(`🌉 MCP Web Bridge (Bun) listening on ${this.#hostname}:${this.#port}`);
    console.log(`   WebSocket: ws://${this.#hostname === '0.0.0.0' ? 'localhost' : this.#hostname}:${this.#port}`);
    console.log(`   HTTP/MCP:  http://${this.#hostname === '0.0.0.0' ? 'localhost' : this.#hostname}:${this.#port}`);
  }

  /**
   * Get the underlying MCPWebBridge core instance.
   */
  get core(): MCPWebBridge {
    return this.#core;
  }

  /**
   * Get the bridge handlers for custom integrations.
   */
  getHandlers() {
    return this.#core.getHandlers();
  }

  /**
   * Get the port the server is listening on.
   */
  get port(): number {
    return this.#port;
  }

  /**
   * Gracefully shut down the bridge.
   */
  async close(): Promise<void> {
    // Stop the server
    this.#server?.stop();

    // Close the core (cleans up sessions, timers)
    await this.#core.close();
  }
}
