#!/usr/bin/env node
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { z } from 'zod';
import type {
  ActivityMessage,
  AuthenticateMessage,
  FrontendMessage,
  McpRequest,
  McpResponse,
  RegisterToolMessage,
  SessionData,
  ToolCallMessage,
  ToolDefinition,
  ToolResponseMessage
} from './types.js';

// Re-export types for frontend consumption
export type {
  ActivityMessage,
  AuthenticatedMessage,
  AuthenticateMessage,
  BridgeMessage,
  FrontendMessage,
  RegisterToolMessage,
  ToolCallMessage,
  ToolResponseMessage
} from './types.js';

export const bridgeServerConfigSchema = z.object({
  /** The port for the WebSocket server (for frontend connections) */
  wsPort: z.number().int().min(1).max(65535).optional().default(3001).describe('The port for the WebSocket server (for frontend connections)'),
  /** The port for the MCP server (for client connections) */
  mcpPort: z.number().int().min(1).max(65535).optional().default(3002).describe('The port for the MCP server (for client connections)'),
  /** The name of the server. This is used to identify the server and is displayed in your AI App (e.g., Claude Desktop) */
  name: z.string().min(1).describe('The name of the server. This is used to identify the server and is displayed in your AI App (e.g., Claude Desktop)'),
  /** The description of the server. This should describe the web app you want the AI App to control. */
  description: z.string().min(1).describe('The description of the server. This should describe the web app you want the AI App to control.'),
  /** Either a URL or a data URI like "data:image/png;base64,...". This is shown in the AI App. */
  icon: z.string().optional().describe('Either a URL or a data URI like "data:image/png;base64,...". This is shown in the AI App.')
});

export type BridgeServerConfigInput = z.input<typeof bridgeServerConfigSchema>;

export type BridgeServerConfig = z.output<typeof bridgeServerConfigSchema>;


export class Bridge {
  private sessions = new Map<string, SessionData>();
  private config: BridgeServerConfig;

  constructor(
    config: BridgeServerConfigInput = {
      wsPort: 3001,
      mcpPort: 3002,
      name: "Web App Controller",
      description: "Control web applications and dashboards through your browser"
    }
  ) {
    // Validate the configuration
    const parsedConfig = bridgeServerConfigSchema.safeParse(config);
    if (!parsedConfig.success) {
      throw new Error(`Invalid bridge server configuration: ${parsedConfig.error.message}`);
    }

    this.config = parsedConfig.data;

    this.setupWebSocketServer(this.config.wsPort);
    this.setupMCPServer(this.config.mcpPort);

    console.log(`WebSocket server running on port ${this.config.wsPort}`);
    console.log(`MCP server running on port ${this.config.mcpPort}`);
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

      console.log(`New WebSocket connection for session: ${sessionKey}`);

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
        console.log(`Session disconnected: ${sessionKey}`);
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
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
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
        this.handleToolResponse(sessionKey, message);
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

    console.log(`Session authenticated: ${sessionKey} from ${message.origin}`);
  }

  private handleToolRegistration(sessionKey: string, message: RegisterToolMessage) {
    const session = this.sessions.get(sessionKey);
    if (!session) {
      console.warn(`Tool registration for unknown session: ${sessionKey}`);
      return;
    }

    session.tools.set(message.tool.name, message.tool);
    console.log(`Tool registered: ${message.tool.name} for session ${sessionKey}`);
  }

  private handleActivity(sessionKey: string, message: ActivityMessage) {
    const session = this.sessions.get(sessionKey);
    if (session) {
      session.lastActivity = message.timestamp;
    }
  }

  private handleToolResponse(sessionKey: string, message: ToolResponseMessage) {
    // Handle responses from frontend tool execution
    // This would be used for async tool calls
    console.log(`Tool response from ${sessionKey}:`, message);
  }

  private async handleMCPRequest(req: IncomingMessage, res: ServerResponse, body: string) {
    try {
      const mcpRequest: McpRequest = JSON.parse(body);

      // Extract auth token from Authorization header
      const authHeader = req.headers.authorization;
      const authToken = authHeader?.replace('Bearer ', '');

      if (!authToken) {
        this.sendMCPError(res, mcpRequest.id, -32600, 'Missing authorization token');
        return;
      }

      // Find session by auth token
      const session = Array.from(this.sessions.values())
        .find((s) => s.authToken === authToken);

      if (!session) {
        console.log(Array.from(this.sessions.values()))
        this.sendMCPError(res, mcpRequest.id, -32600, 'Invalid authorization token');
        return;
      }

      console.log('mcp request', mcpRequest);

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
          this.sendMCPError(res, mcpRequest.id, -32601, `Method not found: ${mcpRequest.method}`);
          return;
        }
      }

      this.sendMCPResponse(res, mcpRequest.id, result);
    } catch (error) {
      console.error('MCP request error:', error);
      this.sendMCPError(res, 0, -32603, 'Internal error');
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
    const { name: toolName, arguments: toolInput } = params || {};

    if (!toolName) {
      return { error: "Tool name is required" };
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
          available_sessions: await this.listActiveSessions()
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
        available_sessions: await this.listActiveSessions()
      };
    }

    // Check if tool exists in this session
    if (!session.tools.has(toolName)) {
      return {
        error: `Tool '${toolName}' not available in session ${sessionKey.slice(0, 8)}`,
        available_tools: Array.from(session.tools.keys())
      };
    }

    console.log('tool call', toolName, toolInput, params);

    // Forward tool call to frontend
    return this.forwardToSession(sessionKey, toolName, toolInput);
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
      toolInput
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
            resolve(message.result);
          }
        } catch (_error) {
          // Ignore invalid JSON
        }
      };

      console.log('sending tool call', toolCall);

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
}
