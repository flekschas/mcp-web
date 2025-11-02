#!/usr/bin/env node
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import {
  InternalErrorCode,
  InvalidAuthenticationErrorCode,
  type MCPWebConfig,
  type MCPWebConfigOutput,
  McpWebConfigSchema,
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
} from '@mcp-web/types';
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
  ToolDefinition,
  ToolResponseMessage,
} from './types.js';
import type { z } from 'zod';

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
      const sessionKey = url.searchParams.get('session');

      if (!sessionKey) {
        ws.close(1008, 'Missing session key');
        return;
      }

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleFrontendMessage(sessionKey, message, ws);
        } catch (error) {
          console.error('Invalid JSON message:', error);
          ws.close(1003, 'Invalid JSON');
        }
      });

      ws.on('close', () => {
        this.sessions.delete(sessionKey);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for session ${sessionKey}:`, error);
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

  private handleFrontendMessage(sessionKey: string, message: FrontendMessage, ws: WebSocket) {
    switch (message.type) {
      case 'authenticate':
        this.handleAuthentication(sessionKey, message, ws);
        break;
      case 'register-tool':
        this.handleToolRegistration(sessionKey, message);
        break;
      case 'activity':
        this.handleActivity(sessionKey, message);
        break;
      case 'tool-response':
        // tool-response messages are handled by per-request listeners
        // in handleToolCall() at line ~770, not here in the main router
        break;
      case 'query':
        this.handleQuery(sessionKey, message, ws);
        break;
      case 'query_cancel':
        this.handleQueryCancel(message);
        break;
      default:
        // biome-ignore lint/suspicious/noExplicitAny: Edge case handling
        console.warn(`Unknown message type: ${(message as any).type}`);
    }
  }

  private handleAuthentication(sessionKey: string, message: AuthenticateMessage, ws: WebSocket) {
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

    this.sessions.set(sessionKey, sessionData);

    ws.send(JSON.stringify({
      type: 'authenticated',
      // @ts-expect-error We know the port exists.
      mcpPort: this.mcpServer.address()?.port,
      sessionKey,
      success: true
    }));
  }

  private handleToolRegistration(sessionKey: string, message: RegisterToolMessage) {
    const session = this.sessions.get(sessionKey);
    if (!session) {
      console.warn(`Tool registration for unknown session: ${sessionKey}`);
      return;
    }

    session.tools.set(message.tool.name, message.tool);
  }

  private handleActivity(sessionKey: string, message: ActivityMessage) {
    const session = this.sessions.get(sessionKey);
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

  private async handleQuery(sessionKey: string, message: QueryMessage, ws: WebSocket) {
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
        sessionKey,
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
      const queryId = mcpRequest.params?._queryContext?.queryId;

      let session: SessionData | undefined;

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
        session = this.sessions.get(query.sessionKey);

      } else if (authToken) {
        // Traditional authentication
        session = Array.from(this.sessions.values())
          .find((s) => s.authToken === authToken);
      } else {
        this.sendMCPError(res, mcpRequest.id, -32600, MissingAuthenticationErrorCode);
        return;
      }

      if (!session) {
        this.sendMCPError(res, mcpRequest.id, -32600, InvalidAuthenticationErrorCode);
        return;
      }

      let result: unknown;
      switch (mcpRequest.method) {
        case 'initialize':
          result = await this.handleInitialize();
          break;
        case 'tools/list':
          result = await this.handleToolsList();
          break;
        case 'tools/call':
          result = await this.handleToolCall(mcpRequest.params);
          break;
        case 'resources/list':
          result = await this.handleResourcesList();
          break;
        case 'prompts/list':
          result = await this.handlePromptsList();
          break;
        default: {
          this.sendMCPError(res, mcpRequest.id, -32601, UnknownMethodErrorCode);
          return;
        }
      }

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

  private async handleToolsList() {
    const activeSessions = Array.from(this.sessions.values());

    if (activeSessions.length === 0) {
      return { tools: [] };
    }

    const tools: ToolDefinition[] = [
      {
        name: "list_active_sessions",
        description: "List all active browser sessions",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      }
    ];

    // Collect all unique tools from all sessions
    const toolMap = new Map<string, ToolDefinition>();

    activeSessions.forEach((session) => {
      session.tools.forEach((tool, toolName) => {
        if (!toolMap.has(toolName)) {
          toolMap.set(toolName, tool);
        }
      });
    });

    // Add session-aware versions of tools
    toolMap.forEach((tool) => {
      const sessionAwareTool: ToolDefinition = {
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
    });

    return { tools };
  }

  private async handleToolCall(params: McpRequest['params']) {
    const { name: toolName, arguments: toolInput, _queryContext } = params || {};

    if (!toolName) {
      return { error: "Tool name is required" };
    }

    // Extract query ID from context if available
    const queryId = _queryContext?.queryId;

    // If this is part of a query, validate the query state and restrictions
    if (queryId) {
      const query = this.queries.get(queryId);
      if (!query) {
        return { error: `Query ${queryId} not found` };
      }
      if (query.state !== 'active') {
        return {
          error: `Cannot call tools on ${query.state} query. Query ${queryId} is no longer active.`
        };
      }

      // Check tool restrictions if query has them
      if (query.restrictTools && query.tools) {
        const allowed = query.tools.some(t => t.name === toolName);
        if (!allowed) {
          return {
            error: `Tool '${toolName}' not allowed by query restrictions. Allowed tools: ${query.tools.map(t => t.name).join(', ')}`
          };
        }
      }
    }

    if (toolName === 'list_active_sessions') {
      return this.listActiveSessions();
    }

    // Handle session-specific tools
    let sessionKey = toolInput?.session_id as string | undefined;
    const sessions = Array.from(this.sessions.entries());

    if (!sessionKey) {
      if (sessions.length === 1) {
        sessionKey = sessions[0][0];
      } else if (sessions.length > 1) {
        return {
          error: "Multiple sessions active. Please specify session_id or use list_active_sessions to see available sessions.",
          available_sessions: this.listActiveSessions()
        };
      } else {
        return { error: "No active sessions" };
      }
    }

    if (!sessionKey) {
      return { error: "Session key is required" };
    }

    const session = this.sessions.get(sessionKey);
    if (!session) {
      return {
        error: "Session not found",
        available_sessions: this.listActiveSessions()
      };
    }

    // Check if tool exists in this session
    if (!session.tools.has(toolName)) {
      return {
        error: `Tool '${toolName}' not available in session ${sessionKey.slice(0, 8)}`,
        available_tools: Array.from(session.tools.keys())
      };
    }

    // Forward tool call to frontend
    return this.forwardToSession(sessionKey, toolName, toolInput, queryId);
  }

  private async handleResourcesList() {
    // Return available sessions as resources
    const sessions = Array.from(this.sessions.entries()).map(([key, session]) => ({
      uri: `session://${key}`,
      name: `Session ${key.slice(0, 8)}`,
      description: `Browser session from ${session.origin}`,
      mimeType: "application/json"
    }));

    return { resources: sessions };
  }

  private listActiveSessions() {
    const sessions = Array.from(this.sessions.entries()).map(([key, session]) => ({
      session_id: key,
      short_id: key.slice(0, 8),
      origin: session.origin,
      page_title: session.pageTitle,
      connected_at: new Date(session.connectedAt).toISOString(),
      last_activity: new Date(session.lastActivity).toISOString(),
      available_tools: Array.from(session.tools.keys())
    }));

    return { active_sessions: sessions };
  }

  private async handlePromptsList() {
    // Return empty prompts list for now - can be extended later
    return { prompts: [] };
  }

  private async forwardToSession(
    sessionKey: string,
    toolName: string,
    toolInput?: Record<string, unknown>,
    queryId?: string
  ): Promise<unknown> {
    const session = this.sessions.get(sessionKey);
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
                  if (toolResult && typeof toolResult === 'object' && 'error' in toolResult) {
                    // Tool failed - send query_failure
                    const errorMessage = QueryFailureMessageSchema.parse({
                      uuid: queryId,
                      error: `responseTool '${toolName}' failed: ${String(toolResult.error)}`
                    });

                    if (query.ws.readyState === WebSocket.OPEN) {
                      query.ws.send(JSON.stringify(errorMessage));
                    }
                  } else {
                    // Tool succeeded - auto-complete query
                    const bridgeMessage = QueryCompleteBridgeMessageSchema.parse({
                      uuid: queryId,
                      message: undefined,
                      toolCalls: query.toolCalls
                    });

                    if (query.ws.readyState === WebSocket.OPEN) {
                      query.ws.send(JSON.stringify(bridgeMessage));
                    }
                  }

                  this.queries.delete(queryId);
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
