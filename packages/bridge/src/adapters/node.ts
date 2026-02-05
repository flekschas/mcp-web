/**
 * MCPWebBridgeNode - Node.js adapter for the MCP Web Bridge.
 *
 * Uses a single port for both HTTP and WebSocket connections.
 * WebSocket connections are upgraded from HTTP via the `upgrade` event.
 *
 * @example
 * ```typescript
 * import { MCPWebBridgeNode } from '@mcp-web/bridge';
 *
 * const bridge = new MCPWebBridgeNode({
 *   name: 'My App',
 *   description: 'My awesome app',
 *   port: 3001,
 * });
 *
 * // Bridge is now listening on ws://localhost:3001 and http://localhost:3001
 * ```
 */

import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { WebSocket, WebSocketServer } from 'ws';
import type { MCPWebConfig } from '@mcp-web/types';
import { MCPWebBridge } from '../core.js';
import { TimerScheduler } from '../runtime/scheduler.js';
import type { HttpRequest, WebSocketConnection } from '../runtime/types.js';
import { readyStateToString, isSSEResponse } from '../runtime/types.js';

/**
 * Configuration for the Node.js bridge adapter.
 */
/**
 * SSL/TLS configuration for secure connections.
 */
export interface MCPWebBridgeNodeSSLConfig {
  /** Private key in PEM format (string content, not file path) */
  key: string | Buffer;

  /** Certificate in PEM format (string content, not file path) */
  cert: string | Buffer;
}

/**
 * Configuration for the Node.js bridge adapter.
 */
export interface MCPWebBridgeNodeConfig extends Omit<MCPWebConfig, 'bridgeUrl'> {
  /** Port to listen on (default: 3001) */
  port?: number;

  /** Host to bind to (default: '0.0.0.0') */
  host?: string;

  /**
   * SSL/TLS configuration for HTTPS/WSS support.
   * When provided, the bridge will use secure connections.
   *
   * @example
   * ```typescript
   * import { readFileSync } from 'node:fs';
   *
   * const bridge = new MCPWebBridgeNode({
   *   name: 'My App',
   *   port: 3001,
   *   ssl: {
   *     key: readFileSync('./localhost-key.pem'),
   *     cert: readFileSync('./localhost.pem'),
   *   },
   * });
   * ```
   */
  ssl?: MCPWebBridgeNodeSSLConfig;
}

/**
 * Wraps a Node.js ws WebSocket in our runtime-agnostic interface.
 */
function wrapWebSocket(ws: WebSocket): WebSocketConnection {
  const messageHandlers = new Set<(data: string) => void>();

  ws.on('message', (data) => {
    const str = data.toString();
    for (const handler of messageHandlers) {
      handler(str);
    }
  });

  return {
    send(data: string): void {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    },

    close(code?: number, reason?: string): void {
      ws.close(code, reason);
    },

    get readyState(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' {
      return readyStateToString(ws.readyState);
    },

    onMessage(handler: (data: string) => void): void {
      messageHandlers.add(handler);
    },

    offMessage(handler: (data: string) => void): void {
      messageHandlers.delete(handler);
    },
  };
}

/**
 * Wraps a Node.js IncomingMessage in our runtime-agnostic HttpRequest interface.
 */
function wrapRequest(req: IncomingMessage, body: string): HttpRequest {
  return {
    method: req.method || 'GET',
    url: `http://${req.headers.host || 'localhost'}${req.url || '/'}`,
    headers: {
      get(name: string): string | null {
        const value = req.headers[name.toLowerCase()];
        if (Array.isArray(value)) {
          return value[0] || null;
        }
        return value || null;
      },
    },
    text(): Promise<string> {
      return Promise.resolve(body);
    },
  };
}

/**
 * Node.js adapter for MCPWebBridge.
 * Provides a single-port server for both WebSocket and HTTP traffic.
 */
export class MCPWebBridgeNode {
  #core: MCPWebBridge;
  #server: Server;
  #wss: WebSocketServer;
  #port: number;
  #host: string;
  #isSecure: boolean;
  #readyPromise: Promise<void>;
  #isReady = false;

