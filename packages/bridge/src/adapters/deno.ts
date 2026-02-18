/**
 * MCPWebBridgeDeno - Deno adapter for the MCP Web Bridge.
 *
 * Uses Deno.serve() with WebSocket upgrade for a single-port server.
 * Handles both HTTP requests and WebSocket connections on the same port.
 *
 * @example
 * ```typescript
 * // main.ts
 * import { MCPWebBridgeDeno } from '@mcp-web/bridge';
 *
 * const bridge = new MCPWebBridgeDeno({
 *   name: 'My App',
 *   description: 'My awesome app',
 *   port: 3001,
 * });
 *
 * // Bridge is now listening on ws://localhost:3001 and http://localhost:3001
 * ```
 *
 * @example Deploy to Deno Deploy
 * ```typescript
 * // main.ts - Entry point for Deno Deploy
 * import { MCPWebBridgeDeno } from '@mcp-web/bridge';
 *
 * new MCPWebBridgeDeno({
 *   name: 'My Production App',
 *   description: 'Production bridge server',
 *   // Port is typically provided by Deno Deploy via environment
 *   port: Number(Deno.env.get('PORT')) || 8000,
 * });
 * ```
 *
 * @remarks
 * This adapter requires Deno runtime. It uses:
 * - `Deno.serve()` for the HTTP server
 * - `Deno.upgradeWebSocket()` for WebSocket connections
 *
 * For Deno Deploy, ensure your entry point is at the root of your repository
 * or configure the entry point in your deployment settings.
 *
 * @see https://docs.deno.com/deploy/
 * @see https://deno.land/api?s=Deno.serve
 */

import type { MCPWebConfig } from '@mcp-web/types';
import { MCPWebBridge } from '../core.js';
import { TimerScheduler } from '../runtime/scheduler.js';
import type { HttpRequest, WebSocketConnection } from '../runtime/types.js';
import { isSSEResponse } from '../runtime/types.js';

/**
 * Configuration for the Deno bridge adapter.
 */
export interface MCPWebBridgeDenoConfig extends Omit<MCPWebConfig, 'bridgeUrl'> {
  /** Port to listen on (default: 3001, or PORT env var on Deno Deploy) */
  port?: number;

  /** Hostname to bind to (default: '0.0.0.0') */
  hostname?: string;
}

/**
 * Wraps a Deno WebSocket in our runtime-agnostic interface.
 */
function wrapDenoWebSocket(socket: WebSocket): WebSocketConnection & { dispatchMessage(data: string): void } {
  const messageHandlers = new Set<(data: string) => void>();

  return {
    send(data: string): void {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    },

    close(code?: number, reason?: string): void {
      socket.close(code, reason);
    },

    get readyState(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' {
      switch (socket.readyState) {
        case WebSocket.CONNECTING:
          return 'CONNECTING';
        case WebSocket.OPEN:
          return 'OPEN';
        case WebSocket.CLOSING:
          return 'CLOSING';
        case WebSocket.CLOSED:
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

    /**
     * Dispatch a raw message to all registered messageHandlers.
     * Called by the outer socket.onmessage to consolidate dispatch.
     */
    dispatchMessage(data: string): void {
      for (const handler of messageHandlers) {
        handler(data);
      }
    },
  };
}

/**
 * Wraps a Deno Request in our runtime-agnostic HttpRequest interface.
 */
function wrapDenoRequest(req: Request): HttpRequest {
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
 * Deno adapter for MCPWebBridge.
 * Provides a single-port server using Deno.serve() with WebSocket upgrade.
 *
 * @example
 * ```typescript
 * const bridge = new MCPWebBridgeDeno({
 *   name: 'My App',
 *   description: 'My app',
 *   port: 3001,
 * });
 * ```
 */
export class MCPWebBridgeDeno {
  #core: MCPWebBridge;
  #controller: AbortController;
  #port: number;
  #hostname: string;

  constructor(config: MCPWebBridgeDenoConfig) {
    // biome-ignore lint/suspicious/noExplicitAny: Deno global is runtime-specific
    const Deno = (globalThis as any).Deno;
    const envPort = Deno?.env?.get?.('PORT');
    this.#port = config.port ?? (envPort ? Number(envPort) : 3001);
    this.#hostname = config.hostname ?? '0.0.0.0';
    this.#controller = new AbortController();

    // Create the core with a timer-based scheduler
    const scheduler = new TimerScheduler();
    this.#core = new MCPWebBridge(config, scheduler);
    const handlers = this.#core.getHandlers();

    // Start Deno server
    Deno.serve(
      {
        port: this.#port,
        hostname: this.#hostname,
        signal: this.#controller.signal,
        onListen: ({ port, hostname }: { port: number; hostname: string }) => {
          console.log(`🌉 MCP Web Bridge (Deno) listening on ${hostname}:${port}`);
          console.log(`   WebSocket: ws://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`);
          console.log(`   HTTP/MCP:  http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`);
        },
      },
      async (req: Request): Promise<Response> => {
        const url = new URL(req.url);

        // Handle WebSocket upgrade
        if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
          const sessionId = url.searchParams.get('session');

          if (!sessionId) {
            return new Response('Missing session parameter', { status: 400 });
          }

          const { socket, response } = Deno.upgradeWebSocket(req);
          const wrapped = wrapDenoWebSocket(socket);

          socket.onopen = () => {
            handlers.onWebSocketConnect(sessionId, wrapped, url);
          };

          socket.onmessage = (event: MessageEvent) => {
            const data = typeof event.data === 'string' ? event.data : event.data.toString();
            handlers.onWebSocketMessage(sessionId, wrapped, data);
            wrapped.dispatchMessage(data);
          };

          socket.onclose = () => {
            handlers.onWebSocketClose(sessionId);
          };

          socket.onerror = (error: Event) => {
            console.error(`WebSocket error for session ${sessionId}:`, error);
          };

          return response;
        }

        // Handle regular HTTP requests
        const wrappedReq = wrapDenoRequest(req);
        const httpResponse = await handlers.onHttpRequest(wrappedReq);

        // Check if this is an SSE response
        if (isSSEResponse(httpResponse)) {
          // Create a ReadableStream for SSE
          const stream = new ReadableStream({
            start(controller) {
              // Create writer function that sends SSE-formatted data
              const writer = (data: string): void => {
                controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
              };

              // Set up the SSE stream
              httpResponse.setup(writer, () => {
                controller.close();
              });

              // Keep connection alive with periodic comments
              const keepAlive = setInterval(() => {
                try {
                  controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
                } catch {
                  clearInterval(keepAlive);
                }
              }, 30000);
            },
          });

          return new Response(stream, {
            status: httpResponse.status,
            headers: httpResponse.headers,
          });
        }

        return new Response(httpResponse.body, {
          status: httpResponse.status,
          headers: httpResponse.headers,
        });
      }
    );
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
    // Abort the server
    this.#controller.abort();

    // Close the core (cleans up sessions, timers)
    await this.#core.close();
  }
}
