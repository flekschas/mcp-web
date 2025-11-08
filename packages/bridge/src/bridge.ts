#!/usr/bin/env node
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import {
  InternalErrorCode,
  NoSessionsFoundErrorCode,
  type MCPWebConfig,
  type MCPWebConfigOutput,
  McpWebConfigSchema,
  SessionNotFoundErrorCode,
  MissingAuthenticationErrorCode,
  QueryAcceptedMessageSchema,
  QueryCancelMessageSchema,
  QueryCompleteBridgeMessageSchema,
  QueryCompleteClientMessageSchema,
  QueryFailureMessageSchema,
  type QueryMessage,
  QueryMessageSchema,
  QueryNotActiveErrorCode,
  QueryNotFoundErrorCode,
  QueryProgressMessageSchema,
  UnknownMethodErrorCode,
  QueryCancelMessage,
  InvalidSessionErrorCode,
  SessionNotSpecifiedErrorCode,
  ToolNotFoundErrorCode,
  ToolNameRequiredErrorCode,
  ToolNotAllowedErrorCode,
  FatalError,
  ErroredListToolsResult,
  ErroredListResourcesResult,
  ErroredListPromptsResult,
} from '@mcp-web/types';
import type {
  ListPromptsResult,
  ListResourcesResult,
  ListToolsResult,
  Resource,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { WebSocket, WebSocketServer } from 'ws';
import type {
  ActivityMessage,
  AuthenticateMessage,
  FrontendMessage,
  McpRequest,
  McpResponse,
  QueryTracking,
  RegisterToolMessage,
  SessionData,
  ToolCallMessage,
  ToolResponseMessage,
} from './types.js';
import type { z } from 'zod';

const SessionNotSpecifiedErrorDetails = 'Multiple sessions available. See `available_sessions` or call the `list_sessions` tool to discover available sessions and specify the session using `_meta.sessionId`.';

export class MCPWebBridge {
  private sessions = new Map<string, SessionData>();
  private queries = new Map<string, QueryTracking>();
  private config: MCPWebConfigOutput;
  private wsServer?: WebSocketServer;
  private mcpServer?: ReturnType<typeof createServer>;

  constructor(
    config: MCPWebConfig = {
      wsPort: 3001,
      mcpPort: 3002,
      name: "Web App Controller",
      description: "Control web applications and dashboards through your browser"
    }
  ) {
    // Validate the configuration
    const parsedConfig = McpWebConfigSchema.safeParse(config);
    if (!parsedConfig.success) {
      throw new Error(`Invalid bridge server configuration: ${parsedConfig.error.message}`);
    }

    this.config = parsedConfig.data;

    this.wsServer = this.setupWebSocketServer(this.config.wsPort);
    this.mcpServer = this.setupMCPServer(this.config.mcpPort);
  }

  private setupWebSocketServer(wsPort: number) {
    const wsServer = new WebSocketServer({
      port: wsPort,
      verifyClient: () => {
        // Add origin verification if needed
        return true;
      }
    });

    wsServer.on('connection', (ws, req) => {
      if (!req.url) {
        ws.close(1008, 'Missing URL');
        return;
      }

      const url = new URL(req.url, 'ws://localhost');
      const sessionId = url.searchParams.get('session');

      if (!sessionId) {
        ws.close(1008, 'Missing session key');
        return;
      }

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleFrontendMessage(sessionId, message, ws);
        } catch (error) {
          console.error('Invalid JSON message:', error);
          ws.close(1003, 'Invalid JSON');
        }
      });

      ws.on('close', () => {
        this.sessions.delete(sessionId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for session ${sessionId}:`, error);
      });
    });

    return wsServer;
  }

  private setupMCPServer(mcpPort: number) {
    const mcpServer = createServer((req, res) => {
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Route query progress/complete/fail/cancel endpoints
      const url = req.url || '';
      const queryProgressMatch = url.match(/^\/query\/([^/]+)\/progress$/);
      const queryCompleteMatch = url.match(/^\/query\/([^/]+)\/complete$/);
      const queryFailMatch = url.match(/^\/query\/([^/]+)\/fail$/);
      const queryCancelMatch = url.match(/^\/query\/([^/]+)\/cancel$/);

      if (req.method === 'POST' && queryProgressMatch) {
        const uuid = queryProgressMatch[1];
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          this.handleQueryProgressEndpoint(req, res, uuid, body);
        });
        return;
      }

      if (req.method === 'PUT' && queryCompleteMatch) {
        const uuid = queryCompleteMatch[1];
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          this.handleQueryCompleteEndpoint(req, res, uuid, body);
        });
        return;
      }

      if (req.method === 'PUT' && queryFailMatch) {
        const uuid = queryFailMatch[1];
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          this.handleQueryFailEndpoint(req, res, uuid, body);
        });
        return;
      }

      if (req.method === 'PUT' && queryCancelMatch) {
        const uuid = queryCancelMatch[1];
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          this.handleQueryCancelEndpoint(req, res, uuid, body);
        });
        return;
      }

      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          this.handleMCPRequest(req, res, body);
        });
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    mcpServer.listen(mcpPort);

    return mcpServer;
  }

  private handleFrontendMessage(sessionId: string, message: FrontendMessage, ws: WebSocket) {
    switch (message.type) {
      case 'authenticate':
        this.handleAuthentication(sessionId, message, ws);
        break;
      case 'register-tool':
        this.handleToolRegistration(sessionId, message);
        break;
      case 'activity':
        this.handleActivity(sessionId, message);
        break;
      case 'tool-response':
        // tool-response messages are handled by per-request listeners
        // in handleToolCall() at line ~770, not here in the main router
        break;
      case 'query':
        this.handleQuery(sessionId, message, ws);
        break;
      case 'query_cancel':
        this.handleQueryCancel(message);
        break;
      default:
        // biome-ignore lint/suspicious/noExplicitAny: Edge case handling
        console.warn(`Unknown message type: ${(message as any).type}`);
    }
  }

  private handleAuthentication(sessionId: string, message: AuthenticateMessage, ws: WebSocket) {
    const sessionData: SessionData = {
      ws,
      authToken: message.authToken,
      origin: message.origin,
      pageTitle: message.pageTitle,
      userAgent: message.userAgent,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      tools: new Map()
    };

    this.sessions.set(sessionId, sessionData);

    ws.send(JSON.stringify({
      type: 'authenticated',
      // @ts-expect-error We know the port exists.
      mcpPort: this.mcpServer.address()?.port,
      sessionId,
      success: true
    }));
  }

  private handleToolRegistration(sessionId: string, message: RegisterToolMessage) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`Tool registration for unknown session: ${sessionId}`);
      return;
    }

    console.log('registering tool for session', sessionId, message);

    session.tools.set(message.tool.name, message.tool);
  }

  private handleActivity(sessionId: string, message: ActivityMessage) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = message.timestamp;
    }
  }

  private async handleQueryCancel(message: QueryCancelMessage) {
    const cancelMessage = QueryCancelMessageSchema.parse(message);
    const { uuid } = cancelMessage;
    const query = this.queries.get(uuid);

    if (!query) {
      console.warn(`Cancel requested for unknown query: ${uuid}`);
      return;
    }

    // Mark query as cancelled
    query.state = 'cancelled';

    // Notify agent that query no longer exists (optional - agent may not implement DELETE)
    if (this.config.agentUrl) {
      try {
        await fetch(`${this.config.agentUrl}/query/${uuid}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        // Agent may not implement DELETE endpoint, which is fine
        console.debug(`Failed to notify agent of query deletion (optional): ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    this.queries.delete(uuid);
  }

  private async handleQuery(sessionId: string, message: QueryMessage, ws: WebSocket) {
    const { uuid, responseTool, tools, restrictTools } = message;

    if (!this.config.agentUrl) {
      ws.send(JSON.stringify(QueryFailureMessageSchema.parse({
        uuid,
        error: 'Missing Agent URL'
      })));
      return;
    }

    try {
      // Track this query
      this.queries.set(uuid, {
        sessionId,
        responseTool: responseTool?.name,
        toolCalls: [],
        ws,
        state: 'active',
        tools,
        restrictTools
      });

      // Forward query to agent
      const response = await fetch(`${this.config.agentUrl}/query/${uuid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` })
        },
        body: JSON.stringify(QueryMessageSchema.parse(message))
      });

      if (!response.ok) {
        throw new Error(`Agent responded with ${response.status}: ${response.statusText}`);
      }

      // Send immediate acceptance back to frontend
      ws.send(JSON.stringify(QueryAcceptedMessageSchema.parse({ uuid })));

    } catch (error) {
      console.error(`Error forwarding query ${uuid}:`, error);
      this.queries.delete(uuid);
      ws.send(JSON.stringify(QueryFailureMessageSchema.parse({
        uuid,
        error: `${error instanceof Error ? error.message : String(error)}`
      })));
    }
  }

  private handleQueryProgressEndpoint(_req: IncomingMessage, res: ServerResponse, uuid: string, body: string) {
    try {
      const message = JSON.parse(body);
      const progressMessage = QueryProgressMessageSchema.parse({ uuid, ...message });

      const query = this.queries.get(uuid);
      if (!query) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: QueryNotFoundErrorCode }));
        return;
      }

      // Forward progress to frontend
      if (query.ws.readyState === WebSocket.OPEN) {
        query.ws.send(JSON.stringify(progressMessage));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error('Error handling query progress:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
  }

  private handleQueryCompleteEndpoint(_req: IncomingMessage, res: ServerResponse, uuid: string, body: string) {
    try {
      const message = JSON.parse(body);
      const completeMessage = QueryCompleteClientMessageSchema.parse({ uuid, ...message });

      const query = this.queries.get(uuid);
      if (!query) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: QueryNotFoundErrorCode }));
        return;
      }

      // Edge case: responseTool specified but agent called queryComplete()
      if (query.responseTool) {
        const errorMessage = QueryFailureMessageSchema.parse({
          uuid,
          error: `Query specified responseTool '${query.responseTool}' but agent called queryComplete() instead`
        });

        if (query.ws.readyState === WebSocket.OPEN) {
          query.ws.send(JSON.stringify(errorMessage));
        }

        this.queries.delete(uuid);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errorMessage.error }));
        return;
      }

      // Mark query as completed
      query.state = 'completed';

      // Send completion with tracked tool calls
      const bridgeMessage = QueryCompleteBridgeMessageSchema.parse({
        uuid,
        message: completeMessage.message,
        toolCalls: query.toolCalls
      });

      if (query.ws.readyState === WebSocket.OPEN) {
        query.ws.send(JSON.stringify(bridgeMessage));
      }

      this.queries.delete(uuid);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error('Error handling query complete:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
  }

  private handleQueryFailEndpoint(_req: IncomingMessage, res: ServerResponse, uuid: string, body: string) {
    try {
      const message = JSON.parse(body);
      const failureMessage = QueryFailureMessageSchema.parse({ uuid, ...message });

      const query = this.queries.get(uuid);
      if (!query) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: QueryNotFoundErrorCode }));
        return;
      }

      // Mark query as failed
      query.state = 'failed';

      // Send failure message to frontend
      if (query.ws.readyState === WebSocket.OPEN) {
        query.ws.send(JSON.stringify(failureMessage));
      }

      this.queries.delete(uuid);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error('Error handling query fail:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
  }

  private handleQueryCancelEndpoint(
    _req: IncomingMessage,
    res: ServerResponse,
    uuid: string,
    body: string
  ) {
    try {
      const query = this.queries.get(uuid);
      if (!query) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: QueryNotFoundErrorCode }));
        return;
      }

      // Mark query as cancelled
      query.state = 'cancelled';

      // Send cancellation message to frontend (as a failure with specific message)
      const cancellationMessage = QueryCancelMessageSchema.parse({
        uuid,
        reason: body ? JSON.parse(body).reason : undefined
      } satisfies z.input<typeof QueryCancelMessageSchema>);

      if (query.ws.readyState === WebSocket.OPEN) {
        query.ws.send(JSON.stringify(cancellationMessage));
      }

      this.queries.delete(uuid);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error('Error handling query cancel:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
  }

  private async handleMCPRequest(req: IncomingMessage, res: ServerResponse, body: string) {
    try {
      const mcpRequest: McpRequest = JSON.parse(body);

      // Extract auth from header OR query context
      const authHeader = req.headers.authorization;
      const authToken = authHeader?.replace('Bearer ', '');
      const queryId = mcpRequest.params?._meta?.queryId;

      const sessions = new Map<string, SessionData>();

      if (queryId) {
        // Authenticate via query context
        const query = this.queries.get(queryId);
        if (!query) {
          this.sendMCPError(res, mcpRequest.id, -32600, QueryNotFoundErrorCode);
          return;
        }
        if (query.state !== 'active') {
          this.sendMCPError(res, mcpRequest.id, -32600, QueryNotActiveErrorCode);
          return;
        }
        const session = this.sessions.get(query.sessionId);
        if (!session) {
          this.sendMCPError(res, mcpRequest.id, -32600, InvalidSessionErrorCode);
          return;
        }
        sessions.set(query.sessionId, session);
      } else if (authToken) {
        // Traditional authentication
        Array.from(this.sessions.entries())
          .filter(([_, session]) => session.authToken === authToken)
          .forEach(([sessionId, session]) => {
            sessions.set(sessionId, session);
          });
      } else {
        this.sendMCPError(res, mcpRequest.id, -32600, MissingAuthenticationErrorCode);
        return;
      }

      if (sessions.size === 0) {
        this.sendMCPError(res, mcpRequest.id, -32600, NoSessionsFoundErrorCode);
        return;
      }

      let result: unknown;
      switch (mcpRequest.method) {
        case 'initialize':
          result = await this.handleInitialize();
          break;
        case 'tools/list':
          result = await this.handleToolsList(sessions, mcpRequest.params);
          break;
        case 'tools/call':
          result = await this.handleToolCall(sessions, mcpRequest.params);
          break;
        case 'resources/list':
          result = await this.handleResourcesList(sessions, mcpRequest.params);
          break;
        case 'resources/read':
          result = await this.handleResourceRead(sessions, mcpRequest.params);
          break;
        case 'prompts/list':
          result = await this.handlePromptsList(sessions, mcpRequest.params);
          break;
        default: {
          this.sendMCPError(res, mcpRequest.id, -32601, UnknownMethodErrorCode);
          return;
        }
      }

      // Check if result contains a fatal error (has error_is_fatal: true)
      // Recoverable errors have isError: true with partial data and go in result
      if (result && typeof result === 'object' && 'error_is_fatal' in result && result.error_is_fatal === true) {
        const fatalError = result as FatalError;
        // Use -32602 (Invalid params) for client errors like missing sessionId
        this.sendMCPError(res, mcpRequest.id, -32602, fatalError.error_message, fatalError);
        return;
      }

      // Everything else (including soft errors with isError: true) goes in result
      this.sendMCPResponse(res, mcpRequest.id, result);
    } catch (error) {
      console.error('MCP request error:', error);
      this.sendMCPError(res, 0, -32603, InternalErrorCode);
    }
  }

  private getVersion(): string {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const packageJsonPath = join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.version || "1.0.0";
    } catch (error) {
      console.warn('Failed to read version from package.json:', error);
      return "1.0.0";
    }
  }

  private async handleInitialize() {
    return {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      },
      serverInfo: {
        name: this.config.name,
        description: this.config.description,
        version: this.getVersion(),
        ...(this.config.icon && { icon: this.config.icon })
      }
    };
  }

  private getSessionAndSessionId(
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

  private getSessionFromMetaParams(
    sessions: Map<string, SessionData>,
    params?: McpRequest['params']
  ): SessionData | undefined {
    let sessionId = params?._meta?.sessionId as string | undefined;

    return this.getSessionAndSessionId(sessions, sessionId)?.[1];
  }

  private createSessionNotFoundError(sessions: Map<string, SessionData>) {
    if (sessions.size > 1) {
      return {
        error: SessionNotSpecifiedErrorCode,
        error_message: SessionNotSpecifiedErrorDetails,
        available_sessions: this.listSessions(sessions)
      };
    }
    return { error: SessionNotFoundErrorCode };
  }

  private async handleToolsList(
    sessions: Map<string, SessionData>,
    params?: McpRequest['params']
  ): Promise<ListToolsResult | ErroredListToolsResult | FatalError> {
    const session = this.getSessionFromMetaParams(sessions, params);

    const listSessionsTool: Tool = {
      name: "list_sessions",
      description: "List all browser sessions with their available tools",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    };

    // If no session found and multiple sessions exist, return list_sessions tool only with isError
    if (!session && sessions.size > 1) {
      return {
        tools: [listSessionsTool],
        isError: true,
        error: SessionNotSpecifiedErrorCode,
        error_message: SessionNotSpecifiedErrorDetails,
        error_is_fatal: false,
        available_sessions: this.listSessions(sessions)
      } satisfies ErroredListToolsResult;
    }

    // If no session at all (shouldn't happen with proper auth), return fatal error
    if (!session) {
      return {
        error: SessionNotFoundErrorCode,
        error_message: 'No session found for the provided authentication',
        error_is_fatal: true
      } satisfies FatalError;
    }

    const tools: Tool[] = [listSessionsTool];

    for (const tool of session.tools.values()) {
      const sessionAwareTool: Tool = {
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Session ID (optional - will auto-select if only one session active)",
            },
            ...(tool.inputSchema?.properties || {})
          },
          required: tool.inputSchema?.required || []
        }
      };
      tools.push(sessionAwareTool);
    }

    return { tools } satisfies ListToolsResult;
  }

  private async handleToolCall(
    sessions: Map<string, SessionData>,
    params?: McpRequest['params']
  ): Promise<unknown> {
    const { name: toolName, arguments: toolInput, _meta } = params || {};

    if (!toolName) {
      return { error: ToolNameRequiredErrorCode };
    }

    // Extract query ID from context if available
    const queryId = _meta?.queryId;

    // If this is part of a query, validate the query state and restrictions
    if (queryId) {
      const query = this.queries.get(queryId);
      if (!query) {
        return { error: QueryNotFoundErrorCode };
      }
      if (query.state !== 'active') {
        return { error: QueryNotActiveErrorCode };
      }

      // Check tool restrictions if query has them
      if (query.restrictTools && query.tools) {
        const allowed = query.tools.some(t => t.name === toolName);
        if (!allowed) {
          return {
            error: ToolNotAllowedErrorCode,
            details: 'The query restricts the allowed tool calls. Use one of `allowed_tools`.',
            allowed_tools: query.tools.map(t => t.name)
          };
        }
      }
    }

    if (toolName === 'list_sessions') {
      return { sessions: this.listSessions(sessions) };
    }

    // Handle session-specific tool
    const [sessionId, session] = this.getSessionAndSessionId(
      sessions,
      toolInput?.session_id as string | undefined || _meta?.sessionId
    ) || [];

    if (!sessionId || !session) {
      return this.createSessionNotFoundError(sessions);
    }

    // Check if tool exists in this session
    if (!session.tools.has(toolName)) {
      return {
        error: ToolNotFoundErrorCode,
        available_tools: Array.from(session.tools.keys())
      };
    }

    // Forward tool call to frontend
    return this.forwardToolCallToSession(sessionId, toolName, toolInput, queryId);
  }

  private async handleResourcesList(
    sessions: Map<string, SessionData>,
    params?: McpRequest['params']
  ): Promise<ListResourcesResult | ErroredListResourcesResult | FatalError> {
    const session = this.getSessionFromMetaParams(sessions, params);

    // Built-in resource that provides session discovery (like list_sessions tool)
    const sessionListResource: Resource = {
      uri: "sessions://list",
      name: "sessions",
      title: "Active Browser Sessions",
      description: "List of all active browser sessions for this authentication context",
      mimeType: "application/json"
    };

    // If no session found and multiple sessions exist, return discovery resource only with isError
    if (!session && sessions.size > 1) {
      return {
        resources: [sessionListResource],
        isError: true,
        error: SessionNotSpecifiedErrorCode,
        error_message: SessionNotSpecifiedErrorDetails,
        error_is_fatal: false,
        available_sessions: this.listSessions(sessions)
      } satisfies ErroredListResourcesResult;
    }

    // If no session at all (shouldn't happen with proper auth), return fatal error
    if (!session) {
      return {
        error: SessionNotFoundErrorCode,
        error_message: 'No session found for the provided authentication',
        error_is_fatal: true
      } satisfies FatalError;
    }

    // TODO: Add session-specific resources
    const resources: Resource[] = [
      sessionListResource,
      // ...session.resources (future)
    ];

    return { resources } satisfies ListResourcesResult;
  }

  private async handleResourceRead(
    sessions: Map<string, SessionData>,
    params?: McpRequest['params']
  ) {
    const { uri } = params as { uri?: string } || {};

    if (!uri) {
      return { error: "Resource URI is required" };
    }

    // Handle built-in sessions resource
    if (uri === "sessions://list") {
      const sessionData = this.listSessions(sessions);
      return {
        contents: [{
          uri: "sessions://list",
          mimeType: "application/json",
          text: JSON.stringify(sessionData, null, 2)
        }]
      };
    }

    // TODO: Handle session-specific resources
    return { error: "Resource not found" };
  }

  private listSessions(sessions: Map<string, SessionData>) {
    const sessionList = Array.from(sessions.entries()).map(([key, session]) => ({
      session_id: key,
      origin: session.origin,
      page_title: session.pageTitle,
      connected_at: new Date(session.connectedAt).toISOString(),
      last_activity: new Date(session.lastActivity).toISOString(),
      available_tools: Array.from(session.tools.keys())
    }));

    return sessionList;
  }

  private async handlePromptsList(
    sessions: Map<string, SessionData>,
    params?: McpRequest['params']
  ): Promise<ListPromptsResult | ErroredListPromptsResult | FatalError> {
    const session = this.getSessionFromMetaParams(sessions, params);

    // If no session found and multiple sessions exist, return empty prompts with isError
    if (!session && sessions.size > 1) {
      return {
        prompts: [],
        isError: true,
        error: SessionNotSpecifiedErrorCode,
        error_message: SessionNotSpecifiedErrorDetails,
        error_is_fatal: false,
        available_sessions: this.listSessions(sessions),
      } satisfies ErroredListPromptsResult;
    }

    // If no session at all (shouldn't happen with proper auth), return fatal error
    if (!session) {
      return {
        error: SessionNotFoundErrorCode,
        error_message: 'No session found for the provided authentication',
        error_is_fatal: true
      } satisfies FatalError;
    }

    // TO DO: implement prompt exposure
    return { prompts: [] } satisfies ListPromptsResult;
  }

  private async forwardToolCallToSession(
    sessionId: string,
    toolName: string,
    toolInput?: Record<string, unknown>,
    queryId?: string
  ): Promise<unknown> {
    const session = this.sessions.get(sessionId);
    if (!session || session.ws.readyState !== WebSocket.OPEN) {
      return { error: "Session not available" };
    }

    // Generate request ID for tracking
    const requestId = crypto.randomUUID();

    // Send tool call to frontend
    const toolCall: ToolCallMessage = {
      type: 'tool-call',
      requestId,
      toolName,
      toolInput,
      ...(queryId && { queryId })
    };

    return new Promise((resolve) => {
      // Set up response handler
      const timeout = setTimeout(() => {
        resolve({ error: "Tool call timeout" });
      }, 30000); // 30 second timeout

      const handleResponse = (data: Buffer) => {
        try {
          const message: ToolResponseMessage = JSON.parse(data.toString());
          if (message.type === 'tool-response' && message.requestId === requestId) {
            clearTimeout(timeout);
            session.ws.removeListener('message', handleResponse);

            const toolResult = message.result;

            // Track tool call if part of a query
            if (queryId) {
              const query = this.queries.get(queryId);
              if (query) {
                query.toolCalls.push({
                  tool: toolName,
                  arguments: toolInput,
                  result: toolResult
                });

                // Check if this was the responseTool - auto-complete query
                if (query.responseTool === toolName) {
                  // Check if tool call succeeded
                  if (!(toolResult && typeof toolResult === 'object' && 'error' in toolResult)) {
                    // Tool succeeded - auto-complete query
                    const bridgeMessage = QueryCompleteBridgeMessageSchema.parse({
                      uuid: queryId,
                      message: undefined,
                      toolCalls: query.toolCalls
                    });

                    if (query.ws.readyState === WebSocket.OPEN) {
                      query.ws.send(JSON.stringify(bridgeMessage));
                    }

                    // Only delete query on success
                    this.queries.delete(queryId);
                  }
                }
              }
            }

            resolve(toolResult);
          }
        } catch (_error) {
          // Ignore invalid JSON
        }
      };

      session.ws.addListener('message', handleResponse);
      session.ws.send(JSON.stringify(toolCall));
    });
  }

  private sendMCPResponse(res: ServerResponse, id: string | number, result: unknown) {
    const response: McpResponse = {
      jsonrpc: "2.0",
      id,
      result
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  private sendMCPError(res: ServerResponse, id: string | number, code: number, message: string, data?: unknown) {
    const response: McpResponse = {
      jsonrpc: "2.0",
      id,
      error: { code, message, data }
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  /**
   * Close the bridge servers and cleanup all connections
   */
  async close(): Promise<void> {
    // Close all WebSocket connections first
    for (const session of this.sessions.values()) {
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.close(1000, 'Server shutting down');
      }
    }
    this.sessions.clear();

    // Clear queries
    this.queries.clear();

    // Close servers with timeout to prevent hanging
    const closeWithTimeout = (
      closePromise: Promise<void>,
      timeoutMs = 1000
    ): Promise<void> => {
      return Promise.race([
        closePromise,
        new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
      ]);
    };

    // Close WebSocket server
    if (this.wsServer) {
      await closeWithTimeout(
        new Promise<void>((resolve) => {
          this.wsServer?.close(() => resolve());
        })
      );
    }

    // Close MCP server
    if (this.mcpServer) {
      await closeWithTimeout(
        new Promise<void>((resolve) => {
          this.mcpServer?.close(() => resolve());
        })
      );
    }
  }
}
