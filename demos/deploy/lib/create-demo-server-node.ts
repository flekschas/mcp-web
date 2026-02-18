/**
 * Creates a combined server for MCP-Web demos on Node.js (for Render, Railway, etc.).
 * Handles WebSocket connections, MCP HTTP requests, and static file serving.
 *
 * This is the Node.js equivalent of create-demo-server.ts (which targets Deno Deploy).
 */

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';
import { WebSocket, WebSocketServer } from 'ws';
import { MCPWebBridge, TimerScheduler } from '@mcp-web/bridge';
import type {
  HttpRequest,
  WebSocketConnection,
} from '@mcp-web/bridge';

// isSSEResponse is not re-exported from the main barrel, so we import
// directly from the runtime types. esbuild will resolve this at bundle time.
import { isSSEResponse } from '../../../packages/bridge/src/runtime/types.js';

import type { MCPWebConfig } from '@mcp-web/types';

export interface DemoServerConfig {
  /** MCP bridge configuration */
  bridge: MCPWebConfig;

  /** Path to static files directory (relative to the entry point) */
  staticDir: string;

  /** Optional custom request handler (called before static serving) */
  customHandler?: (
    req: IncomingMessage,
    res: ServerResponse,
  ) => Promise<boolean>;

  /** Port (defaults to PORT env var or 8000) */
  port?: number;
}

/**
 * Wraps a ws WebSocket in the runtime-agnostic interface expected by bridge handlers.
 */
function wrapWebSocket(ws: WebSocket): WebSocketConnection & {
  dispatchMessage(data: string): void;
} {
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
      switch (ws.readyState) {
        case WebSocket.CONNECTING:
          return 'CONNECTING';
        case WebSocket.OPEN:
          return 'OPEN';
        case WebSocket.CLOSING:
          return 'CLOSING';
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
    dispatchMessage(data: string): void {
      for (const handler of messageHandlers) {
        handler(data);
      }
    },
  };
}

/**
 * Wraps a Node.js IncomingMessage in the runtime-agnostic interface
 * expected by bridge handlers.
 */
function wrapRequest(req: IncomingMessage, body: string): HttpRequest {
  const host = req.headers.host || 'localhost';
  return {
    method: req.method || 'GET',
    url: `http://${host}${req.url || '/'}`,
    headers: {
      get(name: string): string | null {
        const value = req.headers[name.toLowerCase()];
        if (Array.isArray(value)) return value[0] || null;
        return value || null;
      },
    },
    text(): Promise<string> {
      return Promise.resolve(body);
    },
  };
}

/**
 * Collects the request body from an IncomingMessage.
 */
function collectBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/**
 * Sends a JSON response.
 */
function sendJson(
  res: ServerResponse,
  status: number,
  data: unknown,
  extraHeaders?: Record<string, string>,
): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    ...extraHeaders,
  });
  res.end(body);
}

export function createDemoServerNode(
  config: DemoServerConfig,
  importMetaUrl?: string,
) {
  const port = config.port ?? (Number(process.env.PORT) || 8000);
  const hostname = '0.0.0.0';

  // Resolve staticDir to an absolute path.
  // If importMetaUrl is provided, resolve relative to that file.
  // Otherwise, resolve relative to cwd.
  let absoluteStaticDir: string;
  if (importMetaUrl) {
    const callerDir = dirname(fileURLToPath(importMetaUrl));
    absoluteStaticDir = join(callerDir, config.staticDir);
  } else {
    absoluteStaticDir = join(process.cwd(), config.staticDir);
  }

  // Create the bridge core with timer-based scheduler
  const scheduler = new TimerScheduler();
  const bridge = new MCPWebBridge(config.bridge, scheduler);
  const handlers = bridge.getHandlers();

  // Set up sirv for static file serving with SPA fallback
  const serve = sirv(absoluteStaticDir, {
    single: true, // SPA fallback: serves index.html for unmatched routes
    gzip: true,
    etag: true,
    setHeaders(res) {
      res.setHeader('access-control-allow-origin', '*');
    },
  });

  console.log(`Starting ${config.bridge.name}...`);

  const server = createServer(async (req, res) => {
    const url = new URL(
      req.url || '/',
      `http://${req.headers.host || 'localhost'}`,
    );

    // 1. Health check endpoint
    if (url.pathname === '/health') {
      sendJson(res, 200, {
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 2. Config endpoint (returns public bridge config)
    if (url.pathname === '/config') {
      const { name, description, version } = bridge.config;
      sendJson(res, 200, { name, description, version });
      return;
    }

    // 3. MCP HTTP requests (identified by characteristics, not path prefix)
    //    - POST: JSON-RPC requests (tools/list, tools/call, initialize, etc.)
    //    - DELETE: MCP session termination
    //    - OPTIONS: CORS preflight
    //    - GET with Accept: text/event-stream: SSE stream
    //    - GET with Accept: application/json: Server info
    const method = req.method || 'GET';
    const acceptHeader = req.headers.accept || '';
    const isMcpRequest =
      method === 'POST' ||
      method === 'DELETE' ||
      method === 'OPTIONS' ||
      (method === 'GET' && acceptHeader.includes('text/event-stream')) ||
      (method === 'GET' && acceptHeader.includes('application/json'));

    if (isMcpRequest || url.pathname.startsWith('/query')) {
      const body = await collectBody(req);
      const wrappedReq = wrapRequest(req, body);
      const httpResponse = await handlers.onHttpRequest(wrappedReq);

      // Check if this is an SSE response
      if (isSSEResponse(httpResponse)) {
        res.writeHead(httpResponse.status, httpResponse.headers);

        const writer = (data: string): void => {
          res.write(`data: ${data}\n\n`);
        };

        let isOpen = true;
        req.on('close', () => {
          isOpen = false;
        });

        httpResponse.setup(writer, () => {
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
        }, 30_000);

        res.on('close', () => {
          clearInterval(keepAlive);
        });
      } else {
        res.writeHead(httpResponse.status, httpResponse.headers);
        res.end(httpResponse.body);
      }
      return;
    }

    // 4. Custom handler (for agent endpoints, etc.)
    if (config.customHandler) {
      const handled = await config.customHandler(req, res);
      if (handled) return;
    }

    // 5. Serve static files (sirv handles SPA fallback via `single: true`)
    serve(req, res);
  });

  // WebSocket server in noServer mode
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(
      req.url || '/',
      `http://${req.headers.host || 'localhost'}`,
    );
    const sessionId = url.searchParams.get('session');

    if (!sessionId) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      const wrapped = wrapWebSocket(ws);

      if (handlers.onWebSocketConnect(sessionId, wrapped, url)) {
        ws.on('message', (data) => {
          const str = data.toString();
          handlers.onWebSocketMessage(sessionId, wrapped, str);
        });

        ws.on('close', () => {
          handlers.onWebSocketClose(sessionId);
        });

        ws.on('error', (error) => {
          console.error(
            `WebSocket error for session ${sessionId}:`,
            error,
          );
        });
      } else {
        ws.close(1008, 'Connection rejected');
      }
    });
  });

  server.listen(port, hostname, () => {
    const host = hostname === '0.0.0.0' ? 'localhost' : hostname;
    console.log(`Server listening on http://${host}:${port}`);
    console.log(`   WebSocket: ws://${host}:${port}`);
    console.log(`   HTTP/MCP:  http://${host}:${port}`);
    console.log(`   Static files: ${absoluteStaticDir}`);
  });

  return { bridge, server, port };
}