  constructor(config: MCPWebBridgeNodeConfig) {
    this.#port = config.port ?? 3001;
    this.#host = config.host ?? '0.0.0.0';
    this.#isSecure = !!config.ssl;

    // Create the core with a timer-based scheduler
    const scheduler = new TimerScheduler();
    this.#core = new MCPWebBridge(config, scheduler);
    const handlers = this.#core.getHandlers();

    // Request handler (shared between HTTP and HTTPS)
    const requestHandler = (req: IncomingMessage, res: ServerResponse) => {
      // Collect body
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        const wrappedReq = wrapRequest(req, body);
        handlers.onHttpRequest(wrappedReq).then((response) => {
          // Check if this is an SSE response
          if (isSSEResponse(response)) {
            // Set headers for SSE
            res.writeHead(response.status, response.headers);

            // Create writer function that sends SSE-formatted data
            const writer = (data: string): void => {
              res.write(`data: ${data}\n\n`);
            };

            // Track if connection is still open
            let isOpen = true;

            // Handle client disconnect
            req.on('close', () => {
              isOpen = false;
            });

            // Set up the SSE stream
            response.setup(writer, () => {
              if (isOpen) {
                res.end();
              }
            });

            // Keep connection alive with periodic comments
            const keepAlive = setInterval(() => {
              if (isOpen) {
                res.write(': keepalive\n\n');
              } else {
                clearInterval(keepAlive);
              }
            }, 30000);

            // Clean up on close
            res.on('close', () => {
              clearInterval(keepAlive);
            });
          } else {
            // Regular HTTP response
            res.writeHead(response.status, response.headers);
            res.end(response.body);
          }
        });
      });
    };

    // Create HTTP or HTTPS server based on SSL config
    if (config.ssl) {
      this.#server = createHttpsServer(
        { key: config.ssl.key, cert: config.ssl.cert },
        requestHandler,
      );
    } else {
      this.#server = createHttpServer(requestHandler);
    }

    // Create WebSocket server without its own port (noServer mode)
    this.#wss = new WebSocketServer({ noServer: true });

    // Handle WebSocket upgrade requests
    this.#server.on('upgrade', (req: IncomingMessage, socket, head) => {
      const urlStr = `http://${req.headers.host || 'localhost'}${req.url || '/'}`;
      const url = new URL(urlStr);
      const sessionId = url.searchParams.get('session');

      if (!sessionId) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      this.#wss.handleUpgrade(req, socket, head, (ws) => {
        const wrapped = wrapWebSocket(ws);

        if (handlers.onWebSocketConnect(sessionId, wrapped, url)) {
          ws.on('message', (data) => {
            handlers.onWebSocketMessage(sessionId, wrapped, data.toString());
          });

          ws.on('close', () => {
            handlers.onWebSocketClose(sessionId);
          });

          ws.on('error', (error) => {
            console.error(`WebSocket error for session ${sessionId}:`, error);
          });
        } else {
          ws.close(1008, 'Connection rejected');
        }
      });
    });

    // Create a promise that resolves when the server is ready or rejects on error
    this.#readyPromise = new Promise<void>((resolve, reject) => {
      // Handle server errors (including EADDRINUSE)
      this.#server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          const displayHost = this.#host === '0.0.0.0' ? 'localhost' : this.#host;
          console.error(`\n❌ Port ${this.#port} is already in use.`);
          console.error(`   Another process is listening on ${displayHost}:${this.#port}`);
          console.error(`\n   To fix this, either:`);
          console.error(`   1. Stop the other process using port ${this.#port}:`);
          console.error(`      lsof -i :${this.#port}  # Find the process`);
          console.error(`      kill <PID>             # Kill it`);
          console.error(`   2. Or use a different port in your bridge config\n`);
        } else {
          console.error(`\n❌ Failed to start bridge server:`, error.message);
        }
        reject(error);
      });

      // Start listening
      this.#server.listen(this.#port, this.#host, () => {
        this.#isReady = true;
        const displayHost = this.#host === '0.0.0.0' ? 'localhost' : this.#host;
        const wsProtocol = this.#isSecure ? 'wss' : 'ws';
        const httpProtocol = this.#isSecure ? 'https' : 'http';
        console.log(`🌉 MCP Web Bridge listening on ${displayHost}:${this.#port}`);
        console.log(`   WebSocket: ${wsProtocol}://${displayHost}:${this.#port}`);
        console.log(`   HTTP/MCP:  ${httpProtocol}://${displayHost}:${this.#port}`);
        resolve();
      });
    });
  }

  /**
   * Returns a promise that resolves when the server is ready to accept connections.
   * Rejects if the server fails to start (e.g., port already in use).
   *
   * @example
   * ```typescript
   * const bridge = new MCPWebBridgeNode({ name: 'My App', port: 3001 });
   * await bridge.ready();
   * console.log('Bridge is ready!');
   * ```
   */
  ready(): Promise<void> {
    return this.#readyPromise;
  }

  /**
   * Whether the server is ready to accept connections.
   */
  get isReady(): boolean {
    return this.#isReady;
  }

  /**
   * Get the underlying MCPWebBridge core instance.
   * Useful for advanced usage or custom integrations.
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
   * Whether the server is using SSL/TLS (HTTPS/WSS).
   */
  get isSecure(): boolean {
    return this.#isSecure;
  }

  /**
   * Gracefully shut down the bridge.
   */
  async close(): Promise<void> {
    // Close the core (cleans up sessions, timers)
    await this.#core.close();

    // Force close all WebSocket connections
    for (const client of this.#wss.clients) {
      client.terminate();
    }

    // Close WebSocket server with timeout
    await Promise.race([
      new Promise<void>((resolve) => {
        this.#wss.close(() => resolve());
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 1000)),
    ]);

    // Close HTTP server with timeout
    await Promise.race([
      new Promise<void>((resolve) => {
        this.#server.close(() => resolve());
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 1000)),
    ]);
  }
}

/**
 * For backwards compatibility, also export as Bridge
 * @deprecated Use MCPWebBridgeNode instead
 */
export const Bridge = MCPWebBridgeNode;
