/**
 * @fileoverview MCPWebBridge - Runtime-agnostic core for the MCP Web Bridge.
 *
 * This module provides the core bridge functionality that connects web frontends
 * to AI agents via the Model Context Protocol (MCP). The bridge acts as an
 * intermediary, handling WebSocket connections from frontends and HTTP requests
 * from MCP clients.
 * @module @mcp-web/bridge
 */

import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import {
  type AvailableSession,
  type ErroredListPromptsResult,
  type ErroredListResourcesResult,
  type ErroredListToolsResult,
  type FatalError,
  InternalErrorCode,
  InvalidSessionErrorCode,
  type MCPWebConfig,
  type MCPWebConfigOutput,
  McpWebConfigSchema,
  MissingAuthenticationErrorCode,
  NoSessionsFoundErrorCode,
  QueryAcceptedMessageSchema,
  type QueryCancelMessage,
  QueryCancelMessageSchema,
  QueryCompleteBridgeMessageSchema,
  QueryCompleteClientMessageSchema,
  QueryFailureMessageSchema,
  QueryLimitExceededErrorCode,
  type QueryMessage,
  QueryMessageSchema,
  QueryNotActiveErrorCode,
  QueryNotFoundErrorCode,
  QueryProgressMessageSchema,
  type ResourceMetadata,
  SessionExpiredErrorCode,
  SessionLimitExceededErrorCode,
  SessionNameAlreadyInUseErrorCode,
  SessionNotFoundErrorCode,
  SessionNotSpecifiedErrorCode,
  type ToolMetadata,
  ToolNameRequiredErrorCode,
  ToolNotAllowedErrorCode,
  ToolNotFoundErrorCode,
  UnknownMethodErrorCode,
} from '@mcp-web/types';
import type {
  ListPromptsResult,
  ListResourcesResult,
  ListToolsResult,
  Resource,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import type { Scheduler } from './runtime/scheduler.js';
import { NoopScheduler } from './runtime/scheduler.js';
import type {
  BridgeHandlers,
  HttpRequest,
  HttpResponse,
  SSEResponse,
  SSEWriter,
  WebSocketConnection,
} from './runtime/types.js';
import { jsonResponse, sseResponse } from './runtime/types.js';

const SessionNotSpecifiedErrorDetails =
  'Multiple sessions available. See `available_sessions` or call the `list_sessions` tool to discover available sessions and specify the session using `_meta.sessionId`.';

// ============================================
// Internal Types
// ============================================

interface AuthenticateMessage {
  type: 'authenticate';
  sessionId: string;
  authToken: string;
  origin: string;
  pageTitle?: string;
  sessionName?: string;
  userAgent?: string;
  timestamp: number;
}

interface RegisterToolMessage {
  type: 'register-tool';
  tool: {
    name: string;
    description: string;
    inputSchema?: z.core.JSONSchema.JSONSchema;
    outputSchema?: z.core.JSONSchema.JSONSchema;
    _meta?: Record<string, unknown>;
  };
}

interface RegisterResourceMessage {
  type: 'register-resource';
  resource: {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
  };
}

interface ResourceReadMessage {
  type: 'resource-read';
  requestId: string;
  uri: string;
}

interface ResourceResponseMessage {
  type: 'resource-response';
  requestId: string;
  content?: string;
  blob?: string;
  mimeType: string;
  error?: string;
}

interface ActivityMessage {
  type: 'activity';
  timestamp: number;
}

interface ToolCallMessage {
  type: 'tool-call';
  requestId: string;
  toolName: string;
  toolInput?: Record<string, unknown>;
  queryId?: string;
}

interface ToolResponseMessage {
  type: 'tool-response';
  requestId: string;
  result: unknown;
}

type FrontendMessage =
  | AuthenticateMessage
  | RegisterToolMessage
  | RegisterResourceMessage
  | ActivityMessage
  | ToolResponseMessage
  | ResourceResponseMessage
  | QueryMessage
  | QueryCancelMessage;

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: z.core.JSONSchema.JSONSchema;
  outputSchema?: z.core.JSONSchema.JSONSchema;
  handler?: string;
  _meta?: Record<string, unknown>;
}

interface SessionData {
  ws: WebSocketConnection;
  authToken: string;
  origin: string;
  pageTitle?: string;
  sessionName?: string;
  userAgent?: string;
  connectedAt: number;
  lastActivity: number;
  tools: Map<string, ToolDefinition>;
  resources: Map<string, ResourceMetadata>;
}

interface TrackedToolCall {
  tool: string;
  arguments: unknown;
  result: unknown;
}

type QueryState = 'active' | 'completed' | 'failed' | 'cancelled';

interface QueryTracking {
  sessionId: string;
  responseTool?: string;
  toolCalls: TrackedToolCall[];
  ws: WebSocketConnection;
  state: QueryState;
  tools?: ToolMetadata[];
  restrictTools?: boolean;
}

interface McpRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: {
    name?: string;
    uri?: string;
    arguments?: Record<string, unknown>;
    _meta?: {
      sessionId?: string;
      queryId?: string;
    };
  };
}

interface McpResponse {
  jsonrpc: string;
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * MCP protocol session for Remote MCP (Streamable HTTP) connections.
 * Tracks Claude Desktop connections and enables server-initiated notifications.
 */
interface McpSession {
  /** Unique session identifier (returned in Mcp-Session-Id header) */
  id: string;
  /** Auth token associated with this MCP session */
  authToken?: string;
  /** When the session was created */
  createdAt: number;
  /** Last activity timestamp for idle timeout */
  lastActivity: number;
  /** SSE writer for pushing notifications (if GET stream is open) */
  sseWriter?: SSEWriter;
  /** Cleanup function to call when SSE stream closes */
  sseCleanup?: () => void;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Builds the query URL by appending the UUID to the agent URL.
 * If no protocol is specified, defaults to http://.
 */
const buildQueryUrl = (agentUrl: string, uuid: string): string => {
  // Add http:// if no protocol specified
  const urlWithProtocol = agentUrl.includes('://') ? agentUrl : `http://${agentUrl}`;
  const url = new URL(urlWithProtocol);

  if (url.pathname === '/' || url.pathname === '') {
    url.pathname = '/query';
  }

  if (url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }

  url.pathname = `${url.pathname}/${uuid}`;

  return url.toString();
};

// ============================================
// MCPWebBridge Core Class
// ============================================

/**
 * Core bridge server that connects web frontends to AI agents via MCP.
 *
 * MCPWebBridge manages WebSocket connections from frontends, routes tool calls,
 * handles queries, and exposes an HTTP API for MCP clients. It is runtime-agnostic
 * and delegates I/O operations to adapters.
 *
 * @example Using with Node.js adapter (recommended)
 * ```typescript
 * import { MCPWebBridgeNode } from '@mcp-web/bridge';
 *
 * const bridge = new MCPWebBridgeNode({
 *   name: 'My App Bridge',
 *   description: 'Bridge for my web application',
 * });
 * ```
 *
 * @example Using core class with custom adapter
 * ```typescript
 * import { MCPWebBridge } from '@mcp-web/bridge';
 *
 * const bridge = new MCPWebBridge(config);
 * const handlers = bridge.getHandlers();
 * // Wire handlers to your runtime's WebSocket/HTTP servers
 * ```
 */
export class MCPWebBridge {
  #sessions = new Map<string, SessionData>();
  #queries = new Map<string, QueryTracking>();
  #config: MCPWebConfigOutput;
  #scheduler: Scheduler;

