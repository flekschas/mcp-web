import type {
  BridgeMessage,
  RegisterResourceMessage,
  RegisterToolMessage,
  ToolRegistrationErrorMessage,
  UnregisterResourceMessage,
  UnregisterToolMessage,
} from '@mcp-web/bridge';
import type { SplitPlan } from '@mcp-web/decompose-zod-schema';
import type {
  AppDefinition,
  CodeMode,
  CodeToolLike,
  CreatedApp,
  MCPWebConfig,
  MCPWebConfigOutput,
  ProcessedAppDefinition,
  ProcessedContextItem,
  ProcessedToolDefinition,
  Query,
  ResourceDefinition,
  ToolDefinition,
  ToolRegistrationError,
} from '@mcp-web/types';
import {
  AppDefinitionSchema,
  checkResultShape,
  deriveRoomId,
  getDefaultAppResourceUri,
  getDefaultAppUrl,
  getMcpOutputSchema,
  isCreatedApp,
  isErrorResult,
  MCP_APP_TOOL_NAME,
  McpWebConfigSchema,
  QueryMessageSchema,
  RESOURCE_MIME_TYPE,
  ResourceDefinitionSchema,
  type Tool,
  ToolDefinitionSchema,
  toCallToolResult,
} from '@mcp-web/types';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import {
  type CreatedStateTools,
  type CreatedStateToolsBasic,
  type CreatedStateToolsExpanded,
  type CreateStateToolsConfig,
  createStateTools,
  isCreatedStateTools,
} from './create-state-tools.js';
import { type CreatedTool, isCreatedTool } from './create-tool.js';
import {
  connectToMCPAppHost,
  describeState,
  type MCPAppHost,
  runsAsMCPAppView,
} from './mcp-app-host.js';
import { QueryResponse } from './query.js';
import { QueryRequestSchema, QueryResponseResultSchema } from './schemas.js';
import type { QueryRequest, QueryResponseResult } from './types.js';
import {
  getOutputValidator,
  toJSONSchema,
  toOutputJSONSchema,
  toToolMetadataJson,
} from './utils.js';

/**
 * Main class for integrating web applications with AI agents via the Model Context Protocol (MCP).
 *
 * MCPWeb enables your web application to expose state and actions as tools that AI agents can
 * interact with. It handles the WebSocket connection to the bridge server, tool registration,
 * and bi-directional communication between your frontend and AI agents.
 *
 * @example Basic Usage
 * ```typescript
 * import { MCPWeb } from '@mcp-web/core';
 *
 * const mcp = new MCPWeb({
 *   name: 'My Todo App',
 *   description: 'A todo application that AI agents can control',
 *   autoConnect: true,
 * });
 *
 * // Register a tool
 * mcp.addTool({
 *   name: 'create_todo',
 *   description: 'Create a new todo item',
 *   handler: (input) => {
 *     const todo = { id: crypto.randomUUID(), ...input };
 *     todos.push(todo);
 *     return todo;
 *   },
 * });
 * ```
 *
 * @example With Full Configuration
 * ```typescript
 * const mcp = new MCPWeb({
 *   name: 'Checkers Game',
 *   description: 'Interactive checkers game controllable by AI agents',
 *   bridgeUrl: 'localhost:3001',
 *   icon: 'https://example.com/icon.svg',
 *   agentUrl: 'localhost:3003',
 *   autoConnect: true,
 * });
 * ```
 */
export class MCPWeb {
  #ws: WebSocket | null = null;
  #sessionId: string;
  #authToken: string;
  #bridgeUrl: string;
  #tools = new Map<string, ProcessedToolDefinition>();
  #resources = new Map<string, ResourceDefinition>();
  #apps = new Map<string, ProcessedAppDefinition>();
  #connected = false;
  #isConnecting = false;
  #authError: { error: string; code: string } | null = null;
  #connectionStateListeners = new Set<() => void>();
  #roomIdPromise: Promise<string | undefined> | undefined;
  #disconnectEpoch = 0;
  #lastActivityAt = Date.now();
  #idle = false;
  #idleTimer: ReturnType<typeof setTimeout> | undefined;
  #pendingCalls = 0;
  #reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  #appHost: MCPAppHost | null = null;
  #appHostAttempt: Promise<MCPAppHost | null> | undefined;
  #appHostAbort: AbortController | undefined;
  #emptyAppHost:
    | { abort: AbortController; host: Promise<MCPAppHost | null> }
    | undefined;
  #isMCPApp = false;
  /** The getter of each state added with `addStateTools`, by state name. */
  #stateGetters = new Map<string, () => unknown>();

