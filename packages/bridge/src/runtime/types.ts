/**
 * Runtime-agnostic types for the MCP Web Bridge.
 * These interfaces allow the bridge core to work with any JavaScript runtime
 * (Node.js, Deno, Bun, Cloudflare Workers/PartyKit).
 */

/**
 * Runtime-agnostic WebSocket connection.
 * Wraps the native WebSocket implementation of each runtime.
 */
export interface WebSocketConnection {
  /** Send a string message to the client */
  send(data: string): void;

  /** Close the connection */
  close(code?: number, reason?: string): void;

  /** Current connection state */
  readonly readyState: 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';

  /** Add a message handler */
  onMessage(handler: (data: string) => void): void;

  /** Remove a message handler */
  offMessage(handler: (data: string) => void): void;
}

/**
 * Runtime-agnostic HTTP request.
 * Abstracts differences between Node.js IncomingMessage, Deno Request, etc.
 */
export interface HttpRequest {
  /** HTTP method (GET, POST, PUT, etc.) */
  readonly method: string;

  /** Full URL string */
  readonly url: string;

  /** Request headers */
  readonly headers: {
    get(name: string): string | null;
  };

  /** Get the request body as text */
  text(): Promise<string>;
}

/**
 * Runtime-agnostic HTTP response.
 * Used to construct responses that adapters convert to native format.
 */
export interface HttpResponse {
  /** HTTP status code */
  status: number;

  /** Response headers */
  headers: Record<string, string>;

  /** Response body */
  body: string;
}

/**
 * Handlers that the bridge core provides to adapters.
 * Adapters wire these up to their runtime's native APIs.
 */
export interface BridgeHandlers {
  /**
   * Called when a WebSocket connection is established.
   * @param sessionId - The session ID from the URL query parameter
   * @param ws - The wrapped WebSocket connection
   * @param url - The parsed connection URL
   * @returns true if the connection should be accepted
   */
  onWebSocketConnect(sessionId: string, ws: WebSocketConnection, url: URL): boolean;

  /**
   * Called when a WebSocket message is received.
   * @param sessionId - The session ID
   * @param ws - The wrapped WebSocket connection
   * @param data - The message data as a string
   */
  onWebSocketMessage(sessionId: string, ws: WebSocketConnection, data: string): void;

  /**
   * Called when a WebSocket connection closes.
   * @param sessionId - The session ID
   */
  onWebSocketClose(sessionId: string): void;

  /**
   * Called for HTTP requests (MCP JSON-RPC, query endpoints, etc.)
   * @param req - The wrapped HTTP request
   * @returns The response to send
   */
  onHttpRequest(req: HttpRequest): Promise<HttpResponse>;
}

/**
 * Configuration for bridge adapters.
 * Extends the base MCPWebConfig with adapter-specific options.
 */
export interface BridgeAdapterConfig {
  /** Port to listen on (single port for both HTTP and WebSocket) */
  port?: number;

  /** Host to bind to */
  host?: string;
}

/**
 * Helper to create an HttpResponse
 */
export function createHttpResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): HttpResponse {
  const isJson = typeof body === 'object';
  return {
    status,
    headers: {
      'Content-Type': isJson ? 'application/json' : 'text/plain',
      ...headers,
    },
    body: isJson ? JSON.stringify(body) : String(body),
  };
}

/**
 * Helper to create a JSON response
 */
export function jsonResponse(status: number, data: unknown): HttpResponse {
  return createHttpResponse(status, data, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
}

/**
 * WebSocket ready state constants (matching the WebSocket API)
 */
export const WebSocketReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

/**
 * Convert numeric ready state to string
 */
export function readyStateToString(
  state: number
): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' {
  switch (state) {
    case 0:
      return 'CONNECTING';
    case 1:
      return 'OPEN';
    case 2:
      return 'CLOSING';
    case 3:
      return 'CLOSED';
    default:
      return 'CLOSED';
  }
}
