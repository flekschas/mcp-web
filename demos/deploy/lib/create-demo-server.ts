/**
 * Creates a combined server for MCP-Web demos on Deno Deploy.
 * Handles WebSocket connections, MCP HTTP requests, and static file serving.
 */

import { serveDir } from 'https://deno.land/std@0.224.0/http/file_server.ts';
import { MCPWebBridge, TimerScheduler } from 'npm:@mcp-web/bridge@^0.1.0';
import type { MCPWebConfig } from 'npm:@mcp-web/types@^0.1.0';

export interface DemoServerConfig {
  /** MCP bridge configuration */
  bridge: MCPWebConfig;

  /** Path to static files directory */
  staticDir: string;

  /** Optional custom request handler (called before static serving) */
  customHandler?: (req: Request) => Promise<Response | null>;

  /** Port (defaults to PORT env var or 8000) */
  port?: number;
}

/**
 * Wraps a Deno WebSocket in the runtime-agnostic interface expected by bridge handlers.
 */
function wrapWebSocket(socket: WebSocket) {
  const messageHandlers = new Set<(data: string) => void>();

  socket.onmessage = (event) => {
    const data =
      typeof event.data === 'string' ? event.data : event.data.toString();
    for (const handler of messageHandlers) {
      handler(data);
    }
  };

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
}

/**
 * Wraps a Deno Request in the runtime-agnostic interface expected by bridge handlers.
 */
function wrapRequest(req: Request) {
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

export function createDemoServer(config: DemoServerConfig) {
  const port = config.port ?? Number(Deno.env.get('PORT')) ?? 8000;
  const hostname = '0.0.0.0';

  // Create the bridge core with timer-based scheduler
  const scheduler = new TimerScheduler();
  const bridge = new MCPWebBridge(config.bridge, scheduler);
  const handlers = bridge.getHandlers();

  console.log(`🌉 Starting ${config.bridge.name}...`);

  Deno.serve(
    {
      port,
      hostname,
      onListen: ({ port, hostname }) => {
        const host = hostname === '0.0.0.0' ? 'localhost' : hostname;
        console.log(`✅ Server listening on http://${host}:${port}`);
        console.log(`   WebSocket: ws://${host}:${port}`);
        console.log(`   HTTP/MCP:  http://${host}:${port}`);
        console.log(`   Static files: ${config.staticDir}`);
      },
    },
    async (req: Request): Promise<Response> => {
      const url = new URL(req.url);

      // 1. Handle WebSocket upgrade for MCP connections
      if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
        const sessionId = url.searchParams.get('session');

        if (!sessionId) {
          return new Response('Missing session parameter', { status: 400 });
        }

        const { socket, response } = Deno.upgradeWebSocket(req);
        const wrapped = wrapWebSocket(socket);

        socket.onopen = () => {
          handlers.onWebSocketConnect(sessionId, wrapped, url);
        };

        socket.onmessage = (event) => {
          const data =
            typeof event.data === 'string' ? event.data : event.data.toString();
          handlers.onWebSocketMessage(sessionId, wrapped, data);
        };

        socket.onclose = () => {
          handlers.onWebSocketClose(sessionId);
        };

        socket.onerror = (error) => {
          console.error(`WebSocket error for session ${sessionId}:`, error);
        };

        return response;
      }

      // 2. Handle MCP HTTP endpoints (/mcp/*, /health, /config)
      if (
        url.pathname.startsWith('/mcp') ||
        url.pathname === '/health' ||
        url.pathname === '/config'
      ) {
        const wrappedReq = wrapRequest(req);
        const httpResponse = await handlers.onHttpRequest(wrappedReq);

        return new Response(httpResponse.body, {
          status: httpResponse.status,
          headers: httpResponse.headers,
        });
      }

      // 3. Custom handler (for agent endpoints, etc.)
      if (config.customHandler) {
        const customResponse = await config.customHandler(req);
        if (customResponse) return customResponse;
      }

      // 4. Serve static files (SPA fallback)
      try {
        const response = await serveDir(req, {
          fsRoot: config.staticDir,
          showDirListing: false,
          enableCors: true,
        });

        // SPA fallback: serve index.html for 404s on non-file paths
        if (response.status === 404 && !url.pathname.includes('.')) {
          return serveDir(new Request(new URL('/index.html', req.url)), {
            fsRoot: config.staticDir,
            showDirListing: false,
            enableCors: true,
          });
        }

        return response;
      } catch {
        return new Response('Not Found', { status: 404 });
      }
    },
  );

  return { bridge, port };
}