  // Session & Query limit tracking
  #tokenSessionIds = new Map<string, Set<string>>();
  #tokenQueryCounts = new Map<string, number>();
  #sessionTimeoutIntervalId?: string;

  // Message handlers for tool responses (keyed by requestId)
  #toolResponseHandlers = new Map<string, (data: string) => void>();
  // Message handlers for resource responses (keyed by requestId)
  #resourceResponseHandlers = new Map<string, (data: string) => void>();

  // MCP protocol sessions (Remote MCP / Streamable HTTP)
  #mcpSessions = new Map<string, McpSession>();
  #mcpSessionTimeoutIntervalId?: string;
  static readonly MCP_SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

  // Resolved icon (data URI), populated asynchronously if icon is a URL
  #resolvedIcon: string | undefined;
  #iconReady: Promise<void>;

  /**
   * Creates a new MCPWebBridge instance.
   *
   * @param config - Bridge configuration options
   * @param scheduler - Optional scheduler for timing operations (used for testing)
   * @throws {Error} If configuration validation fails
   */
  constructor(config: MCPWebConfig, scheduler?: Scheduler) {
    const parsedConfig = McpWebConfigSchema.safeParse(config);
    if (!parsedConfig.success) {
      throw new Error(
        `Invalid bridge server configuration: ${parsedConfig.error.message}`
      );
    }

    this.#config = parsedConfig.data;
    this.#scheduler = scheduler ?? new NoopScheduler();

    // Resolve icon: if it's a URL, fetch and convert to base64 data URI
    this.#iconReady = this.#resolveIcon();

    // Start session timeout checker if configured
    if (this.#config.sessionMaxDurationMs) {
      this.#startSessionTimeoutChecker();
    }

    // Start MCP session idle timeout checker
    this.#startMcpSessionTimeoutChecker();
  }

  /**
   * The validated bridge configuration.
   * @returns The complete configuration object with defaults applied
   */
  get config(): MCPWebConfigOutput {
    return this.#config;
  }

  /**
   * Returns handlers for wiring to runtime-specific I/O.
   *
   * Use these handlers to connect the bridge to your runtime's WebSocket
   * and HTTP servers. Pre-built adapters (Node, Bun, Deno, PartyKit) handle
   * this automatically.
   *
   * @returns Object containing WebSocket and HTTP handlers
   */
  getHandlers(): BridgeHandlers {
    return {
      onWebSocketConnect: (sessionId, ws, url) =>
        this.#handleWebSocketConnect(sessionId, ws, url),
      onWebSocketMessage: (sessionId, ws, data) =>
        this.#handleWebSocketMessage(sessionId, ws, data),
      onWebSocketClose: (sessionId) => this.#handleWebSocketClose(sessionId),
      onHttpRequest: (req) => this.#handleHttpRequest(req),
    };
  }

  /**
   * Gracefully shuts down the bridge.
   *
   * Closes all WebSocket connections, cancels scheduled tasks, and clears
   * all internal state. Call this when shutting down your server.
   *
   * @returns Promise that resolves when shutdown is complete
   */
  async close(): Promise<void> {
    // Stop session timeout checker
    if (this.#sessionTimeoutIntervalId) {
      this.#scheduler.cancelInterval(this.#sessionTimeoutIntervalId);
      this.#sessionTimeoutIntervalId = undefined;
    }

    // Stop MCP session timeout checker
    if (this.#mcpSessionTimeoutIntervalId) {
      this.#scheduler.cancelInterval(this.#mcpSessionTimeoutIntervalId);
      this.#mcpSessionTimeoutIntervalId = undefined;
    }

    // Close all WebSocket connections
    for (const session of this.#sessions.values()) {
      if (session.ws.readyState === 'OPEN') {
        session.ws.close(1000, 'Server shutting down');
      }
    }
    this.#sessions.clear();

    // Clean up MCP sessions (close SSE streams)
    for (const mcpSession of this.#mcpSessions.values()) {
      if (mcpSession.sseCleanup) {
        mcpSession.sseCleanup();
      }
    }
    this.#mcpSessions.clear();

    // Clear queries and tracking maps
    this.#queries.clear();
    this.#tokenSessionIds.clear();
    this.#tokenQueryCounts.clear();
    this.#toolResponseHandlers.clear();

    // Dispose scheduler
    this.#scheduler.dispose();
  }

  // ============================================
  // WebSocket Handlers
  // ============================================

  #handleWebSocketConnect(
    _sessionId: string,
    _ws: WebSocketConnection,
    url: URL
  ): boolean {
    const session = url.searchParams.get('session');
    if (!session) {
      return false;
    }
    return true;
  }

  #handleWebSocketMessage(
    sessionId: string,
    ws: WebSocketConnection,
    data: string
  ): void {
    try {
      const message = JSON.parse(data) as FrontendMessage;

      // Check if this is a tool response
      if (message.type === 'tool-response') {
        const handler = this.#toolResponseHandlers.get(
          (message as ToolResponseMessage).requestId
        );
        if (handler) {
          handler(data);
          return;
        }
      }

      // Check if this is a resource response
      if (message.type === 'resource-response') {
        const handler = this.#resourceResponseHandlers.get(
          (message as ResourceResponseMessage).requestId
        );
        if (handler) {
          handler(data);
          return;
        }
      }

