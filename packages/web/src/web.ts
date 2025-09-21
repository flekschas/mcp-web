import { z } from 'zod';
import type { BridgeMessage } from '@mcp-web/bridge';
import { ToolDefinitionSchema } from './tools/schema';
import type { ToolDefinition } from './tools/types';

interface MCPWebConfig {
  /** The name of the app. This is used to identify the app in the MCP bridge and is diplayed in your AI App (e.g., Claude Desktop) */
  name: string;
  /** The description of the app. This is used to describe the app in the MCP bridge. */
  description?: string;
  /** The URL of the MCP bridge server. If not provided, it will be detected automatically. */
  bridgeUrl?: string;
  /** Whether to automatically connect to the MCP bridge on initialization. */
  autoConnect?: boolean;
  /** Optional auth token to use. If not provided, will generate or load from localStorage. */
  authToken?: string;
  /** Whether to persist the auth token in localStorage. Default: true */
  persistAuthToken?: boolean;
}

export class MCPWeb {
  private ws: WebSocket | null = null;
  readonly sessionKey: string;
  readonly authToken: string;
  readonly tools = new Map<string, ToolDefinition>();
  private connected = false;
  public isConnecting = false;
  private mcpPort: number | null = null;
  readonly config: Required<Pick<MCPWebConfig, 'name' | 'description' | 'bridgeUrl' | 'autoConnect'>>;
  readonly mcpConfig: {
    [serverName: string]: {
      command: 'npx';
      args: ['@mcp-web/client'];
      env: {
        MCP_SERVER_URL: string;
        AUTH_TOKEN: string;
      }
    }
  };

  constructor(config: MCPWebConfig) {
    this.config = {
      name: config.name,
      description: config.description || `Control ${config.name} web application`,
      bridgeUrl: config.bridgeUrl || this.detectBridgeUrl(),
      autoConnect: config.autoConnect ?? true
    };

    this.sessionKey = this.generateSessionKey();
    this.authToken = this.resolveAuthToken(config);

    this.mcpConfig = {
      [this.config.name]: {
        command: 'npx',
        args: ['@mcp-web/client'],
        env: {
          MCP_SERVER_URL: 'http://localhost:3002', // Placeholder - will be updated when bridge provides actual MCP port
          AUTH_TOKEN: this.authToken
        }
      }
    };

    if (this.config.autoConnect) {
      this.connect();
    }

    this.setupActivityTracking();
  }