  /** Update connected state and notify listeners on change */
  #setConnected(value: boolean) {
    if (this.#connected !== value) {
      this.#connected = value;
      this.#notifyConnectionStateChange();
    }
  }

  /** Update connecting state and notify listeners on change */
  #setIsConnecting(value: boolean) {
    if (this.#isConnecting !== value) {
      this.#isConnecting = value;
      this.#notifyConnectionStateChange();
    }
  }
  #config: MCPWebConfigOutput;
  #outputValidators = new WeakMap<
    ProcessedToolDefinition,
    (output: unknown) => unknown
  >();
  #toolRegistrationErrorCallbacks = new Map<
    string,
    (error: ToolRegistrationError) => void
  >();
  #mcpConfig: {
    [serverName: string]: {
      command: 'npx';
      args: ['@mcp-web/client'];
      env: {
        MCP_SERVER_URL: string;
        AUTH_TOKEN: string;
      };
    };
  };

  /**
   * Creates a new MCPWeb instance with the specified configuration.
   *
   * The constructor initializes the WebSocket connection settings, generates or loads
   * authentication credentials, and optionally auto-connects to the bridge server.
   *
   * @param config - Configuration object for MCPWeb
   * @throws {Error} If configuration validation fails
   *
   * @example
   * ```typescript
   * const mcp = new MCPWeb({
   *   name: 'My Todo App',
   *   description: 'A todo application that AI agents can control',
   * });
   * ```
   */
  constructor(config: MCPWebConfig) {
    this.#config = McpWebConfigSchema.parse(config);
    this.#isMCPApp = !!this.#config.mcpApp && runsAsMCPAppView();
    this.#bridgeUrl =
      this.#config.bridgeUrl ??
      globalThis.window?.location?.host ??
      'localhost:3001';
    this.#sessionId = this.#generateSessionId();
    this.#authToken = this.#resolveAuthToken(this.#config);

    this.#mcpConfig = {
      [this.#config.name]: {
        command: 'npx',
        args: ['@mcp-web/client'],
        env: {
          MCP_SERVER_URL: `${this.#getHttpProtocol()}//${this.#bridgeUrl}`,
          AUTH_TOKEN: this.#authToken,
        },
      },
    };

    if (this.#config.autoConnect) {
      this.connect().catch((error) => {
        console.error('Auto-connect failed:', error);
      });
    }

    this.setupActivityTracking();
  }

  /**
   * Unique session identifier for this frontend instance.
   *
   * The session ID is automatically generated on construction.
   * It's used to identify this specific frontend instance in the bridge server.
   *
   * @returns The session ID string
   */
  get sessionId() {
    return this.#sessionId;
  }

  /**
   * Authentication token for this session.
   *
   * The auth token is either auto-generated, loaded from localStorage, or provided via config.
   * By default, it's persisted in localStorage to maintain the same token across page reloads.
   *
   * @returns The authentication token string
   */
  get authToken() {
    return this.#authToken;
  }

  /**
   * Map of all registered tools.
   *
   * Provides access to the internal tool registry. Each tool is keyed by its name.
   *
   * @returns Map of tool names to processed tool definitions
   */
  get tools() {
    return this.#tools;
  }

  /**
   * Map of all registered resources.
   *
   * Provides access to the internal resource registry. Each resource is keyed by its URI.
   *
   * @returns Map of resource URIs to resource definitions
   */
  get resources() {
    return this.#resources;
  }

  /**
   * Map of all registered MCP Apps.
   *
   * Provides access to the internal app registry. Each app is keyed by its name.
   *
   * @returns Map of app names to processed app definitions
   */
  get apps() {
    return this.#apps;
  }

  /**
   * The processed MCPWeb configuration.
   *
   * Returns the validated and processed configuration with all defaults applied.
   *
   * @returns The complete configuration object
   */
  get config() {
    return this.#config;
  }

  /**
   * Configuration object for the AI host app (e.g., Claude Desktop) using stdio transport.
   *
   * Use this to configure the MCP client in your AI host application.
   * It contains the connection details and authentication credentials needed
   * for the AI agent to connect to the bridge server via the `@mcp-web/client` stdio wrapper.
   *
   * For a simpler configuration, consider using `remoteMcpConfig` instead, which
   * uses Remote MCP (Streamable HTTP) and doesn't require an intermediate process.
   *
   * @returns MCP client configuration object for stdio transport
   *
   * @example
   * ```typescript
   * console.log('Add this to your Claude Desktop config:');
   * console.log(JSON.stringify(mcp.mcpConfig, null, 2));
   * ```
   */
  get mcpConfig() {
    return this.#mcpConfig;
  }

  /**
   * Configuration object for the AI host app (e.g., Claude Desktop) using Remote MCP.
   *
   * This is the recommended configuration method. It uses Remote MCP (Streamable HTTP)
   * to connect directly to the bridge server via URL, without needing an intermediate
   * stdio process like `@mcp-web/client`.
   *
   * @returns MCP client configuration object for Remote MCP (URL-based)
   *
   * @example
   * ```typescript
   * console.log('Add this to your Claude Desktop config:');
   * console.log(JSON.stringify(mcp.remoteMcpConfig, null, 2));
   * // Output:
   * // {
   * //   "my-app": {
   * //     "url": "https://localhost:3001?token=your-auth-token"
   * //   }
   * // }
   * ```
   */
  get remoteMcpConfig() {
    return {
      [this.#config.name]: {
        url: `${this.#getHttpProtocol()}//${this.#bridgeUrl}?token=${this.#authToken}`,
      },
    };
  }

  #getBridgeWsUrl(): string {
    return `${this.#getWsProtocol()}//${this.#bridgeUrl}`;
  }

  /**
   * Room for this session's auth token, memoized across reconnects.
   *
   * Sent on the WebSocket URL so sharded bridges can pick an object at upgrade
   * time, before the `authenticate` message arrives. Single-process bridges
   * ignore it, and it is absent without Web Crypto.
   */
  #getRoomId(): Promise<string | undefined> {
    this.#roomIdPromise ??= deriveRoomId(this.#authToken);
    return this.#roomIdPromise;
  }

  #getWsProtocol(): 'ws:' | 'wss:' {
    return globalThis.window?.location?.protocol === 'https:' ? 'wss:' : 'ws:';
  }

  #getHttpProtocol(): 'http:' | 'https:' {
    return globalThis.window?.location?.protocol === 'https:'
      ? 'https:'
      : 'http:';
  }

  #generateSessionId(): string {
    return globalThis.crypto.randomUUID();
  }

  #generateAuthToken(): string {
    return globalThis.crypto.randomUUID();
  }

  #loadAuthToken(): string | null {
    try {
      return globalThis.localStorage?.getItem('mcp-web-auth-token');
    } catch (error) {
      console.warn('Failed to load auth token from localStorage:', error);
      return null;
    }
  }

  #saveAuthToken(token: string): void {
    try {
      globalThis.localStorage?.setItem('mcp-web-auth-token', token);
    } catch (error) {
      console.warn('Failed to save auth token to localStorage:', error);
    }
  }

  #resolveAuthToken(config: MCPWebConfig): string {
    // Use provided auth token if available
    if (config.authToken) {
      // Save it to localStorage if persistence is enabled
      if (config.persistAuthToken !== false) {
        this.#saveAuthToken(config.authToken);
      }
      return config.authToken;
    }

    // Try to load from localStorage if persistence is enabled
    if (config.persistAuthToken !== false) {
      const savedToken = this.#loadAuthToken();
      if (savedToken) {
        return savedToken;
      }
    }

    // Generate new token
    const newToken = this.#generateAuthToken();

    // Save it if persistence is enabled
    if (config.persistAuthToken !== false) {
      this.#saveAuthToken(newToken);
    }

    return newToken;
  }

  /**
   * Connects to the bridge server, or to the MCP App host when the page runs
   * as a view opened through `mcpApp`.
   *
   * In a view, the tools are offered to the host as app tools, and the state
   * of `addStateTools()` states is sent to the host for the model. Otherwise,
   * it opens a WebSocket connection to the bridge and authenticates with the
   * session's auth token.
   * Set `disableAppTools` to always use the bridge. If `autoConnect` is
   * enabled in the config, this is called automatically during construction.
   *
   * This method is idempotent - calling it multiple times while already connected or
   * connecting will return the same promise.
   *
   * @returns Promise that resolves to `true` when authenticated and ready, or
   *   `false` if `disconnect()` cancelled the attempt or the handshake with
   *   the MCP App host failed
   * @throws {Error} If WebSocket connection fails
   *
   * @example Manual Connection
   * ```typescript
   * const mcp = new MCPWeb({
   *   name: 'My App',
   *   description: 'My application',
   *   autoConnect: false,  // Disable auto-connect
   * });
   *
   * // Connect when ready
   * await mcp.connect();
   * console.log(mcp.isMCPApp ? 'Runs in an MCP App host' : 'Uses the bridge');
   * ```
   *
   * @example Check Connection Status
   * ```typescript
   * if (!mcp.connected) {
   *   await mcp.connect();
   * }
   * ```
   */
  connect(): Promise<boolean> {
    this.#idle = false;
    this.#lastActivityAt = Date.now();
    if (this.#isMCPApp) {
      if (!this.#config.disableAppTools) return this.#connectToAppHost();
      this.#greetAppHost();
    }
    return this.#connect();
  }

  /**
   * With `disableAppTools`, the view still does the handshake with the host,
   * which hosts may wait for, but offers no tools. A failed handshake is
   * tried again on the next `connect()`, and `disconnect()` ends it.
   */
  #greetAppHost() {
    if (this.#emptyAppHost) return;
    const abort = new AbortController();
    const greeting = {
      abort,
      host: connectToMCPAppHost(
        {
          name: this.#config.name,
          version: this.#config.version,
          listTools: () => [],
          callTool: async (name) => ({
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          }),
          describeState: () => undefined,
        },
        { signal: abort.signal },
      ),
    };
    this.#emptyAppHost = greeting;
    greeting.host.then((host) => {
      if (!host && this.#emptyAppHost === greeting) {
        this.#emptyAppHost = undefined;
      }
    });
  }

  #closeEmptyAppHost() {
    const greeting = this.#emptyAppHost;
    if (!greeting) return;
    this.#emptyAppHost = undefined;
    greeting.abort.abort();
    greeting.host.then((host) => host?.close()).catch(console.error);
  }

  /**
   * Offers the tools to the MCP App host that shows this page as a view. The
   * bridge is not a fallback: a view runs inside the host, where the bridge
   * is usually out of reach. A failed handshake can be retried with
   * `connect()`.
   */
  async #connectToAppHost(): Promise<boolean> {
    if (this.#appHost) return true;
    const epoch = this.#disconnectEpoch;
    this.#appHostAttempt ??= this.#startAppHost();
    const host = await this.#appHostAttempt;
    return epoch === this.#disconnectEpoch && host !== null;
  }

  async #startAppHost(): Promise<MCPAppHost | null> {
    const epoch = this.#disconnectEpoch;
    const abort = new AbortController();
    this.#appHostAbort = abort;
    this.#setIsConnecting(true);
    const host = await connectToMCPAppHost(
      {
        name: this.#config.name,
        version: this.#config.version,
        listTools: () => this.#listAppTools(),
        callTool: (name, args) => this.#callAppTool(name, args),
        describeState: () =>
          describeState(this.#config.name, this.#stateGetters),
      },
      { signal: abort.signal },
    );
    // disconnect() was called during the handshake.
    if (epoch !== this.#disconnectEpoch) {
      await host?.close();
      return null;
    }
    this.#appHostAbort = undefined;
    this.#setIsConnecting(false);
    if (!host) {
      this.#appHostAttempt = undefined;
      return null;
    }
    this.#appHost = host;
    this.#setConnected(true);
    host.sendState();
    return host;
  }

  /**
   * Whether a tool is offered to an MCP App host. A tool that opens a view is
   * not, because it needs the bridge to serve its `ui://` resource. Both the
   * nested and the older flat spelling of the resource URI count.
   */
  #isAppTool(tool: ProcessedToolDefinition): boolean {
    const meta = tool._meta as
      | { ui?: { resourceUri?: unknown }; 'ui/resourceUri'?: unknown }
      | undefined;
    return (
      meta?.ui?.resourceUri === undefined &&
      meta?.['ui/resourceUri'] === undefined
    );
  }

  #listAppTools(): Tool[] {
    const tools: Tool[] = [];
    for (const tool of this.tools.values()) {
      if (!this.#isAppTool(tool)) continue;
      const inputSchema = tool.inputJsonSchema;
      const outputSchema = getMcpOutputSchema(tool.outputJsonSchema);
      tools.push({
        name: tool.name,
        description: tool.description,
        inputSchema:
          inputSchema?.type === 'object'
            ? (inputSchema as Tool['inputSchema'])
            : { type: 'object' },
        ...(outputSchema ? { outputSchema } : {}),
        ...(tool._meta ? { _meta: tool._meta } : {}),
      });
    }
    return tools;
  }

  async #callAppTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<CallToolResult> {
    const tool = this.tools.get(name);
    const result =
      tool && this.#isAppTool(tool)
        ? await this.#runTool(name, args)
        : { error: `Tool '${name}' not found` };
    this.#appHost?.stateChanged();
    const outputSchema = getMcpOutputSchema(tool?.outputJsonSchema);
    try {
      return toCallToolResult(
        checkResultShape(result, outputSchema),
        outputSchema,
      );
    } catch (error) {
      // For example, a result with a bigint can't be turned into JSON.
      return toCallToolResult({
        error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  async #connect(): Promise<boolean> {
    if (this.#config.idleTimeoutMs && this.#idleTimer === undefined) {
      this.#scheduleIdleCheck(this.#config.idleTimeoutMs);
    }

    // Prevent duplicate connections
    if (this.#connected) {
      return Promise.resolve(true);
    }
    if (this.#isConnecting) {
      const epoch = this.#disconnectEpoch;
      // Return a promise that resolves when the current connection completes
      return new Promise((resolve) => {
        const checkConnection = () => {
          if (this.#connected) {
            resolve(true);
          } else if (epoch !== this.#disconnectEpoch) {
            // A disconnect landed while waiting; opening a socket now would
            // outlive the teardown that cancelled it.
            resolve(false);
          } else if (!this.#isConnecting) {
            // Connection failed, try again
            this.#connect().then(resolve);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    this.#setIsConnecting(true);
    this.#authError = null;

    const epoch = this.#disconnectEpoch;
    const roomId = await this.#getRoomId();

    // A disconnect can land while the room is being derived. The caller asked
    // for the teardown, so this resolves rather than rejecting. The flag stays
    // as it is: disconnect() cleared it, and a later attempt may own it by now.
    if (epoch !== this.#disconnectEpoch) {
      return false;
    }

    return new Promise((resolve, reject) => {
      try {
        const query = roomId
          ? `?session=${this.sessionId}&room=${roomId}`
          : `?session=${this.sessionId}`;
        const wsUrl = `${this.#getBridgeWsUrl()}${query}`;
        this.#ws = new WebSocket(wsUrl);
        this.#pendingCalls = 0;

        this.#ws.onopen = () => {
          // Use setTimeout to ensure WebSocket is fully ready
          setTimeout(() => this.authenticate(), 0);
        };

        this.#ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.#ws.onclose = () => {
          this.#setConnected(false);
          this.#setIsConnecting(false);
          // Don't reconnect if authentication was rejected
          if (!this.#authError) {
            this.scheduleReconnect();
          }
        };

        // The poll below has no other stop condition, so a failed socket would
        // leave one running per attempt while the bridge is down.
        let failed = false;

        this.#ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          failed = true;
          this.#setIsConnecting(false);
          reject(error);
        };

        // Resolve when authenticated, reject on auth failure
        const checkConnection = () => {
          // Already rejected by onerror.
          if (failed) {
            return;
          }
          // A disconnect during the handshake removes the socket handlers that
          // would otherwise settle this attempt.
          if (epoch !== this.#disconnectEpoch) {
            resolve(false);
            return;
          }
          if (this.#connected) {
            this.#setIsConnecting(false);
            resolve(true);
          } else if (this.#authError) {
            this.#setIsConnecting(false);
            reject(new Error(this.#authError.error));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        setTimeout(checkConnection, 100);
      } catch (error) {
        this.#setIsConnecting(false);
        reject(error);
      }
    });
  }

  private authenticate() {
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) return;

    const authMessage = {
      type: 'authenticate',
      sessionId: this.sessionId,
      authToken: this.#authToken,
      origin: globalThis.window?.location?.origin,
      pageTitle: globalThis.document?.title,
      sessionName: this.#config.sessionName,
      userAgent: globalThis.navigator?.userAgent,
      timestamp: Date.now(),
    };

    this.#ws.send(JSON.stringify(authMessage));
  }

  private handleMessage(message: BridgeMessage) {
    switch (message.type) {
      case 'authenticated':
        this.#setConnected(true);

        this.registerAllTools();
        this.registerAllResources();
        break;

      case 'authentication-failed': {
        const failedMessage = message as unknown as {
          error: string;
          code: string;
        };
        this.#authError = {
          error: failedMessage.error,
          code: failedMessage.code,
        };
        break;
      }

      case 'tool-call':
        this.#trackCall(this.handleToolCall(message));
        break;

      case 'resource-read':
        this.#trackCall(this.handleResourceRead(message));
        break;

      case 'tool-registration-error':
        this.handleToolRegistrationError(
          message as ToolRegistrationErrorMessage,
        );
        break;

      case 'query_accepted':
      case 'query_progress':
      case 'query_failure':
      case 'query_complete':
      case 'query_cancel':
        this.#lastActivityAt = Date.now();
        // Query responses are handled by query-specific listeners in query() method
        // (see line ~498 where addEventListener('message') is set up per query)
        break;

      default:
        console.warn(
          'Unknown message type:',
          (message as unknown as { type: string }).type,
        );
    }
  }

  private async handleToolCall(message: BridgeMessage & { type: 'tool-call' }) {
    const { requestId, toolName, toolInput } = message;
    const result = await this.#runTool(toolName, toolInput);
    try {
      // Send the raw result - the bridge will handle formatting
      this.sendToolResponse(requestId, result);
    } catch (error) {
      // For example, a result with a bigint can't be sent as JSON.
      this.sendToolResponse(requestId, {
        error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /** Runs a tool and returns its result, or `{ error }` if it fails. */
  async #runTool(toolName: string, toolInput: unknown): Promise<unknown> {
    try {
      const tool = this.tools.get(toolName);
      if (!tool) {
        return { error: `Tool '${toolName}' not found` };
      }

      if (tool.inputZodSchema) {
        const parsedToolInput = tool.inputZodSchema.safeParse(toolInput);
        if (!parsedToolInput.success) {
          return { error: `Invalid input: ${parsedToolInput.error.message}` };
        }
      }

      // Execute the tool
      const result = await tool.handler(toolInput);

      // MCP clients reject a result that doesn't match the output schema. An
      // error result is returned as is, so its message reaches the client.
      const validateResult = this.#outputValidators.get(tool);
      if (validateResult && !isErrorResult(result)) {
        try {
          return validateResult(result);
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      return result;
    } catch (error) {
      // Only log in non-test environments
      if (globalThis.process?.env?.NODE_ENV !== 'test') {
        console.debug(`Tool execution error for ${toolName}:`, error);
      }
      return {
        error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private sendToolResponse(requestId: string, result: unknown) {
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) {
      console.error('Cannot send tool response: WebSocket not connected');
      return;
    }

    const response = {
      type: 'tool-response',
      requestId,
      result,
    };

    this.#ws.send(JSON.stringify(response));
  }

  private registerAllTools() {
    this.tools.forEach((tool) => {
      this.registerTool(tool);
    });
  }

  private registerTool(tool: ProcessedToolDefinition) {
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'register-tool',
      tool: {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputJsonSchema,
        outputSchema: tool.outputJsonSchema,
        // Forward _meta (e.g., _meta.ui.resourceUri for MCP Apps)
        ...(tool._meta ? { _meta: tool._meta } : {}),
      },
    } satisfies RegisterToolMessage;

    this.#ws.send(JSON.stringify(message));
  }

  private registerAllResources() {
    this.resources.forEach((resource) => {
      this.registerResource(resource);
    });
  }

  private registerResource(resource: ResourceDefinition) {
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'register-resource',
      resource: {
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType ?? 'text/html',
      },
    } satisfies RegisterResourceMessage;

    this.#ws.send(JSON.stringify(message));
  }

  private async handleResourceRead(
    message: BridgeMessage & { type: 'resource-read' },
  ) {
    const { requestId, uri } = message;

    try {
      const resource = this.resources.get(uri);
      if (!resource) {
        this.sendResourceResponse(requestId, {
          error: `Resource '${uri}' not found`,
          mimeType: 'text/plain',
        });
        return;
      }

      const content = await resource.handler();
      const mimeType = resource.mimeType ?? 'text/html';

      if (content instanceof Uint8Array) {
        const base64 = btoa(String.fromCharCode(...content));
        this.sendResourceResponse(requestId, { blob: base64, mimeType });
      } else {
        this.sendResourceResponse(requestId, { content, mimeType });
      }
    } catch (error) {
      if (globalThis.process?.env?.NODE_ENV !== 'test') {
        console.debug(`Resource read error for ${uri}:`, error);
      }
      this.sendResourceResponse(requestId, {
        error: `Resource read failed: ${error instanceof Error ? error.message : String(error)}`,
        mimeType: 'text/plain',
      });
    }
  }

  private sendResourceResponse(
    requestId: string,
    result: {
      content?: string;
      blob?: string;
      mimeType: string;
      error?: string;
    },
  ) {
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) {
      console.error('Cannot send resource response: WebSocket not connected');
      return;
    }

    const response = {
      type: 'resource-response',
      requestId,
      ...result,
    };

    this.#ws.send(JSON.stringify(response));
  }

  private handleToolRegistrationError(message: ToolRegistrationErrorMessage) {
    const { toolName, error, message: errorMessage } = message;

    // Remove the tool since the bridge rejected it
    this.tools.delete(toolName);

    // Call the per-tool callback if registered
    const callback = this.#toolRegistrationErrorCallbacks.get(toolName);
    if (callback) {
      this.#toolRegistrationErrorCallbacks.delete(toolName);
      callback({ toolName, code: error, message: errorMessage });
    } else {
      // No callback registered — log a warning so the error isn't silently lost
      console.warn(
        `Tool registration rejected by bridge: '${toolName}' — ${errorMessage}`,
      );
    }
  }

  private scheduleReconnect() {
    if (!this.#ws) return;
    // Signal that we intend to reconnect so consumers (e.g. React hooks)
    // can show a "connecting" state instead of "disconnected".
    this.#setIsConnecting(true);
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = undefined;
      if (!this.#connected && this.#ws) {
        // connect() reads the flag as "an attempt is already running" and would
        // only poll for it, so the intent flag is cleared before the call.
        this.#setIsConnecting(false);
        this.#connect().catch(console.error);
      } else {
        this.#setIsConnecting(false);
      }
    }, 5000);
  }

  private setupActivityTracking() {
    const onUserActivity = () => {
      this.#lastActivityAt = Date.now();
      this.#appHost?.stateChanged();
      if (this.#idle) {
        this.#idle = false;
        this.#connect().catch(console.error);
      }
    };

    if (globalThis.document) {
      // Capture, so components that stop propagation still count as activity.
      for (const event of ['pointerdown', 'pointermove', 'keydown', 'wheel']) {
        globalThis.document.addEventListener(event, onUserActivity, {
          passive: true,
          capture: true,
        });
      }
      globalThis.document.addEventListener('visibilitychange', () => {
        if (globalThis.document.visibilityState === 'visible') {
          onUserActivity();
        }
      });
      // A frozen page runs no timers, so the idle check could not fire.
      globalThis.document.addEventListener('freeze', () => {
        if (this.#config.idleTimeoutMs) this.#goIdle();
      });
    }

    // Reports the last activity every 30 seconds. Each message is a billed
    // request on hosted bridges.
    setInterval(() => {
      if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
        this.#ws.send(
          JSON.stringify({
            type: 'activity',
            timestamp: this.#lastActivityAt,
          }),
        );
      }
    }, 30000);
  }

  #scheduleIdleCheck(delay: number) {
    this.#idleTimer = setTimeout(() => {
      this.#idleTimer = undefined;
      const disconnectAt = this.idleDisconnectAt;
      if (disconnectAt === undefined) return;

      const remaining = disconnectAt - Date.now();
      if (remaining > 0) {
        this.#scheduleIdleCheck(remaining);
      } else {
        this.#goIdle();
      }
    }, delay);
  }

  #goIdle() {
    // Idle disconnects are for the bridge. A host connection costs nothing.
    if (this.#appHost || this.#appHostAttempt) return;
    if (!(this.#connected || this.#isConnecting)) return;
    this.#idle = true;
    this.#close();
  }

  /**
   * A call counts as activity from when it arrives until it is answered, for
   * at most one idle timeout, and only on the socket it arrived on.
   */
  #trackCall(call: Promise<void>) {
    const idleTimeout = this.#config.idleTimeoutMs;
    if (!idleTimeout) return;

    const ws = this.#ws;
    this.#pendingCalls++;
    this.#lastActivityAt = Date.now();

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(limit);
      if (this.#ws !== ws) return;
      this.#pendingCalls--;
      this.#lastActivityAt = Date.now();
    };
    const limit = setTimeout(done, idleTimeout);
    call.then(done, done);
  }

  /**
   * Registers a tool that AI agents can call.
   *
   * Supports both Zod schemas (recommended for type safety) and JSON schemas.
   * When using Zod schemas, TypeScript enforces that your handler signature matches the schemas.
   *
   * Can also accept pre-created tools from `createTool()`.
   *
   * @param tool - Tool configuration including name, description, handler, and schemas, or a CreatedTool
   * @returns The registered tool definition that can be used as context or responseTool in queries
   * @throws {Error} If tool definition is invalid
   *
   * @example Basic Tool
   * ```typescript
   * mcp.addTool({
   *   name: 'get_current_time',
   *   description: 'Get the current time in ISO format',
   *   handler: () => ({ time: new Date().toISOString() }),
   * });
   * ```
   *
   * @example With Pre-Created Tool
   * ```typescript
   * import { createTool } from '@mcp-web/core';
   *
   * const timeTool = createTool({
   *   name: 'get_current_time',
   *   description: 'Get the current time',
   *   handler: () => ({ time: new Date().toISOString() }),
   * });
   *
   * mcp.addTool(timeTool);
   * ```
   *
   * @example With Zod Schema (Recommended)
   * ```typescript
   * import { z } from 'zod';
   *
   * const CreateTodoSchema = z.object({
   *   title: z.string().describe('Todo title'),
   *   description: z.string().optional().describe('Optional description'),
   * });
   *
   * mcp.addTool({
   *   name: 'create_todo',
   *   description: 'Create a new todo item',
   *   handler: (input) => {
   *     const todo = {
   *       id: crypto.randomUUID(),
   *       ...input,
   *       completed: false,
   *     };
   *     todos.push(todo);
   *     return todo;
   *   },
   *   inputSchema: CreateTodoSchema,
   *   outputSchema: z.object({
   *     id: z.string(),
   *     title: z.string(),
   *     description: z.string(),
   *     completed: z.boolean(),
   *   }),
   * });
   * ```
   *
   * @example With JSON Schema
   * Only a Zod schema is checked before the handler runs. With a JSON Schema,
   * the handler has to check its input itself.
   * ```typescript
   * mcp.addTool({
   *   name: 'search_items',
   *   description: 'Search for items by keyword',
   *   handler: ({ keyword }) => {
   *     return items.filter(item => item.name.includes(keyword));
   *   },
   *   inputSchema: {
   *     type: 'object',
   *     properties: {
   *       keyword: { type: 'string', description: 'Search keyword' }
   *     },
   *     required: ['keyword']
   *   },
   * });
   * ```
   */
  // Overload: CreatedTool
  addTool<
    TInput extends z.ZodObject | undefined = undefined,
    TOutput extends z.ZodType | undefined = undefined,
  >(
    tool: CreatedTool<TInput, TOutput>,
    options?: {
      /** Called if the bridge rejects the tool registration (e.g., schema conflict with a sibling session). */
      onRegistrationError?: (error: ToolRegistrationError) => void;
    },
  ): ToolDefinition;

  // Overload: Zod
  addTool<
    TInput extends z.ZodObject | undefined = undefined,
    TOutput extends z.ZodType | undefined = undefined,
  >(
    tool: {
      name: string;
      description: string;
      handler: TInput extends z.ZodObject
        ? (
            input: z.infer<TInput>,
          ) => TOutput extends z.ZodType
            ? z.infer<TOutput> | Promise<z.infer<TOutput>>
            : void | Promise<void>
        : TOutput extends z.ZodType
          ? () => z.infer<TOutput> | Promise<z.infer<TOutput>>
          : () => void | Promise<void>;
      inputSchema?: TInput;
      outputSchema?: TOutput;
    },
    options?: {
      /** Called if the bridge rejects the tool registration (e.g., schema conflict with a sibling session). */
      onRegistrationError?: (error: ToolRegistrationError) => void;
    },
  ): ToolDefinition;

  // Overload: JSON Schema
  addTool(
    tool: {
      name: string;
      description: string;
      handler: (
        input?: unknown,
      ) => unknown | Promise<unknown> | void | Promise<void>;
      inputSchema?: { type: string; [key: string]: unknown };
      outputSchema?: { type: string; [key: string]: unknown };
      _meta?: Record<string, unknown>;
    },
    options?: {
      /** Called if the bridge rejects the tool registration (e.g., schema conflict with a sibling session). */
      onRegistrationError?: (error: ToolRegistrationError) => void;
    },
  ): ToolDefinition;

  addTool(
    tool: ToolDefinition | CreatedTool,
    options?: {
      onRegistrationError?: (error: ToolRegistrationError) => void;
    },
  ): ToolDefinition {
    // Handle CreatedTool
    if (isCreatedTool(tool)) {
      return this.addTool(tool.definition, options);
    }
    this.#storeTool(this.#prepareTool(tool), options);
    return tool;
  }

  /** Validates a tool and converts its schemas, without registering it. */
  #prepareTool(tool: ToolDefinition): ProcessedToolDefinition {
    const validationResult = ToolDefinitionSchema.safeParse(tool);
    if (!validationResult.success) {
      throw new Error(
        `Invalid tool definition: ${validationResult.error.message}`,
      );
    }
    if (this.#config.mcpApp && tool.name === MCP_APP_TOOL_NAME) {
      throw new Error(
        `The tool name '${MCP_APP_TOOL_NAME}' is taken by the bridge when \`mcpApp\` is set.`,
      );
    }

    const isInputZodSchema =
      validationResult.data.inputSchema &&
      'safeParse' in validationResult.data.inputSchema;
    const isOutputZodSchema =
      validationResult.data.outputSchema &&
      'safeParse' in validationResult.data.outputSchema;

    // Create processed tool with both Zod and JSON schemas
    const processedTool: ProcessedToolDefinition = {
      ...validationResult.data,
      // Preserve _meta from original input (not in Zod schema)
      _meta: tool._meta,
      inputZodSchema: isInputZodSchema
        ? (validationResult.data.inputSchema as z.ZodObject)
        : undefined,
      outputZodSchema: isOutputZodSchema
        ? (validationResult.data.outputSchema as z.ZodType)
        : undefined,
      inputJsonSchema: validationResult.data.inputSchema
        ? toJSONSchema(validationResult.data.inputSchema)
        : undefined,
      outputJsonSchema: validationResult.data.outputSchema
        ? toOutputJSONSchema(validationResult.data.outputSchema)
        : undefined,
    };

    // Wrap handler with input validation if Zod schema is provided
    if (processedTool.inputZodSchema) {
      const originalHandler = processedTool.handler;
      processedTool.handler = async (input: unknown) => {
        const validationResult = processedTool.inputZodSchema?.safeParse(input);
        if (!validationResult?.success) {
          throw new Error(
            `Invalid tool input: ${validationResult?.error?.message}`,
          );
        }
        return originalHandler(validationResult?.data);
      };
    }

    const outputSchema =
      processedTool.outputZodSchema ?? processedTool.outputJsonSchema;
    const validateResult = outputSchema && getOutputValidator(outputSchema);
    if (validateResult) {
      this.#outputValidators.set(processedTool, validateResult);
    }

    return processedTool;
  }

  /** Adds a prepared tool, registering it with the bridge if connected. */
  #storeTool(
    processedTool: ProcessedToolDefinition,
    options?: { onRegistrationError?: (error: ToolRegistrationError) => void },
  ): void {
    this.tools.set(processedTool.name, processedTool);

    // Store registration error callback if provided
    if (options?.onRegistrationError) {
      this.#toolRegistrationErrorCallbacks.set(
        processedTool.name,
        options.onRegistrationError,
      );
    }

    // Register immediately if connected
    if (this.#connected) {
      this.registerTool(processedTool);
    }
    this.#appHost?.toolsChanged();
  }

  /**
   * Registers a code tool and, with `signatures: 'lookup'`, its lookup tool.
   *
   * The tools it wraps are not registered on their own by this call.
   *
   * @param code - The code tool to register, such as a `CodeTool` from
   *   `@mcp-web/tools/code`
   * @returns A function that removes both tools
   * @throws If a tool with the same name is already registered
   *
   * @example
   * ```typescript
   * import { CodeTool, stateTransaction } from '@mcp-web/tools/code';
   *
   * mcp.addCodeTool(new CodeTool({
   *   tools: [addTodo.definition, listTodos.definition], // from createTool
   *   transaction: stateTransaction(
   *     () => store.todos,
   *     (todos) => { store.todos = todos; },
   *   ),
   * }));
   * ```
   */
  addCodeTool(code: CodeToolLike): () => void {
    return this.#addCodeToolGroup(code, []);
  }

  /**
   * Registers a code tool with its lookup tool and `others` as one group:
   * either all of them or, when one is refused here, none. A connected bridge
   * still receives each tool on its own and can refuse one of them.
   *
   * The returned function takes out only what this call registered, so calling
   * it again, or after the names were registered anew, leaves the newer tools
   * alone. It also tears down the code tool's sandbox.
   */
  #addCodeToolGroup(code: CodeToolLike, others: ToolDefinition[]): () => void {
    const tools = [
      code,
      ...(code.lookupTool ? [code.lookupTool] : []),
      ...others,
    ];
    const names = new Set<string>();
    for (const tool of tools) {
      if (names.has(tool.name)) {
        throw new Error(`Two of the tools to register are named ${tool.name}.`);
      }
      names.add(tool.name);
      if (this.tools.has(tool.name)) {
        throw new Error(`A tool named ${tool.name} is already registered.`);
      }
    }

    // All are prepared before any is registered, so a tool refused here
    // leaves nothing behind.
    const registered = tools.map((tool) => this.#prepareTool(tool));
    for (const tool of registered) this.#storeTool(tool);

    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      for (const tool of registered) {
        if (this.tools.get(tool.name) === tool) this.removeTool(tool.name);
      }
      code.destroy?.();
    };
    return remove;
  }

  /**
   * Removes a tool from this browser session.
   *
   * When connected, the bridge updates the session's tool list and notifies
   * subscribed MCP clients.
   * Useful for dynamically disabling features or cleaning up when tools are no longer needed.
   *
   * @param name - Name of the tool to remove
   *
   * @example
   * ```typescript
   * // Remove a specific tool
   * mcp.removeTool('create_todo');
   * ```
   */
  removeTool(name: string) {
    this.#toolRegistrationErrorCallbacks.delete(name);
    if (!this.tools.delete(name)) return;
    this.#appHost?.toolsChanged();

    // Without an open socket there is nothing to tell: reconnecting
    // registers only the remaining tools.
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) return;
    this.#ws.send(
      JSON.stringify({
        type: 'unregister-tool',
        toolName: name,
      } satisfies UnregisterToolMessage),
    );
  }

  /**
   * Registers a resource that AI agents can read.
   *
   * Resources are content that AI agents can request, such as HTML for MCP Apps.
   * The handler function is called when the AI requests the resource content.
   *
   * @param resource - Resource configuration including URI, name, description, and handler
   * @returns The registered resource definition
   * @throws {Error} If resource definition is invalid
   *
   * @example Basic Resource
   * ```typescript
   * mcp.addResource({
   *   uri: 'ui://my-app/statistics.html',
   *   name: 'Statistics View',
   *   description: 'Statistics visualization for the app',
   *   mimeType: 'text/html',
   *   handler: async () => {
   *     const response = await fetch('/mcp-web-apps/statistics.html');
   *     return response.text();
   *   },
   * });
   * ```
   *
   * @example Resource from URL
   * ```typescript
   * mcp.addResource({
   *   uri: 'ui://my-app/chart.html',
   *   name: 'Chart Component',
   *   handler: () => fetch('/components/chart.html').then(r => r.text()),
   * });
   * ```
   */
  addResource(resource: ResourceDefinition): ResourceDefinition {
    const validationResult = ResourceDefinitionSchema.safeParse(resource);
    if (!validationResult.success) {
      throw new Error(
        `Invalid resource definition: ${validationResult.error.message}`,
      );
    }

    this.#resources.set(resource.uri, resource);

    // Register immediately if connected
    if (this.#connected) {
      this.registerResource(resource);
    }

    return resource;
  }

  /**
   * Removes a resource from this browser session.
   *
   * When connected, the bridge updates the session's resource list and
   * notifies subscribed MCP clients.
   *
   * @param uri - URI of the resource to remove
   *
   * @example
   * ```typescript
   * mcp.removeResource('ui://my-app/statistics.html');
   * ```
   */
  removeResource(uri: string) {
    if (!this.#resources.delete(uri)) return;

    // Without an open socket there is nothing to tell: reconnecting
    // registers only the remaining resources.
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) return;
    this.#ws.send(
      JSON.stringify({
        type: 'unregister-resource',
        uri,
      } satisfies UnregisterResourceMessage),
    );
  }

  /**
   * Registers an MCP App that AI agents can invoke to show visual UI.
   *
   * An MCP App combines a tool (that AI calls to get props) with a resource (the HTML UI).
   * When AI calls the tool, the handler returns props. The tool response includes
   * `_meta.ui.resourceUri` which tells the host to fetch and render the app HTML.
   *
   * @param app - App configuration including name, description, handler, and optional URL
   * @returns The registered app definition
   * @throws {Error} If app definition is invalid
   *
   * @example Basic App
   * ```typescript
   * mcp.addApp({
   *   name: 'show_statistics',
   *   description: 'Display statistics visualization',
   *   handler: () => ({
   *     completionRate: 0.75,
   *     totalTasks: 100,
   *     completedTasks: 75,
   *   }),
   * });
   * ```
   *
   * @example With Input Schema
   * ```typescript
   * mcp.addApp({
   *   name: 'show_chart',
   *   description: 'Display a chart with the given data',
   *   inputSchema: z.object({
   *     chartType: z.enum(['bar', 'line', 'pie']).describe('Type of chart'),
   *     title: z.string().describe('Chart title'),
   *   }),
   *   handler: ({ chartType, title }) => ({
   *     chartType,
   *     title,
   *     data: getChartData(),
   *   }),
   * });
   * ```
   *
   * @example With Custom URL
   * ```typescript
   * mcp.addApp({
   *   name: 'show_dashboard',
   *   description: 'Display the main dashboard',
   *   handler: () => getDashboardData(),
   *   url: '/custom/path/dashboard.html',
   * });
   * ```
   *
   * @example With Pre-Created App
   * ```typescript
   * import { createApp } from '@mcp-web/app';
   *
   * const statisticsApp = createApp({
   *   name: 'show_statistics',
   *   description: 'Display statistics',
   *   handler: () => ({ rate: 0.75 }),
   * });
   *
   * mcp.addApp(statisticsApp);
   * ```
   */
  addApp(app: AppDefinition | CreatedApp): AppDefinition {
    // Handle CreatedApp
    if (isCreatedApp(app)) {
      return this.addApp(app.definition);
    }

    const validationResult = AppDefinitionSchema.safeParse(app);
    if (!validationResult.success) {
      throw new Error(
        `Invalid app definition: ${validationResult.error.message}`,
      );
    }

    // Process the app with resolved defaults
    const resolvedUrl = app.url ?? getDefaultAppUrl(app.name);
    const resolvedResourceUri =
      app.resourceUri ?? getDefaultAppResourceUri(app.name);

    const processedApp: ProcessedAppDefinition = {
      ...app,
      resolvedUrl,
      resolvedResourceUri,
    };

    // Create the tool that wraps the handler
    const toolHandler = async (input?: unknown) => {
      // Call the app's handler to get props
      const props = await processedApp.handler(input);

      // Return props with _meta.ui for MCP Apps protocol
      return {
        ...props,
        _meta: {
          ui: {
            resourceUri: resolvedResourceUri,
          },
        },
      };
    };

    // The props schema is the output schema, so props are checked like any
    // tool result. Preparing the tool can throw, so it happens before any
    // state changes.
    const tool = this.#prepareTool({
      name: app.name,
      description: app.description,
      handler: toolHandler,
      inputSchema: app.inputSchema && toJSONSchema(app.inputSchema),
      outputSchema: app.propsSchema,
      // Include _meta.ui in tool description (per ext-apps spec)
      // so the host knows this tool has a UI before calling it
      _meta: {
        ui: {
          resourceUri: resolvedResourceUri,
        },
      },
    });

    this.#apps.set(app.name, processedApp);
    this.#storeTool(tool);

    // Create and register the resource that serves the app HTML
    this.addResource({
      uri: resolvedResourceUri,
      name: `${app.name} UI`,
      description: `HTML UI for ${app.name}`,
      mimeType: RESOURCE_MIME_TYPE,
      handler: async () => {
        // Fetch the HTML from the URL
        const response = await fetch(resolvedUrl);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch app HTML from ${resolvedUrl}: ${response.status}`,
          );
        }
        return response.text();
      },
    });

    return app;
  }

  /**
   * Removes a registered MCP App.
   *
   * After removal, AI agents will no longer be able to invoke this app.
   * This also removes the associated tool and resource.
   *
   * @param name - Name of the app to remove
   *
   * @example
   * ```typescript
   * mcp.removeApp('show_statistics');
   * ```
   */
  removeApp(name: string) {
    const app = this.#apps.get(name);
    if (app) {
      // Remove the tool
      this.removeTool(name);
      // Remove the resource
      this.removeResource(app.resolvedResourceUri);
      // Remove from apps map
      this.#apps.delete(name);
    }
  }

  /**
   * Add state management tools with optional expanded tool generation.
   * When `expand` is true, automatically generates targeted tools for
   * arrays and records instead of a single setter.
   *
   * Can also accept pre-created state tools from `createStateTools()`.
   *
   * @returns Tuple of [getter tool, setter tool(s), cleanup function]
   * - Without schemaSplit and expand: [ToolDefinition, ToolDefinition, () => void]
   * - With schemaSplit or expand: [ToolDefinition, ToolDefinition[], () => void]
   * - With codeMode: [ToolDefinition, ToolDefinition, () => void], where the
   *   second tool is the code tool
   *
   * @example
   * ```typescript
   * // Basic read-write state (returns single setter)
   * const [getTodos, setTodos, cleanup] = mcp.addStateTools({
   *   name: 'todos',
   *   description: 'List of all todos',
   *   get: () => todos,
   *   set: (val) => { todos = val },
   *   schema: TodoListSchema
   * });
   *
   * // With pre-created state tools
   * import { createStateTools } from '@mcp-web/core';
   *
   * const todoTools = createStateTools({
   *   name: 'todos',
   *   description: 'Todo list',
   *   get: () => store.get(todosAtom),
   *   set: (value) => store.set(todosAtom, value),
   *   schema: TodosSchema,
   *   expand: true,
   * });
   *
   * const [getter, setters, cleanup] = mcp.addStateTools(todoTools);
   *
   * // With schema decomposition (returns array of setters)
   * const [getGameState, setters, cleanup] = mcp.addStateTools({
   *   name: 'game_state',
   *   description: 'Game board state',
   *   get: () => gameState,
   *   set: (val) => { gameState = val },
   *   schema: GameStateSchema,
   *   schemaSplit: ['board', ['currentPlayer'], ['redScore', 'blackScore']]
   * });
   *
   * // With expanded tools for collections (returns array of setters)
   * const [getApp, tools, cleanup] = mcp.addStateTools({
   *   name: 'app',
   *   description: 'App state',
   *   get: () => appState,
   *   set: (val) => { appState = val },
   *   schema: AppSchema,
   *   expand: true
   * });
   *
   * // With code mode (returns the getter and the code tool)
   * import { createCodeMode } from '@mcp-web/tools/code';
   *
   * const [getApp, code, cleanup] = mcp.addStateTools({
   *   name: 'app',
   *   description: 'App state',
   *   get: () => appState,
   *   set: (val) => { appState = val },
   *   schema: AppSchema,
   *   expand: true,
   *   codeMode: createCodeMode(),
   * });
   * ```
   */
  // Overload: CreatedStateTools (basic)
  addStateTools<T>(
    created: CreatedStateToolsBasic<T> & { codeMode: false },
  ): [ToolDefinition, ToolDefinition, () => void];
  // Overload: CreatedStateTools (expanded)
  addStateTools<T>(
    created: CreatedStateToolsExpanded<T> & { codeMode: false },
  ): [ToolDefinition, ToolDefinition[], () => void];
  // Overload: CreatedStateTools (code mode) → getter and code tool
  addStateTools<T>(
    created: CreatedStateTools<T> & { codeMode: true },
  ): [ToolDefinition, ToolDefinition, () => void];
  // Overload: CreatedStateTools (generic - for when the shape is unknown at compile time)
  addStateTools<T>(
    created: CreatedStateTools<T>,
  ): [ToolDefinition, ToolDefinition | ToolDefinition[], () => void];
  // Overload: No schemaSplit, no expand → single setter
  addStateTools<T>(
    options: CreateStateToolsConfig<T> & {
      schemaSplit?: undefined;
      expand?: false;
      codeMode?: undefined;
    },
  ): [ToolDefinition, ToolDefinition, () => void];
  // Overload: With schemaSplit or expand → array of setters
  addStateTools<T>(
    options: CreateStateToolsConfig<T> & {
      schemaSplit: SplitPlan;
      codeMode?: undefined;
    },
  ): [ToolDefinition, ToolDefinition[], () => void];
  addStateTools<T>(
    options: CreateStateToolsConfig<T> & {
      expand: true;
      codeMode?: undefined;
    },
  ): [ToolDefinition, ToolDefinition[], () => void];
  // Overload: With codeMode → getter and code tool
  addStateTools<T>(
    options: CreateStateToolsConfig<T> & { codeMode: CodeMode },
  ): [ToolDefinition, ToolDefinition, () => void];
  // Overload: codeMode not known at compile time
  addStateTools<T>(
    options: CreateStateToolsConfig<T>,
  ): [ToolDefinition, ToolDefinition | ToolDefinition[], () => void];
  // Implementation
  addStateTools<T>(
    optionsOrCreated: CreateStateToolsConfig<T> | CreatedStateTools<T>,
  ): [ToolDefinition, ToolDefinition | ToolDefinition[], () => void] {
    const created: CreatedStateTools<T> = isCreatedStateTools(optionsOrCreated)
      ? (optionsOrCreated as CreatedStateTools<T>)
      : createStateTools(optionsOrCreated as CreateStateToolsConfig<T>);
    const { codeMode, get, name, set } = created.config;

    // In code mode the code tool offers all the state tools. The getter is
    // also registered on its own, so reading the state needs no program.
    if (codeMode) {
      if (!created.getter) {
        throw new Error(
          `The schema of ${name} generated no tools, so there is nothing for code mode to offer.`,
        );
      }
      const code = codeMode({
        name,
        getter: created.getter,
        tools: created.tools,
        get,
        set,
      });
      const removeTools = this.#addCodeToolGroup(code, [created.getter]);
      const removeState = this.#addStateGetter(name, get);
      const remove = () => {
        removeTools();
        removeState();
      };
      return [created.getter, code, remove];
    }

    const registeredTools = created.tools.map((tool) => this.addTool(tool));
    const removeState = this.#addStateGetter(name, get);
    const cleanup = () => {
      for (const tool of registeredTools) {
        this.removeTool(tool.name);
      }
      removeState();
    };

    if (created.isExpanded) {
      return [registeredTools[0], registeredTools.slice(1), cleanup];
    }
    return [registeredTools[0], registeredTools[1], cleanup];
  }

  /** Tracks a state for the state text sent to an MCP App host. */
  #addStateGetter(name: string, get: () => unknown): () => void {
    this.#stateGetters.set(name, get);
    this.#appHost?.stateChanged();
    return () => {
      if (this.#stateGetters.get(name) !== get) return;
      this.#stateGetters.delete(name);
      this.#appHost?.stateChanged();
    };
  }

  /**
   * Whether the page runs as an MCP App view, opened through `mcpApp`. Known
   * from the start, so the page can leave out what a view doesn't need, such
   * as instructions for connecting to the bridge.
   *
   * In the view, `MCPWeb` offers its tools to the host as app tools, unless
   * `disableAppTools` is set. `connected` tells whether the handshake with
   * the host succeeded.
   */
  get isMCPApp(): boolean {
    return this.#isMCPApp;
  }

  /**
   * Whether the client is currently connected to the bridge server, or to the
   * MCP App host when `isMCPApp` is `true`.
   *
   * @returns `true` if connected, `false` otherwise
   *
   * @example
   * ```typescript
   * if (mcp.connected) {
   *   console.log('Ready to receive tool calls');
   * } else {
   *   await mcp.connect();
   * }
   * ```
   */
  get connected(): boolean {
    return this.#connected;
  }

  /**
   * Whether the instance is currently attempting to connect to the bridge or
   * to an MCP App host.
   *
   * Returns `true` during the connection/authentication handshake,
   * before `connected` becomes `true` or the connection fails.
   *
   * @returns `true` if a connection attempt is in progress
   */
  get connecting(): boolean {
    return this.#isConnecting;
  }

  /**
   * Whether the connection was closed after `idleTimeoutMs` without activity.
   *
   * The next user interaction with the page reconnects.
   */
  get idle(): boolean {
    return this.#idle;
  }

  /**
   * Time, in milliseconds since the epoch, at which the connection closes if
   * there is no activity until then. `undefined` without `idleTimeoutMs`,
   * while disconnected, or while connected to an MCP App host.
   */
  get idleDisconnectAt(): number | undefined {
    const idleTimeout = this.#config.idleTimeoutMs;
    if (
      !idleTimeout ||
      !(this.#connected || this.#isConnecting) ||
      this.#appHost ||
      this.#appHostAttempt
    ) {
      return undefined;
    }
    const lastActivityAt =
      this.#pendingCalls > 0 ? Date.now() : this.#lastActivityAt;
    return lastActivityAt + idleTimeout;
  }

  /**
   * Subscribe to connection state changes.
   *
   * The listener is called whenever `connected`, `connecting` or `idle`
   * changes.
   * Returns an unsubscribe function.
   *
   * @param listener - Callback invoked on state change
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = mcp.onConnectionStateChange(() => {
   *   console.log('connected:', mcp.connected, 'connecting:', mcp.connecting);
   * });
   * // Later:
   * unsubscribe();
   * ```
   */
  onConnectionStateChange(listener: () => void): () => void {
    this.#connectionStateListeners.add(listener);
    return () => {
      this.#connectionStateListeners.delete(listener);
    };
  }

  #notifyConnectionStateChange() {
    for (const listener of this.#connectionStateListeners) {
      listener();
    }
  }

  /**
   * Disconnects from the bridge server or the MCP App host.
   *
   * Closes the WebSocket connection, or the connection to the host, and
   * cleans up event handlers.
   * Useful for cleanup when unmounting components or closing the application.
   *
   * @example
   * ```typescript
   * // In a Vue component lifecycle hook
   * onUnmounted(() => {
   *   mcp.disconnect();
   * });
   * ```
   */
  disconnect() {
    const wasIdle = this.#idle;
    this.#idle = false;
    this.#close();
    // Not in #close(), so going idle keeps the view's host connection.
    this.#closeEmptyAppHost();
    if (wasIdle) this.#notifyConnectionStateChange();
  }

  #close() {
    clearTimeout(this.#idleTimer);
    this.#idleTimer = undefined;
    clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = undefined;
    this.#disconnectEpoch++;
    // An attempt still in its handshake has no other way to learn it was
    // cancelled, and a stale flag makes every later connect() wait on it.
    this.#setIsConnecting(false);
    this.#appHostAttempt = undefined;
    this.#appHostAbort?.abort();
    this.#appHostAbort = undefined;
    if (this.#appHost) {
      this.#appHost.close().catch(console.error);
      this.#appHost = null;
    }
    if (this.#ws) {
      this.#ws.onmessage = null;
      this.#ws.onopen = null;
      this.#ws.onerror = null;
      this.#ws.onclose = null;
      this.#ws.close();
      this.#ws = null;
    }
    this.#setConnected(false);
  }

  /**
   * Gets list of all registered tool names.
   *
   * @returns Array of tool names
   *
   * @example
   * ```typescript
   * const toolNames = mcp.getTools();
   * console.log('Available tools:', toolNames);
   * ```
   */
  getTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Triggers an AI agent query from your frontend code.
   *
   * Requires `agentUrl` to be configured in MCPWeb config. Sends a query to the AI agent
   * and returns a QueryResponse object that can be iterated to stream events.
   *
   * @param request - Query request with prompt and optional context
   * @param signal - Optional AbortSignal for canceling the query
   * @returns QueryResponse object that streams events
   * @throws {Error} If `agentUrl` is not configured or not connected to bridge
   *
   * @example Basic Query
   * ```typescript
   * const query = mcp.query({
   *   prompt: 'Analyze the current todos and suggest priorities',
   * });
   *
   * for await (const event of query) {
   *   if (event.type === 'query_complete') {
   *     console.log('Result:', event.result);
   *   }
   * }
   * ```
   *
   * @example With Context
   * ```typescript
   * const query = mcp.query({
   *   prompt: 'Update the todo with highest priority',
   *   context: [todosTool],  // Provide specific tools as context
   * });
   *
   * for await (const event of query) {
   *   console.log('Event:', event);
   * }
   * ```
   *
   * @example With Cancellation
   * ```typescript
   * const abortController = new AbortController();
   * const query = mcp.query(
   *   { prompt: 'Long running task' },
   *   abortController.signal
   * );
   *
   * // Cancel after 5 seconds
   * setTimeout(() => abortController.abort(), 5000);
   * ```
   */
  query(request: QueryRequest, signal?: AbortSignal): QueryResponse {
    if (!this.#config.agentUrl) {
      throw new Error(
        'Agent URL not configured. Add agentUrl to MCPWeb config to enable queries.',
      );
    }

    if (this.#appHost) {
      throw new Error(
        'Queries require a bridge connection. Set `disableAppTools: true` for views that call `query()`.',
      );
    }

    if (!this.#connected) {
      throw new Error(
        'Not connected to bridge. Ensure MCPWeb is connected before making queries.',
      );
    }

    const parsedRequest = QueryRequestSchema.parse(request);

    const { prompt, context, responseTool, timeout } = parsedRequest;

    // Validate that responseTool is registered if provided
    if (responseTool && !this.tools.has(responseTool.name)) {
      throw new Error(
        `Response tool '${responseTool.name}' is not registered. Register it with addTool() first.`,
      );
    }

    // Generate a unique identifier for the query
    const uuid = globalThis.crypto.randomUUID();

    // Create internal AbortController if none provided
    const internalAbortController = signal ? undefined : new AbortController();
    const effectiveSignal = signal || internalAbortController?.signal;

    // Create the async generator that will be wrapped in Query instance
    const stream = this.createQueryStream(
      uuid,
      prompt,
      context,
      responseTool,
      timeout,
      effectiveSignal,
    );

    // Create cancel function that works with both external and internal AbortController
    const cancelFn = () => {
      if (internalAbortController) {
        internalAbortController.abort();
      } else if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
        // If using external signal, send cancel directly to bridge
        this.#ws.send(
          JSON.stringify({
            type: 'query_cancel',
            uuid,
          }),
        );
      }
    };

    // Return QueryResponse instance with synchronous uuid access, async stream, and cancel function
    return new QueryResponse(uuid, stream, cancelFn);
  }

  /**
   * Internal method to create the query stream
   */
  private async *createQueryStream(
    uuid: string,
    prompt: string,
    context: QueryRequest['context'],
    responseTool: QueryRequest['responseTool'],
    timeout: number,
    signal?: AbortSignal,
  ): AsyncIterableIterator<QueryResponseResult> {
    // Process context items
    const processedContext: ProcessedContextItem[] = [];

    if (context) {
      for (const item of context) {
        if ('handler' in item) {
          // Tool definition
          processedContext.push({
            name: item.name,
            value: await item.handler(),
            schema: item.outputSchema
              ? toJSONSchema(item.outputSchema)
              : undefined,
            description: item.description,
            type: 'tool',
          });
        } else {
          // Ephemeral context
          processedContext.push({
            name: item.name,
            value: item.value,
            schema: item.schema,
            description: item.description,
            type: 'ephemeral',
          });
        }
      }
    }

    // Convert responseTool to serializable metadata
    const responseToolMetadata = responseTool
      ? toToolMetadataJson(responseTool)
      : undefined;

    // Send query message to bridge
    const queryMessage = QueryMessageSchema.parse({
      uuid,
      prompt,
      context: processedContext,
      responseTool: responseToolMetadata,
    } satisfies Query);

    this.#ws?.send(JSON.stringify(queryMessage));

    // Create async iterator for streaming events
    let completed = false;
    let timeoutId: number | null = null;
    let aborted = false;

    const eventQueue: QueryResponseResult[] = [];
    let resolveNext:
      | ((value: IteratorResult<QueryResponseResult>) => void)
      | null = null;

    // Handle abort signal
    const handleAbort = () => {
      if (aborted || completed) return;
      aborted = true;
      completed = true;

      // Send cancellation message to bridge
      if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
        this.#ws.send(
          JSON.stringify({
            type: 'query_cancel',
            uuid,
          }),
        );
      }

      if (timeoutId) clearTimeout(timeoutId);
      this.#ws?.removeEventListener('message', handleMessage);

      // Yield a cancellation response
      const cancelResponse: QueryResponseResult = {
        type: 'query_cancel',
        uuid,
      };

      if (resolveNext) {
        resolveNext({ value: cancelResponse, done: false });
        resolveNext = null;
      } else {
        eventQueue.push(cancelResponse);
      }
    };

    // Listen for abort signal
    if (signal) {
      if (signal.aborted) {
        handleAbort();
      } else {
        signal.addEventListener('abort', handleAbort);
      }
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        const parsedMessage = QueryResponseResultSchema.parse(message);

        if (parsedMessage.uuid === uuid) {
          if (
            parsedMessage.type === 'query_complete' ||
            parsedMessage.type === 'query_failure'
          ) {
            completed = true;
            if (timeoutId) clearTimeout(timeoutId);
            this.#ws?.removeEventListener('message', handleMessage);
            if (signal) signal.removeEventListener('abort', handleAbort);
          }

          if (resolveNext) {
            resolveNext({ value: parsedMessage, done: false });
            resolveNext = null;
          } else {
            eventQueue.push(parsedMessage);
          }
        }
      } catch (_error) {
        // Ignore invalid JSON
      }
    };

    this.#ws?.addEventListener('message', handleMessage);

    // Set up timeout
    timeoutId = setTimeout(() => {
      completed = true;
      this.#ws?.removeEventListener('message', handleMessage);
      if (signal) signal.removeEventListener('abort', handleAbort);
      if (resolveNext) {
        resolveNext({ value: new Error('Query timeout'), done: true });
        resolveNext = null;
      }
    }, timeout) as unknown as number;

    // Async iterator implementation
    const getNext = (): Promise<IteratorResult<QueryResponseResult>> => {
      return new Promise((resolve) => {
        if (eventQueue.length > 0) {
          // biome-ignore lint/style/noNonNullAssertion: We just checked that the length is greater than 0
          const event = eventQueue.shift()!;
          resolve({ value: event, done: false });
        } else if (completed) {
          resolve({ value: undefined, done: true });
        } else {
          resolveNext = resolve;
        }
      });
    };

    // Yield events as they arrive
    while (!completed) {
      const result = await getNext();
      if (result.done) break;
      yield result.value;
    }
  }
}

export default MCPWeb;
