/**
 * MCPWebBridge - Runtime-agnostic core for the MCP Web Bridge.
 *
 * This class contains all the business logic for the bridge but delegates
 * I/O operations to adapters via the BridgeHandlers interface.
 *
 * Usage:
 * ```typescript
 * // Direct usage with custom adapter
 * const bridge = new MCPWebBridge(config);
 * const handlers = bridge.getHandlers();
 * // Wire handlers to your runtime's WebSocket/HTTP servers
 *
 * // Or use a pre-built adapter (recommended)
 * import { MCPWebBridgeNode } from '@mcp-web/bridge';
 * const bridge = new MCPWebBridgeNode(config);
 * ```
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
  SessionExpiredErrorCode,
  SessionLimitExceededErrorCode,
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
  WebSocketConnection,
} from './runtime/types.js';
import { jsonResponse, } from './runtime/types.js';

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
  };
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
  | ActivityMessage
  | ToolResponseMessage
  | QueryMessage
  | QueryCancelMessage;

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: z.core.JSONSchema.JSONSchema;
  outputSchema?: z.core.JSONSchema.JSONSchema;
  handler?: string;
}

interface SessionData {
  ws: WebSocketConnection;
  authToken: string;
  origin: string;
  pageTitle?: string;
  userAgent?: string;
  connectedAt: number;
  lastActivity: number;
  tools: Map<string, ToolDefinition>;
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

  constructor(config: MCPWebConfig, scheduler?: Scheduler) {
    const parsedConfig = McpWebConfigSchema.safeParse(config);
    if (!parsedConfig.success) {
      throw new Error(
        `Invalid bridge server configuration: ${parsedConfig.error.message}`
      );
    }

    this.#config = parsedConfig.data;
    this.#scheduler = scheduler ?? new NoopScheduler();

    // Start session timeout checker if configured
    if (this.#config.sessionMaxDurationMs) {
      this.#startSessionTimeoutChecker();
    }
  }

  /**
   * Get the configuration (read-only)
   */
  get config(): MCPWebConfigOutput {
    return this.#config;
  }

  /**
   * Returns handlers for adapters to wire up to their runtime's I/O.
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
   * Graceful shutdown - cleanup all sessions and scheduled tasks.
   */
  async close(): Promise<void> {
    // Stop session timeout checker
    if (this.#sessionTimeoutIntervalId) {
      this.#scheduler.cancelInterval(this.#sessionTimeoutIntervalId);
      this.#sessionTimeoutIntervalId = undefined;
    }

    // Close all WebSocket connections
    for (const session of this.#sessions.values()) {
      if (session.ws.readyState === 'OPEN') {
        session.ws.close(1000, 'Server shutting down');
      }
    }
    this.#sessions.clear();

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
      case 'activity':
        this.#handleActivity(sessionId, message);
        break;
      case 'tool-response':
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

    const sessionData: SessionData = {
      ws,
      authToken: message.authToken,
      origin: message.origin,
      pageTitle: message.pageTitle,
      userAgent: message.userAgent,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      tools: new Map(),
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

  async #handleHttpRequest(req: HttpRequest): Promise<HttpResponse> {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
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

    // Handle MCP JSON-RPC requests
    if (req.method === 'POST') {
      return this.#handleMCPRequest(req);
    }

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

      const authHeader = req.headers.get('authorization');
      const authToken = authHeader?.replace('Bearer ', '');
      const queryId = mcpRequest.params?._meta?.queryId;

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
        case 'initialize':
          result = await this.#handleInitialize();
          break;
        case 'tools/list':
          result = await this.#handleToolsList(sessions, mcpRequest.params);
          break;
        case 'tools/call':
          result = await this.#handleToolCall(sessions, mcpRequest.params);
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

  async #handleInitialize(): Promise<unknown> {
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      serverInfo: {
        name: this.#config.name,
        description: this.#config.description,
        version: this.#getVersion(),
        ...(this.#config.icon && { icon: this.#config.icon }),
      },
    };
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

    return { resources } satisfies ListResourcesResult;
  }

  async #handleResourceRead(
    sessions: Map<string, SessionData>,
    params?: McpRequest['params']
  ): Promise<unknown> {
    const { uri } = (params as { uri?: string }) || {};

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

    return { error: 'Resource not found' };
  }

  #listSessions(sessions: Map<string, SessionData>): AvailableSession[] {
    return Array.from(sessions.entries()).map(([key, session]) => ({
      session_id: key,
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
}