      this.#handleFrontendMessage(sessionId, message, ws);
    } catch (error) {
      console.error('Invalid JSON message:', error);
      ws.close(1003, 'Invalid JSON');
    }
  }

  #handleWebSocketClose(sessionId: string): void {
    this.#cleanupSession(sessionId);
  }

  // ============================================
  // Frontend Message Handling
  // ============================================

  #handleFrontendMessage(
    sessionId: string,
    message: FrontendMessage,
    ws: WebSocketConnection
  ): void {
    switch (message.type) {
      case 'authenticate':
        this.#handleAuthentication(sessionId, message, ws);
        break;
      case 'register-tool':
        this.#handleToolRegistration(sessionId, message);
        break;
      case 'register-resource':
        this.#handleResourceRegistration(sessionId, message);
        break;
      case 'activity':
        this.#handleActivity(sessionId, message);
        break;
      case 'tool-response':
        // Handled by per-request listeners
        break;
      case 'resource-response':
        // Handled by per-request listeners
        break;
      case 'query':
        this.#handleQuery(sessionId, message, ws);
        break;
      case 'query_cancel':
        this.#handleQueryCancel(message);
        break;
      default:
        console.warn(`Unknown message type: ${(message as { type: string }).type}`);
    }
  }

  #handleAuthentication(
    sessionId: string,
    message: AuthenticateMessage,
    ws: WebSocketConnection
  ): void {
    const { authToken } = message;

    // Check session limit
    if (this.#config.maxSessionsPerToken) {
      const existingSessions = this.#tokenSessionIds.get(authToken);
      const currentCount = existingSessions?.size ?? 0;

      if (currentCount >= this.#config.maxSessionsPerToken) {
        if (this.#config.onSessionLimitExceeded === 'close_oldest') {
          this.#closeOldestSessionForToken(authToken);
        } else {
          ws.send(
            JSON.stringify({
              type: 'authentication-failed',
              error: 'Session limit exceeded',
              code: SessionLimitExceededErrorCode,
            })
          );
          ws.close(1008, 'Session limit exceeded');
          return;
        }
      }
    }

    // Check for duplicate session name
    if (message.sessionName) {
      const existingSessionIds = this.#tokenSessionIds.get(authToken);
      if (existingSessionIds) {
        for (const existingId of existingSessionIds) {
          const existingSession = this.#sessions.get(existingId);
          if (existingSession?.sessionName === message.sessionName) {
            ws.send(
              JSON.stringify({
                type: 'authentication-failed',
                error: `Session name "${message.sessionName}" is already in use`,
                code: SessionNameAlreadyInUseErrorCode,
              })
            );
            ws.close(1008, 'Session name already in use');
            return;
          }
        }
      }
    }

    const sessionData: SessionData = {
      ws,
      authToken: message.authToken,
      origin: message.origin,
      pageTitle: message.pageTitle,
      sessionName: message.sessionName,
      userAgent: message.userAgent,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      tools: new Map(),
      resources: new Map(),
    };

    this.#sessions.set(sessionId, sessionData);

    // Track session for this token
    const sessionIds = this.#tokenSessionIds.get(authToken) ?? new Set();
    sessionIds.add(sessionId);
    this.#tokenSessionIds.set(authToken, sessionIds);

    ws.send(
      JSON.stringify({
        type: 'authenticated',
        sessionId,
        success: true,
      })
    );
  }

  #handleToolRegistration(
    sessionId: string,
    message: RegisterToolMessage
  ): void {
    const session = this.#sessions.get(sessionId);
    if (!session) {
      console.warn(`Tool registration for unknown session: ${sessionId}`);
      return;
    }

    console.log('registering tool for session', sessionId, message);
    session.tools.set(message.tool.name, message.tool);

    // Notify connected MCP clients (Claude Desktop) about tool changes
    this.#notifyToolsChanged(session.authToken);
  }

  #handleResourceRegistration(
    sessionId: string,
    message: RegisterResourceMessage
  ): void {
    const session = this.#sessions.get(sessionId);
    if (!session) {
      console.warn(`Resource registration for unknown session: ${sessionId}`);
      return;
    }

    console.log('registering resource for session', sessionId, message);
    session.resources.set(message.resource.uri, message.resource);
  }

  #handleActivity(sessionId: string, message: ActivityMessage): void {
    const session = this.#sessions.get(sessionId);
    if (session) {
      session.lastActivity = message.timestamp;
    }
  }

  async #handleQueryCancel(message: QueryCancelMessage): Promise<void> {
    const cancelMessage = QueryCancelMessageSchema.parse(message);
    const { uuid } = cancelMessage;
    const query = this.#queries.get(uuid);

    if (!query) {
      console.warn(`Cancel requested for unknown query: ${uuid}`);
      return;
    }

    query.state = 'cancelled';

    if (this.#config.agentUrl) {
      try {
        await fetch(buildQueryUrl(this.#config.agentUrl, uuid), {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.debug(
          `Failed to notify agent of query deletion (optional): ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    this.#decrementQueryCountForQuery(query);
    this.#queries.delete(uuid);
  }

  async #handleQuery(
    sessionId: string,
    message: QueryMessage,
    ws: WebSocketConnection
  ): Promise<void> {
    const { uuid, responseTool, tools, restrictTools } = message;

    if (!this.#config.agentUrl) {
      ws.send(
        JSON.stringify(
          QueryFailureMessageSchema.parse({
            uuid,
            error: 'Missing Agent URL',
          })
        )
      );
      return;
    }

    const session = this.#sessions.get(sessionId);
    if (!session) {
      ws.send(
        JSON.stringify(
          QueryFailureMessageSchema.parse({
            uuid,
            error: 'Session not found',
          })
        )
      );
      return;
    }

    // Check query limit
    if (this.#config.maxInFlightQueriesPerToken) {
      const currentQueries =
        this.#tokenQueryCounts.get(session.authToken) ?? 0;

      if (currentQueries >= this.#config.maxInFlightQueriesPerToken) {
        ws.send(
          JSON.stringify(
            QueryFailureMessageSchema.parse({
              uuid,
              error: 'Query limit exceeded. Wait for existing queries to complete.',
              code: QueryLimitExceededErrorCode,
            })
          )
        );
        return;
      }
    }

    // Increment query count
    this.#tokenQueryCounts.set(
      session.authToken,
      (this.#tokenQueryCounts.get(session.authToken) ?? 0) + 1
    );

    try {
      this.#queries.set(uuid, {
        sessionId,
        responseTool: responseTool?.name,
        toolCalls: [],
        ws,
        state: 'active',
        tools,
        restrictTools,
      });

      const response = await fetch(
        buildQueryUrl(this.#config.agentUrl, uuid),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(this.#config.authToken && {
              Authorization: `Bearer ${this.#config.authToken}`,
            }),
          },
          body: JSON.stringify(QueryMessageSchema.parse(message)),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Agent responded with ${response.status}: ${response.statusText}`
        );
      }

      ws.send(JSON.stringify(QueryAcceptedMessageSchema.parse({ uuid })));
    } catch (error) {
      console.error(`Error forwarding query ${uuid}:`, error);
      this.#queries.delete(uuid);
      this.#decrementQueryCount(session.authToken);
      ws.send(
        JSON.stringify(
          QueryFailureMessageSchema.parse({
            uuid,
            error: `${error instanceof Error ? error.message : String(error)}`,
          })
        )
      );
    }
  }

  // ============================================
  // HTTP Request Handling
  // ============================================

  async #handleHttpRequest(req: HttpRequest): Promise<HttpResponse | SSEResponse> {
    const startTime = Date.now();

    // Debug logging helper
    const debug = (message: string, data?: unknown) => {
      if (this.#config.debug) {
        if (data !== undefined) {
          console.log(`[MCP Debug] ${message}`, data);
        } else {
          console.log(`[MCP Debug] ${message}`);
        }
      }
    };

    debug(`→ ${req.method} ${req.url}`);
    debug(`  Headers:`, {
      accept: req.headers.get('accept'),
      contentType: req.headers.get('content-type'),
      authorization: req.headers.get('authorization') ? '[PRESENT]' : '[ABSENT]',
      mcpSessionId: req.headers.get('mcp-session-id'),
    });

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      debug(`← 200 (CORS preflight)`);
      return jsonResponse(200, '');
    }

    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    // Route query endpoints
    const queryProgressMatch = pathname.match(/^\/query\/([^/]+)\/progress$/);
    const queryCompleteMatch = pathname.match(/^\/query\/([^/]+)\/complete$/);
    const queryFailMatch = pathname.match(/^\/query\/([^/]+)\/fail$/);
    const queryCancelMatch = pathname.match(/^\/query\/([^/]+)\/cancel$/);

    if (req.method === 'POST' && queryProgressMatch) {
      return this.#handleQueryProgressEndpoint(queryProgressMatch[1], req);
    }

    if (req.method === 'PUT' && queryCompleteMatch) {
      return this.#handleQueryCompleteEndpoint(queryCompleteMatch[1], req);
    }

    if (req.method === 'PUT' && queryFailMatch) {
      return this.#handleQueryFailEndpoint(queryFailMatch[1], req);
    }

    if (req.method === 'PUT' && queryCancelMatch) {
      return this.#handleQueryCancelEndpoint(queryCancelMatch[1], req);
    }

    // Handle MCP session deletion (client closing session)
    if (req.method === 'DELETE') {
      const mcpSessionId = req.headers.get('mcp-session-id');
      if (mcpSessionId) {
        debug(`  Processing DELETE for session ${mcpSessionId}`);
        const response = this.#handleMcpSessionDelete(mcpSessionId);
        debug(`← ${response.status} (session delete) [${Date.now() - startTime}ms]`);
        return response;
      }
      debug(`← 400 (missing Mcp-Session-Id) [${Date.now() - startTime}ms]`);
      return jsonResponse(400, { error: 'Mcp-Session-Id header required' });
    }

    // Handle GET requests for SSE stream (Remote MCP server-initiated messages)
    if (req.method === 'GET') {
      const acceptsSSE = req.headers.get('accept')?.includes('text/event-stream');
      if (acceptsSSE) {
        debug(`  Opening SSE stream`);
        return this.#handleSSEStream(req);
      }

      // Plain GET returns server info (no auth required)
      debug(`← 200 (server info) [${Date.now() - startTime}ms]`);
      const icon = await this.#getIcon();
      return jsonResponse(200, {
        name: this.#config.name,
        description: this.#config.description,
        version: this.#getVersion(),
        ...(icon && { icon }),
      });
    }

    // Handle MCP JSON-RPC requests
    if (req.method === 'POST') {
      debug(`  Processing MCP request`);
      const response = await this.#handleMCPRequest(req);
      debug(`← ${response.status} [${Date.now() - startTime}ms]`);
      return response;
    }

    debug(`← 404 (not found) [${Date.now() - startTime}ms]`);
    return jsonResponse(404, { error: 'Not Found' });
  }

  async #handleQueryProgressEndpoint(
    uuid: string,
    req: HttpRequest
  ): Promise<HttpResponse> {
    try {
      const body = await req.text();
      const message = JSON.parse(body);
      const progressMessage = QueryProgressMessageSchema.parse({
        uuid,
        ...message,
      });

      const query = this.#queries.get(uuid);
      if (!query) {
        return jsonResponse(404, { error: QueryNotFoundErrorCode });
      }

      if (query.ws.readyState === 'OPEN') {
        query.ws.send(JSON.stringify(progressMessage));
      }

      return jsonResponse(200, { success: true });
    } catch (error) {
      console.error('Error handling query progress:', error);
      return jsonResponse(400, { error: 'Invalid request body' });
    }
  }

  async #handleQueryCompleteEndpoint(
    uuid: string,
    req: HttpRequest
  ): Promise<HttpResponse> {
    try {
      const body = await req.text();
      const message = JSON.parse(body);
      const completeMessage = QueryCompleteClientMessageSchema.parse({
        uuid,
        ...message,
      });

      const query = this.#queries.get(uuid);
      if (!query) {
        return jsonResponse(404, { error: QueryNotFoundErrorCode });
      }

      if (query.responseTool) {
        const errorMessage = QueryFailureMessageSchema.parse({
          uuid,
          error: `Query specified responseTool '${query.responseTool}' but agent called queryComplete() instead`,
        });

        if (query.ws.readyState === 'OPEN') {
          query.ws.send(JSON.stringify(errorMessage));
        }

        this.#decrementQueryCountForQuery(query);
        this.#queries.delete(uuid);
        return jsonResponse(400, { error: errorMessage.error });
      }

      query.state = 'completed';

      const bridgeMessage = QueryCompleteBridgeMessageSchema.parse({
        uuid,
        message: completeMessage.message,
        toolCalls: query.toolCalls,
      });

      if (query.ws.readyState === 'OPEN') {
        query.ws.send(JSON.stringify(bridgeMessage));
      }

      this.#decrementQueryCountForQuery(query);
      this.#queries.delete(uuid);
      return jsonResponse(200, { success: true });
    } catch (error) {
      console.error('Error handling query complete:', error);
      return jsonResponse(400, { error: 'Invalid request body' });
    }
  }

  async #handleQueryFailEndpoint(
    uuid: string,
    req: HttpRequest
  ): Promise<HttpResponse> {
    try {
      const body = await req.text();
      const message = JSON.parse(body);
      const failureMessage = QueryFailureMessageSchema.parse({
        uuid,
        ...message,
      });

      const query = this.#queries.get(uuid);
      if (!query) {
        return jsonResponse(404, { error: QueryNotFoundErrorCode });
      }

      query.state = 'failed';

      if (query.ws.readyState === 'OPEN') {
        query.ws.send(JSON.stringify(failureMessage));
      }

      this.#decrementQueryCountForQuery(query);
      this.#queries.delete(uuid);
      return jsonResponse(200, { success: true });
    } catch (error) {
      console.error('Error handling query fail:', error);
      return jsonResponse(400, { error: 'Invalid request body' });
    }
  }

  async #handleQueryCancelEndpoint(
    uuid: string,
    req: HttpRequest
  ): Promise<HttpResponse> {
    try {
      const query = this.#queries.get(uuid);
      if (!query) {
        return jsonResponse(404, { error: QueryNotFoundErrorCode });
      }

      query.state = 'cancelled';

      const body = await req.text();
      const cancellationMessage = QueryCancelMessageSchema.parse({
        uuid,
        reason: body ? JSON.parse(body).reason : undefined,
      });

      if (query.ws.readyState === 'OPEN') {
        query.ws.send(JSON.stringify(cancellationMessage));
      }

      this.#decrementQueryCountForQuery(query);
      this.#queries.delete(uuid);
      return jsonResponse(200, { success: true });
    } catch (error) {
      console.error('Error handling query cancel:', error);
      return jsonResponse(400, { error: 'Invalid request body' });
    }
  }

  // ============================================
  // MCP JSON-RPC Handling
  // ============================================

  async #handleMCPRequest(req: HttpRequest): Promise<HttpResponse> {
    try {
      const body = await req.text();
      const mcpRequest: McpRequest = JSON.parse(body);

      // Debug logging
      if (this.#config.debug) {
        console.log(`[MCP Debug]   Method: ${mcpRequest.method}, ID: ${mcpRequest.id}`);
        if (mcpRequest.params && Object.keys(mcpRequest.params).length > 0) {
          console.log(`[MCP Debug]   Params:`, JSON.stringify(mcpRequest.params).substring(0, 200));
        }
      }

      // Extract auth token from header OR URL query param (for Remote MCP compatibility)
      const authHeader = req.headers.get('authorization');
      const url = new URL(req.url, 'http://localhost');
      const authToken = authHeader?.replace('Bearer ', '') ?? url.searchParams.get('token') ?? undefined;
      const mcpSessionId = req.headers.get('mcp-session-id');
      const queryId = mcpRequest.params?._meta?.queryId;

      // Handle initialize separately - it creates an MCP session
      if (mcpRequest.method === 'initialize') {
        if (!authToken) {
          if (this.#config.debug) {
            console.log(`[MCP Debug]   Error: Missing authentication token`);
          }
          return this.#mcpErrorResponse(
            mcpRequest.id,
            -32600,
            MissingAuthenticationErrorCode
          );
        }
        const { result, sessionId } = await this.#handleInitialize(authToken);
        if (this.#config.debug) {
          console.log(`[MCP Debug]   Created MCP session: ${sessionId}`);
        }
        return this.#mcpSuccessResponseWithHeaders(mcpRequest.id, result, {
          'Mcp-Session-Id': sessionId,
        });
      }

      // Handle initialized notification (no response needed per spec, but we accept it)
      if (mcpRequest.method === 'notifications/initialized') {
        // Update MCP session activity
        if (mcpSessionId) {
          const mcpSession = this.#mcpSessions.get(mcpSessionId);
          if (mcpSession) {
            mcpSession.lastActivity = Date.now();
          }
        }
        return jsonResponse(202, '');
      }

      // For all other requests, validate MCP session if provided
      if (mcpSessionId) {
        const mcpSession = this.#mcpSessions.get(mcpSessionId);
        if (!mcpSession) {
          return jsonResponse(404, { error: 'MCP session not found' });
        }
        mcpSession.lastActivity = Date.now();
      }

      const sessions = new Map<string, SessionData>();

      if (queryId) {
        const query = this.#queries.get(queryId);
        if (!query) {
          return this.#mcpErrorResponse(mcpRequest.id, -32600, QueryNotFoundErrorCode);
        }
        if (query.state !== 'active') {
          return this.#mcpErrorResponse(mcpRequest.id, -32600, QueryNotActiveErrorCode);
        }
        const session = this.#sessions.get(query.sessionId);
        if (!session) {
          return this.#mcpErrorResponse(mcpRequest.id, -32600, InvalidSessionErrorCode);
        }
        sessions.set(query.sessionId, session);
      } else if (authToken) {
        for (const [sessionId, session] of this.#sessions.entries()) {
          if (session.authToken === authToken) {
            sessions.set(sessionId, session);
          }
        }
      } else {
        return this.#mcpErrorResponse(
          mcpRequest.id,
          -32600,
          MissingAuthenticationErrorCode
        );
      }

      if (sessions.size === 0) {
        return this.#mcpErrorResponse(mcpRequest.id, -32600, NoSessionsFoundErrorCode);
      }

      let result: unknown;
      switch (mcpRequest.method) {
        case 'tools/list':
          result = await this.#handleToolsList(sessions, mcpRequest.params);
          break;
        case 'tools/call':
          result = await this.#handleToolCall(sessions, mcpRequest.params);
          result = this.#wrapToolCallResult(result);
          break;
        case 'resources/list':
          result = await this.#handleResourcesList(sessions, mcpRequest.params);
          break;
        case 'resources/read':
          result = await this.#handleResourceRead(sessions, mcpRequest.params);
          break;
        case 'prompts/list':
          result = await this.#handlePromptsList(sessions, mcpRequest.params);
          break;
        default:
          return this.#mcpErrorResponse(mcpRequest.id, -32601, UnknownMethodErrorCode);
      }

      // Check for fatal errors
      if (
        result &&
        typeof result === 'object' &&
        'error_is_fatal' in result &&
        result.error_is_fatal === true
      ) {
        const fatalError = result as FatalError;
        return this.#mcpErrorResponse(
          mcpRequest.id,
          -32602,
          fatalError.error_message,
          fatalError
        );
      }

      return this.#mcpSuccessResponse(mcpRequest.id, result);
    } catch (error) {
      console.error('MCP request error:', error);
      return this.#mcpErrorResponse(0, -32603, InternalErrorCode);
    }
  }

  #mcpSuccessResponse(id: string | number, result: unknown): HttpResponse {
    const response: McpResponse = {
      jsonrpc: '2.0',
      id,
      result,
    };
    return jsonResponse(200, response);
  }

  #mcpSuccessResponseWithHeaders(
    id: string | number,
    result: unknown,
    headers: Record<string, string>
  ): HttpResponse {
    const response: McpResponse = {
      jsonrpc: '2.0',
      id,
      result,
    };
    return {
      status: 200,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(response),
    };
  }

  #mcpErrorResponse(
    id: string | number,
    code: number,
    message: string,
    data?: unknown
  ): HttpResponse {
    const response: McpResponse = {
      jsonrpc: '2.0',
      id,
      error: { code, message, data },
    };
    return jsonResponse(200, response);
  }

  /**
   * Wraps a tool call result in the MCP CallToolResult format.
   * This ensures compatibility with both Remote MCP (direct HTTP) and STDIO clients.
   *
   * If the result object contains a `_meta` field, it is extracted and placed at
   * the top level of the CallToolResult (as required by the MCP protocol), rather
   * than being serialized inside the JSON text content.
   */
  #wrapToolCallResult(result: unknown): {
    content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
    isError?: boolean;
    _meta?: Record<string, unknown>;
  } {
    // Check if this is an error response
    if (result && typeof result === 'object' && 'error' in result) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: true,
      };
    }

    // Handle different result types
    if (typeof result === 'string') {
      // Check if it's a data URL (image)
      if (result.startsWith('data:image/')) {
        const mimeType = result.split(';')[0].split(':')[1];
        // Extract base64 data after the comma
        const base64Data = result.split(',')[1];
        return {
          content: [
            {
              type: 'image',
              data: base64Data,
              mimeType,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    if (result !== null && result !== undefined) {
      // Check if it's an object containing a data URL (e.g., { dataUrl: "data:image/png;base64,..." })
      // This handles tools that return image data wrapped in an object rather than as a raw string.
      if (typeof result === 'object' && 'dataUrl' in result) {
        const dataUrl = (result as Record<string, unknown>).dataUrl;
        if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
          const mimeType = dataUrl.split(';')[0].split(':')[1];
          const base64Data = dataUrl.split(',')[1];
          return {
            content: [
              {
                type: 'image',
                data: base64Data,
                mimeType,
              },
            ],
          };
        }
      }

      // Extract _meta from the result object to place at the top level of CallToolResult.
      // The MCP protocol expects _meta as a top-level field on the result object,
      // not embedded inside the JSON text content (where the host can't find it).
      let topLevelMeta: Record<string, unknown> | undefined;
      let resultToSerialize = result;

      if (typeof result === 'object' && '_meta' in result) {
        const { _meta, ...rest } = result as Record<string, unknown>;
        if (_meta && typeof _meta === 'object') {
          topLevelMeta = _meta as Record<string, unknown>;
        }
        resultToSerialize = rest;
      }

      const wrapped: {
        content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
        _meta?: Record<string, unknown>;
      } = {
        content: [
          {
            type: 'text',
            text: typeof resultToSerialize === 'object' ? JSON.stringify(resultToSerialize, null, 2) : String(resultToSerialize),
          },
        ],
      };

      if (topLevelMeta) {
        wrapped._meta = topLevelMeta;
      }

      return wrapped;
    }

    // null or undefined result
    return {
      content: [
        {
          type: 'text',
          text: '',
        },
      ],
    };
  }

  // ============================================
  // MCP Method Handlers
  // ============================================

  #getVersion(): string {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const packageJsonPath = join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  /**
   * Resolves the icon config value to a data URI.
   * If icon is already a data URI, uses it directly.
   * If icon is an HTTP(S) URL, fetches it and converts to a base64 data URI.
   * Fails gracefully — icon is simply omitted if resolution fails.
   */
  async #resolveIcon(): Promise<void> {
    const icon = this.#config.icon;
    if (!icon) return;

    // Already a data URI — use as-is
    if (icon.startsWith('data:')) {
      this.#resolvedIcon = icon;
      return;
    }

    // HTTP(S) URL — fetch and convert
    if (icon.startsWith('http://') || icon.startsWith('https://')) {
      try {
        const response = await fetch(icon);
        if (!response.ok) {
          console.warn(
            `[MCPWebBridge] Failed to fetch icon from ${icon}: HTTP ${response.status}`
          );
          return;
        }

        const contentType =
          response.headers.get('content-type') || 'image/png';
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        this.#resolvedIcon = `data:${contentType};base64,${base64}`;
      } catch (error) {
        console.warn(
          `[MCPWebBridge] Failed to fetch icon from ${icon}:`,
          error instanceof Error ? error.message : error
        );
      }
      return;
    }

    // Unrecognized format — use as-is (could be a relative URL)
    this.#resolvedIcon = icon;
  }

  /**
   * Returns the resolved icon data URI, waiting for resolution if needed.
   */
  async #getIcon(): Promise<string | undefined> {
    await this.#iconReady;
    return this.#resolvedIcon;
  }

  /**
   * Handles MCP initialize request and creates a new MCP session.
   * Returns the initialize result along with a session ID for the Mcp-Session-Id header.
   */
  async #handleInitialize(authToken: string): Promise<{ result: unknown; sessionId: string }> {
    // Create a new MCP session
    const sessionId = crypto.randomUUID();
    const mcpSession: McpSession = {
      id: sessionId,
      authToken,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    this.#mcpSessions.set(sessionId, mcpSession);

    const icon = await this.#getIcon();
    const result = {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: { listChanged: true },
        resources: {},
        prompts: {},
      },
      serverInfo: {
        name: this.#config.name,
        description: this.#config.description,
        version: this.#getVersion(),
        ...(icon && { icon }),
      },
    };

    return { result, sessionId };
  }

  #getSessionAndSessionId(
    sessions: Map<string, SessionData>,
    sessionId?: string
  ): [string, SessionData] | undefined {
    if (!sessionId) {
      if (sessions.size === 1) {
        sessionId = sessions.keys().next().value;
        if (!sessionId) {
          return undefined;
        }
      } else {
        return undefined;
      }
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return undefined;
    }

    return [sessionId, session];
  }

  #getSessionFromMetaParams(
    sessions: Map<string, SessionData>,
    params?: McpRequest['params']
  ): SessionData | undefined {
    const sessionId = params?._meta?.sessionId as string | undefined;
    return this.#getSessionAndSessionId(sessions, sessionId)?.[1];
  }

  #createSessionNotFoundError(sessions: Map<string, SessionData>): {
    error: string;
    error_message?: string;
    available_sessions?: unknown;
  } {
    if (sessions.size > 1) {
      return {
        error: SessionNotSpecifiedErrorCode,
        error_message: SessionNotSpecifiedErrorDetails,
        available_sessions: this.#listSessions(sessions),
      };
    }
    return { error: SessionNotFoundErrorCode };
  }

  async #handleToolsList(
    sessions: Map<string, SessionData>,
    params?: McpRequest['params']
  ): Promise<ListToolsResult | ErroredListToolsResult | FatalError> {
    const session = this.#getSessionFromMetaParams(sessions, params);

    const listSessionsTool: Tool = {
      name: 'list_sessions',
      description: 'List all browser sessions with their available tools',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    };

    if (!session && sessions.size > 1) {
      return {
        tools: [listSessionsTool],
        isError: true,
        error: SessionNotSpecifiedErrorCode,
        error_message: SessionNotSpecifiedErrorDetails,
        error_is_fatal: false,
        available_sessions: this.#listSessions(sessions),
      } satisfies ErroredListToolsResult;
    }

    if (!session) {
      return {
        error: SessionNotFoundErrorCode,
        error_message: 'No session found for the provided authentication',
        error_is_fatal: true,
      } satisfies FatalError;
    }

    const tools: Tool[] = [listSessionsTool];

    for (const tool of session.tools.values()) {
      const sessionAwareTool: Tool = {
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description:
                'Session ID (optional - will auto-select if only one session active)',
            },
            ...(tool.inputSchema?.properties || {}),
          },
          required: tool.inputSchema?.required || [],
        },
        // Forward _meta (e.g., _meta.ui.resourceUri for MCP Apps)
        ...(tool._meta ? { _meta: tool._meta } : {}),
      };
      tools.push(sessionAwareTool);
    }

    return { tools } satisfies ListToolsResult;
  }

  async #handleToolCall(
    sessions: Map<string, SessionData>,
    params?: McpRequest['params']
  ): Promise<unknown> {
    const { name: toolName, arguments: toolInput, _meta } = params || {};

    if (!toolName) {
      return { error: ToolNameRequiredErrorCode };
    }

    const queryId = _meta?.queryId;

    if (queryId) {
      const query = this.#queries.get(queryId);
      if (!query) {
        return { error: QueryNotFoundErrorCode };
      }
      if (query.state !== 'active') {
        return { error: QueryNotActiveErrorCode };
      }

      if (query.restrictTools && query.tools) {
        const allowed = query.tools.some((t) => t.name === toolName);
        if (!allowed) {
          return {
            error: ToolNotAllowedErrorCode,
            details:
              'The query restricts the allowed tool calls. Use one of `allowed_tools`.',
            allowed_tools: query.tools.map((t) => t.name),
          };
        }
      }
    }

    if (toolName === 'list_sessions') {
      return { sessions: this.#listSessions(sessions) };
    }

    const [sessionId, session] =
      this.#getSessionAndSessionId(
        sessions,
        (toolInput?.session_id as string | undefined) || _meta?.sessionId
      ) || [];

    if (!sessionId || !session) {
      return this.#createSessionNotFoundError(sessions);
    }

    if (!session.tools.has(toolName)) {
      return {
        error: ToolNotFoundErrorCode,
        available_tools: Array.from(session.tools.keys()),
      };
    }

    return this.#forwardToolCallToSession(sessionId, toolName, toolInput, queryId);
  }

  async #handleResourcesList(
    sessions: Map<string, SessionData>,
    params?: McpRequest['params']
  ): Promise<ListResourcesResult | ErroredListResourcesResult | FatalError> {
    const session = this.#getSessionFromMetaParams(sessions, params);

    const sessionListResource: Resource = {
      uri: 'sessions://list',
      name: 'sessions',
      description:
        'List of all active browser sessions for this authentication context',
      mimeType: 'application/json',
    };

    if (!session && sessions.size > 1) {
      return {
        resources: [sessionListResource],
        isError: true,
        error: SessionNotSpecifiedErrorCode,
        error_message: SessionNotSpecifiedErrorDetails,
        error_is_fatal: false,
        available_sessions: this.#listSessions(sessions),
      } satisfies ErroredListResourcesResult;
    }

    if (!session) {
      return {
        error: SessionNotFoundErrorCode,
        error_message: 'No session found for the provided authentication',
        error_is_fatal: true,
      } satisfies FatalError;
    }

    const resources: Resource[] = [sessionListResource];

    // Add frontend-registered resources
    for (const resource of session.resources.values()) {
      resources.push({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType ?? 'text/html',
      });
    }

    return { resources } satisfies ListResourcesResult;
  }

  async #handleResourceRead(
    sessions: Map<string, SessionData>,
    params?: McpRequest['params']
  ): Promise<unknown> {
    const { uri, _meta } = (params as { uri?: string; _meta?: { sessionId?: string } }) || {};

    if (!uri) {
      return { error: 'Resource URI is required' };
    }

    if (uri === 'sessions://list') {
      const sessionData = this.#listSessions(sessions);
      return {
        contents: [
          {
            uri: 'sessions://list',
            mimeType: 'application/json',
            text: JSON.stringify(sessionData, null, 2),
          },
        ],
      };
    }

    // Look for frontend-registered resource
    const [sessionId, session] = this.#getSessionAndSessionId(sessions, _meta?.sessionId) || [];

    if (!sessionId || !session) {
      // If no session specified and multiple sessions, check all sessions for the resource
      for (const [sid, sess] of sessions.entries()) {
        if (sess.resources.has(uri)) {
          return this.#forwardResourceReadToSession(sid, uri);
        }
      }
      return { error: 'Resource not found' };
    }

    if (!session.resources.has(uri)) {
      return { error: 'Resource not found' };
    }

    return this.#forwardResourceReadToSession(sessionId, uri);
  }

  #listSessions(sessions: Map<string, SessionData>): AvailableSession[] {
    return Array.from(sessions.entries()).map(([key, session]) => ({
      session_id: key,
      session_name: session.sessionName,
      origin: session.origin,
      page_title: session.pageTitle,
      connected_at: new Date(session.connectedAt).toISOString(),
      last_activity: new Date(session.lastActivity).toISOString(),
      available_tools: Array.from(session.tools.keys()),
    }));
  }

  async #handlePromptsList(
    sessions: Map<string, SessionData>,
    params?: McpRequest['params']
  ): Promise<ListPromptsResult | ErroredListPromptsResult | FatalError> {
    const session = this.#getSessionFromMetaParams(sessions, params);

    if (!session && sessions.size > 1) {
      return {
        prompts: [],
        isError: true,
        error: SessionNotSpecifiedErrorCode,
        error_message: SessionNotSpecifiedErrorDetails,
        error_is_fatal: false,
        available_sessions: this.#listSessions(sessions),
      } satisfies ErroredListPromptsResult;
    }

    if (!session) {
      return {
        error: SessionNotFoundErrorCode,
        error_message: 'No session found for the provided authentication',
        error_is_fatal: true,
      } satisfies FatalError;
    }

    return { prompts: [] } satisfies ListPromptsResult;
  }

  async #forwardToolCallToSession(
    sessionId: string,
    toolName: string,
    toolInput?: Record<string, unknown>,
    queryId?: string
  ): Promise<unknown> {
    const session = this.#sessions.get(sessionId);
    if (!session || session.ws.readyState !== 'OPEN') {
      return { error: 'Session not available' };
    }

    const requestId = crypto.randomUUID();

    const toolCall: ToolCallMessage = {
      type: 'tool-call',
      requestId,
      toolName,
      toolInput,
      ...(queryId && { queryId }),
    };

    return new Promise((resolve) => {
      let timeoutId: string | undefined;

      const handleResponse = (data: string): void => {
        try {
          const message: ToolResponseMessage = JSON.parse(data);
          if (
            message.type === 'tool-response' &&
            message.requestId === requestId
          ) {
            if (timeoutId) {
              this.#scheduler.cancel(timeoutId);
            }
            this.#toolResponseHandlers.delete(requestId);
            session.ws.offMessage(handleResponse);

            const toolResult = message.result;

            if (queryId) {
              const query = this.#queries.get(queryId);
              if (query) {
                query.toolCalls.push({
                  tool: toolName,
                  arguments: toolInput,
                  result: toolResult,
                });

                if (query.responseTool === toolName) {
                  if (
                    !(
                      toolResult &&
                      typeof toolResult === 'object' &&
                      'error' in toolResult
                    )
                  ) {
                    const bridgeMessage = QueryCompleteBridgeMessageSchema.parse({
                      uuid: queryId,
                      message: undefined,
                      toolCalls: query.toolCalls,
                    });

                    if (query.ws.readyState === 'OPEN') {
                      query.ws.send(JSON.stringify(bridgeMessage));
                    }

                    this.#queries.delete(queryId);
                  }
                }
              }
            }

            resolve(toolResult);
          }
        } catch {
          // Ignore invalid JSON
        }
      };

      // Set up timeout
      timeoutId = this.#scheduler.schedule(() => {
        this.#toolResponseHandlers.delete(requestId);
        session.ws.offMessage(handleResponse);
        resolve({ error: 'Tool call timeout' });
      }, 30000);

      this.#toolResponseHandlers.set(requestId, handleResponse);
      session.ws.onMessage(handleResponse);
      session.ws.send(JSON.stringify(toolCall));
    });
  }

  async #forwardResourceReadToSession(
    sessionId: string,
    uri: string
  ): Promise<unknown> {
    const session = this.#sessions.get(sessionId);
    if (!session || session.ws.readyState !== 'OPEN') {
      return { error: 'Session not available' };
    }

    const requestId = crypto.randomUUID();

    const resourceRead: ResourceReadMessage = {
      type: 'resource-read',
      requestId,
      uri,
    };

    return new Promise((resolve) => {
      let timeoutId: string | undefined;

      const handleResponse = (data: string): void => {
        try {
          const message: ResourceResponseMessage = JSON.parse(data);
          if (
            message.type === 'resource-response' &&
            message.requestId === requestId
          ) {
            if (timeoutId) {
              this.#scheduler.cancel(timeoutId);
            }
            this.#resourceResponseHandlers.delete(requestId);
            session.ws.offMessage(handleResponse);

            if (message.error) {
              resolve({ error: message.error });
              return;
            }

            // Build MCP resource read response
            if (message.blob) {
              // Binary content (base64 encoded)
              resolve({
                contents: [
                  {
                    uri,
                    mimeType: message.mimeType,
                    blob: message.blob,
                  },
                ],
              });
            } else {
              // Text content
              resolve({
                contents: [
                  {
                    uri,
                    mimeType: message.mimeType,
                    text: message.content,
                  },
                ],
              });
            }
          }
        } catch {
          // Ignore invalid JSON
        }
      };

      // Set up timeout
      timeoutId = this.#scheduler.schedule(() => {
        this.#resourceResponseHandlers.delete(requestId);
        session.ws.offMessage(handleResponse);
        resolve({ error: 'Resource read timeout' });
      }, 30000);

      this.#resourceResponseHandlers.set(requestId, handleResponse);
      session.ws.onMessage(handleResponse);
      session.ws.send(JSON.stringify(resourceRead));
    });
  }

  // ============================================
  // Session & Query Limit Helpers
  // ============================================

  #decrementQueryCount(authToken: string): void {
    const count = this.#tokenQueryCounts.get(authToken) ?? 0;
    if (count <= 1) {
      this.#tokenQueryCounts.delete(authToken);
    } else {
      this.#tokenQueryCounts.set(authToken, count - 1);
    }
  }

  #decrementQueryCountForQuery(query: QueryTracking): void {
    const session = this.#sessions.get(query.sessionId);
    if (session) {
      this.#decrementQueryCount(session.authToken);
    }
  }

  #closeOldestSessionForToken(authToken: string): void {
    const sessionIds = this.#tokenSessionIds.get(authToken);
    if (!sessionIds || sessionIds.size === 0) return;

    let oldest: { sessionId: string; connectedAt: number } | null = null;

    for (const sessionId of sessionIds) {
      const session = this.#sessions.get(sessionId);
      if (session && (!oldest || session.connectedAt < oldest.connectedAt)) {
        oldest = { sessionId, connectedAt: session.connectedAt };
      }
    }

    if (oldest) {
      const session = this.#sessions.get(oldest.sessionId);
      if (session) {
        session.ws.send(
          JSON.stringify({
            type: 'session-closed',
            reason: 'Session limit exceeded, closing oldest session',
            code: SessionLimitExceededErrorCode,
          })
        );
        session.ws.close(1008, 'Session limit exceeded');
      }
    }
  }

  #cleanupSession(sessionId: string): void {
    const session = this.#sessions.get(sessionId);
    if (session) {
      const sessionIds = this.#tokenSessionIds.get(session.authToken);
      if (sessionIds) {
        sessionIds.delete(sessionId);
        if (sessionIds.size === 0) {
          this.#tokenSessionIds.delete(session.authToken);
        }
      }

      // Notify connected MCP clients about tool changes (tools removed)
      this.#notifyToolsChanged(session.authToken);
    }
    this.#sessions.delete(sessionId);
  }

  #startSessionTimeoutChecker(): void {
    const maxDuration = this.#config.sessionMaxDurationMs;
    if (!maxDuration) return;

    this.#sessionTimeoutIntervalId = this.#scheduler.scheduleInterval(() => {
      const now = Date.now();
      for (const [_sessionId, session] of this.#sessions) {
        if (now - session.connectedAt > maxDuration) {
          session.ws.send(
            JSON.stringify({
              type: 'session-expired',
              code: SessionExpiredErrorCode,
            })
          );
          session.ws.close(1008, 'Session expired');
        }
      }
    }, 60000);
  }

  // ============================================
  // Remote MCP (Streamable HTTP) Support
  // ============================================

  /**
   * Starts periodic checker to clean up idle MCP sessions.
   * Sessions are removed after MCP_SESSION_IDLE_TIMEOUT_MS of inactivity.
   */
  #startMcpSessionTimeoutChecker(): void {
    // Check every minute
    this.#mcpSessionTimeoutIntervalId = this.#scheduler.scheduleInterval(() => {
      const now = Date.now();
      for (const [sessionId, mcpSession] of this.#mcpSessions) {
        const idleTime = now - mcpSession.lastActivity;
        if (idleTime > MCPWebBridge.MCP_SESSION_IDLE_TIMEOUT_MS) {
          // Clean up SSE stream if open
          if (mcpSession.sseCleanup) {
            mcpSession.sseCleanup();
          }
          this.#mcpSessions.delete(sessionId);
          console.log(`MCP session ${sessionId} expired after ${idleTime}ms of inactivity`);
        }
      }
    }, 60000);
  }

  /**
   * Notifies all connected MCP clients (Claude Desktop) about tool changes.
   * Sends `notifications/tools/list_changed` via SSE to clients with matching auth token.
   */
  #notifyToolsChanged(authToken: string): void {
    for (const mcpSession of this.#mcpSessions.values()) {
      // Only notify sessions with matching auth token
      if (mcpSession.authToken === authToken && mcpSession.sseWriter) {
        const notification = {
          jsonrpc: '2.0',
          method: 'notifications/tools/list_changed',
        };
        mcpSession.sseWriter(JSON.stringify(notification));
      }
    }
  }

  /**
   * Handles GET requests for SSE stream (Remote MCP server-initiated messages).
   * Claude Desktop opens this stream to receive notifications like tools/list_changed.
   */
  #handleSSEStream(req: HttpRequest): SSEResponse {
    const mcpSessionId = req.headers.get('mcp-session-id');

    if (this.#config.debug) {
      console.log(`[MCP Debug]   SSE stream request, session: ${mcpSessionId || '[NONE]'}`);
    }

    if (!mcpSessionId) {
      if (this.#config.debug) {
        console.log(`[MCP Debug]   SSE Error: Missing Mcp-Session-Id header`);
      }
      // Return a regular response indicating error - we need Mcp-Session-Id
      return sseResponse((writer, _onClose) => {
        writer(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32600,
              message: 'Mcp-Session-Id header required for SSE stream',
            },
          })
        );
      });
    }

    const mcpSession = this.#mcpSessions.get(mcpSessionId);
    if (!mcpSession) {
      if (this.#config.debug) {
        console.log(`[MCP Debug]   SSE Error: MCP session not found`);
      }
      return sseResponse((writer, _onClose) => {
        writer(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32600,
              message: 'MCP session not found',
            },
          })
        );
      });
    }

    if (this.#config.debug) {
      console.log(`[MCP Debug]   SSE stream opened successfully`);
    }

    return sseResponse((writer, onClose) => {
      // Store the writer so we can push notifications later
      mcpSession.sseWriter = writer;
      mcpSession.lastActivity = Date.now();

      // Set up cleanup for when client disconnects
      const cleanup = () => {
        if (this.#config.debug) {
          console.log(`[MCP Debug]   SSE stream closed for session ${mcpSessionId}`);
        }
        mcpSession.sseWriter = undefined;
        mcpSession.sseCleanup = undefined;
      };
      mcpSession.sseCleanup = cleanup;

      // Register the onClose callback
      // Note: The adapter will call onClose when the client disconnects
      // We store our cleanup function so we can also call it manually
    });
  }

  /**
   * Handles MCP session deletion (client explicitly closing session).
   */
  #handleMcpSessionDelete(sessionId: string): HttpResponse {
    const mcpSession = this.#mcpSessions.get(sessionId);

    if (!mcpSession) {
      return jsonResponse(404, { error: 'MCP session not found' });
    }

    // Clean up SSE stream if open
    if (mcpSession.sseCleanup) {
      mcpSession.sseCleanup();
    }

    this.#mcpSessions.delete(sessionId);
    return jsonResponse(200, { success: true });
  }
}