  private detectBridgeUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.protocol === 'https:' ? '3001' : '3001';
    return `${protocol}//${host}:${port}`;
  }

  private generateSessionKey(): string {
    let sessionKey = localStorage.getItem('mcp-session-key');
    if (!sessionKey) {
      sessionKey = crypto.randomUUID();
      localStorage.setItem('mcp-session-key', sessionKey);
    }
    return sessionKey;
  }

  private generateAuthToken(): string {
    return crypto.randomUUID();
  }

  private loadAuthToken(): string | null {
    try {
      return localStorage.getItem('mcp-auth-token');
    } catch (error) {
      console.warn('Failed to load auth token from localStorage:', error);
      return null;
    }
  }

  private saveAuthToken(token: string): void {
    try {
      localStorage.setItem('mcp-auth-token', token);
    } catch (error) {
      console.warn('Failed to save auth token to localStorage:', error);
    }
  }

  private resolveAuthToken(config: MCPWebConfig): string {
    // Use provided auth token if available
    if (config.authToken) {
      // Save it to localStorage if persistence is enabled
      if (config.persistAuthToken !== false) {
        this.saveAuthToken(config.authToken);
      }
      return config.authToken;
    }

    // Try to load from localStorage if persistence is enabled
    if (config.persistAuthToken !== false) {
      const savedToken = this.loadAuthToken();
      if (savedToken) {
        return savedToken;
      }
    }

    // Generate new token
    const newToken = this.generateAuthToken();

    // Save it if persistence is enabled
    if (config.persistAuthToken !== false) {
      this.saveAuthToken(newToken);
    }

    return newToken;
  }

  async connect(): Promise<true> {
    // Prevent duplicate connections
    if (this.connected) {
      return Promise.resolve(true);
    }
    if (this.isConnecting) {
      // Return a promise that resolves when the current connection completes
      return new Promise((resolve) => {
        const checkConnection = () => {
          if (this.connected) {
            resolve(true);
          } else if (!this.isConnecting) {
            // Connection failed, try again
            this.connect().then(resolve);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    this.isConnecting = true;
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.config.bridgeUrl}?session=${this.sessionKey}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('Connected to MCP Bridge');
          // Use setTimeout to ensure WebSocket is fully ready
          setTimeout(() => this.authenticate(), 0);
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('Disconnected from MCP Bridge:', event.code, event.reason);
          this.connected = false;
          this.isConnecting = false;
          this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        // Resolve when authenticated
        const checkConnection = () => {
          if (this.connected) {
            this.isConnecting = false;
            resolve(true);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        setTimeout(checkConnection, 100);

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private authenticate() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const authMessage = {
      type: 'authenticate',
      sessionKey: this.sessionKey,
      authToken: this.authToken,
      origin: window.location.origin,
      pageTitle: document.title,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };

    this.ws.send(JSON.stringify(authMessage));
  }

  private handleMessage(message: BridgeMessage) {
    switch (message.type) {
      case 'authenticated':
        this.connected = true;

        // Capture MCP port from bridge response and update config
        if (message.mcpPort) {
          this.mcpPort = message.mcpPort;
          this.updateMcpConfig();
        }

        this.registerAllTools();
        break;

      case 'tool-call':
        this.handleToolCall(message);
        break;

      default:
        console.warn('Unknown message type:', (message as unknown as { type: string }).type);
    }
  }

  private async handleToolCall(message: BridgeMessage & { type: 'tool-call' }) {
    const { requestId, toolName, toolInput } = message;

    try {
      const tool = this.tools.get(toolName);
      if (!tool) {
        this.sendToolResponse(requestId, { error: `Tool '${toolName}' not found` });
        return;
      }

      console.log('calling tool', toolName, toolInput, message);

      // Execute the tool
      const result = await tool.handler(toolInput);

      this.sendToolResponse(requestId, { success: true, data: result });

    } catch (error) {
      console.error(`Tool execution error for ${toolName}:`, error);
      this.sendToolResponse(requestId, {
        error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  private sendToolResponse(requestId: string, result: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('Cannot send tool response: WebSocket not connected');
      return;
    }

    const response = {
      type: 'tool-response',
      requestId,
      result
    };

    this.ws.send(JSON.stringify(response));
  }

  private registerAllTools() {
    this.tools.forEach((tool) => {
      this.registerTool(tool);
    });
  }

  private registerTool(tool: ToolDefinition) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'register-tool',
      tool: {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  private scheduleReconnect() {
    setTimeout(() => {
      if (!this.connected) {
        console.log('Attempting to reconnect...');
        this.connect().catch(console.error);
      }
    }, 5000);
  }

  private updateMcpConfig() {
    if (!this.mcpPort) return;

    // Determine protocol and host from bridge URL
    const bridgeUrl = new URL(this.config.bridgeUrl.replace('ws:', 'http:').replace('wss:', 'https:'));
    const protocol = bridgeUrl.protocol;
    const hostname = bridgeUrl.hostname;

    // Update the MCP_SERVER_URL with the correct port
    this.mcpConfig[this.config.name].env.MCP_SERVER_URL = `${protocol}//${hostname}:${this.mcpPort}`;

    console.log(`Updated MCP server URL to: ${this.mcpConfig[this.config.name].env.MCP_SERVER_URL}`);
  }

  private setupActivityTracking() {
    const updateActivity = () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'activity',
          timestamp: Date.now()
        }));
      }
    };

    // Track user activity
    ['click', 'scroll', 'keydown', 'mousemove'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Periodic activity update
    setInterval(updateActivity, 30000); // Every 30 seconds
  }


  // Public API methods

  /**
   * Add a tool that can be called by Claude Desktop
   */
  addTool(tool: ToolDefinition): void {
    // Validate the tool definition using Zod schema
    const validationResult = ToolDefinitionSchema.safeParse(tool);
    if (!validationResult.success) {
      throw new Error(`Invalid tool definition: ${validationResult.error.message}`);
    }

    // Convert Zod schema to JSON Schema if needed
    const processedTool = { ...validationResult.data };
    if (processedTool.inputSchema && typeof processedTool.inputSchema === 'object' && 'safeParse' in processedTool.inputSchema) {
      processedTool.inputSchema = z.toJSONSchema(processedTool.inputSchema as z.ZodSchema);
    }
    if (processedTool.outputSchema && typeof processedTool.outputSchema === 'object' && 'safeParse' in processedTool.outputSchema) {
      processedTool.outputSchema = z.toJSONSchema(processedTool.outputSchema as z.ZodSchema);
    }

    console.log('Adding tool', processedTool.name, processedTool.inputSchema);

    this.tools.set(processedTool.name, processedTool);

    // Register immediately if connected
    if (this.connected) {
      this.registerTool(processedTool);
    }

    console.log(`Tool registered: ${processedTool.name}`);
  }

  /**
   * Remove a tool
   */
  removeTool(name: string) {
    this.tools.delete(name);
    console.log(`Tool removed: ${name}`);
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Disconnect from bridge
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  /**
   * Get list of registered tools
   */
  getTools(): string[] {
    return Array.from(this.tools.keys());
  }
}

export default MCPWeb;
