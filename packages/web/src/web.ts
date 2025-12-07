import type { BridgeMessage, RegisterToolMessage } from '@mcp-web/bridge';
import {
  applyPartialUpdate,
  type DecomposedSchema,
  type DecompositionOptions,
  decomposeSchema,
  type SplitPlan,
} from '@mcp-web/decompose-zod-schema';
import {
  type MCPWebConfig,
  type MCPWebConfigOutput,
  McpWebConfigSchema,
  type ProcessedContextItem,
  type ProcessedToolDefinition,
  type Query,
  QueryMessageSchema,
  type ToolDefinition,
  ToolDefinitionSchema,
} from '@mcp-web/types';
import { ZodObject, z } from 'zod';
import { QueryResponse } from './query';
import { QueryRequestSchema, QueryResponseResultSchema } from './schemas';
import type { QueryRequest, QueryResponseResult } from './types';
import { isZodSchema, toJSONSchema, toToolMetadataJson, validateInput } from './utils';

export class MCPWeb {
  private ws: WebSocket | null = null;
  readonly sessionId: string;
  readonly authToken: string;
  readonly tools = new Map<string, ProcessedToolDefinition>();
  private connected = false;
  isConnecting = false;
  readonly config: MCPWebConfigOutput;
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
    this.config = McpWebConfigSchema.parse(config);
    this.sessionId = this.generatesessionId();
    this.authToken = this.resolveAuthToken(this.config);

    this.mcpConfig = {
      [this.config.name]: {
        command: 'npx',
        args: ['@mcp-web/client'],
        env: {
          MCP_SERVER_URL: `${globalThis.window?.location?.protocol ?? 'http:'}//${this.config.host}:${this.config.mcpPort}`,
          AUTH_TOKEN: this.authToken
        }
      }
    };

    if (this.config.autoConnect) {
      this.connect();
    }

    this.setupActivityTracking();
  }

  private getBridgeWsUrl(): string {
    const protocol = globalThis.window?.location?.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${this.config.host}:${this.config.wsPort}`;
  }

  private generatesessionId(): string {
    let sessionId = globalThis.localStorage?.getItem('mcp-web-session-id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      globalThis.localStorage?.setItem('mcp-web-session-id', sessionId);
    }
    return sessionId;
  }

  private generateAuthToken(): string {
    return crypto.randomUUID();
  }

  private loadAuthToken(): string | null {
    try {
      return globalThis.localStorage?.getItem('mcp-web-auth-token');
    } catch (error) {
      console.warn('Failed to load auth token from localStorage:', error);
      return null;
    }
  }

  private saveAuthToken(token: string): void {
    try {
      globalThis.localStorage?.setItem('mcp-web-auth-token', token);
    } catch (error) {
      console.warn('Failed to save auth token to localStorage:', error);
    }
  }

  private resolveAuthToken(config: MCPWebConfig): string {
    // Use provided auth token if available
    if (config.authToken) {
      // Save it to localStorage if persistence is enabled
      if (globalThis.localStorage && config.persistAuthToken !== false) {
        this.saveAuthToken(config.authToken);
      }
      return config.authToken;
    }

    // Try to load from localStorage if persistence is enabled
    if (globalThis.localStorage && config.persistAuthToken !== false) {
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
        const wsUrl = `${this.getBridgeWsUrl()}?session=${this.sessionId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
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

        this.ws.onclose = () => {
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
      sessionId: this.sessionId,
      authToken: this.authToken,
      origin: globalThis.window?.location?.origin,
      pageTitle: globalThis.document?.title,
      userAgent: globalThis.navigator?.userAgent,
      timestamp: Date.now()
    };

    this.ws.send(JSON.stringify(authMessage));
  }

  private handleMessage(message: BridgeMessage) {
    switch (message.type) {
      case 'authenticated':
        this.connected = true;

        this.registerAllTools();
        break;

      case 'tool-call':
        this.handleToolCall(message);
        break;

      case 'query_accepted':
      case 'query_progress':
      case 'query_failure':
      case 'query_complete':
      case 'query_cancel':
        // Query responses are handled by query-specific listeners in query() method
        // (see line ~498 where addEventListener('message') is set up per query)
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

      if (tool.inputZodSchema) {
        const parsedToolInput = tool.inputZodSchema.safeParse(toolInput);
        if (!parsedToolInput.success) {
          this.sendToolResponse(requestId, { error: `Invalid input: ${parsedToolInput.error.message}` });
          return;
        }
      }

      // Execute the tool
      const result = await tool.handler(toolInput);

      // Validate output if Zod schema is provided
      if (tool.outputZodSchema) {
        const parsedResult = tool.outputZodSchema.safeParse(result);
        if (!parsedResult.success) {
          this.sendToolResponse(requestId, { error: `Invalid output: ${parsedResult.error.message}` });
          return;
        }
      }

      // Send the raw result - the bridge will handle formatting
      this.sendToolResponse(requestId, result);

    } catch (error) {
      // Only log in non-test environments
      if (globalThis.process?.env?.NODE_ENV !== 'test') {
        console.debug(`Tool execution error for ${toolName}:`, error);
      }
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

  private registerTool(tool: ProcessedToolDefinition) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'register-tool',
      tool: {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputJsonSchema,
        outputSchema: tool.outputJsonSchema
      }
    } satisfies RegisterToolMessage;

    this.ws.send(JSON.stringify(message));
  }

  private scheduleReconnect() {
    if (!this.ws) return;
    setTimeout(() => {
      if (!this.connected && this.ws) {
        this.connect().catch(console.error);
      }
    }, 5000);
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

    // Track user activity (only in browser environment)
    if (globalThis.document) {
      ['click', 'scroll', 'keydown', 'mousemove'].forEach(event => {
        globalThis.document.addEventListener(event, updateActivity, { passive: true });
      });
    }

    // Periodic activity update
    setInterval(updateActivity, 30000); // Every 30 seconds
  }

  /**
   * Add a tool that can be called by an MCP-compatible AI app/agent..
   *
   * Supports both Zod schemas (recommended - compile time and runtime type safety) and JSON Schemas (runtime validation only).
   * When using Zod schemas, TypeScript will enforce that your handler signature matches the schemas.
   *
   * @returns The tool definition that can be used as context or responseTool in queries
   *
   * @example
   * mcp.addTool({
   *   name: 'double',
   *   description: 'Double a number',
   *   handler: ({ value }) => ({ result: value * 2 }),
   *   inputSchema: z.object({ value: z.number() }),
   *   outputSchema: z.object({ result: z.number() })
   * });
   */
  // Overload: Zod
  addTool<
    TInput extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
    TOutput extends z.ZodType | undefined = undefined
  >(tool: {
    name: string;
    description: string;
    handler:
      TInput extends z.ZodObject<z.ZodRawShape>
        ? (input: z.infer<TInput>) => TOutput extends z.ZodType
          ? z.infer<TOutput> | Promise<z.infer<TOutput>>
          : void | Promise<void>
        : TOutput extends z.ZodType
          ? () => z.infer<TOutput> | Promise<z.infer<TOutput>>
          : () => void | Promise<void>;
    inputSchema?: TInput;
    outputSchema?: TOutput;
  }): ToolDefinition;

  // Overload: JSON Schema
  addTool(tool: {
    name: string;
    description: string;
    handler: (input?: unknown) => unknown | Promise<unknown> | void | Promise<void>;
    inputSchema?: { type: string; [key: string]: unknown };
    outputSchema?: { type: string; [key: string]: unknown };
  }): ToolDefinition;

  addTool(tool: ToolDefinition): ToolDefinition {
    // Validate the tool definition using Zod schema
    const validationResult = ToolDefinitionSchema.safeParse(tool);
    if (!validationResult.success) {
      throw new Error(`Invalid tool definition: ${validationResult.error.message}`);
    }

    const isInputZodSchema = validationResult.data.inputSchema && 'safeParse' in validationResult.data.inputSchema;
    const isOutputZodSchema = validationResult.data.outputSchema && 'safeParse' in validationResult.data.outputSchema;

    // Create processed tool with both Zod and JSON schemas
    const processedTool: ProcessedToolDefinition = {
      ...validationResult.data,
      inputZodSchema: isInputZodSchema ? (validationResult.data.inputSchema as z.ZodObject<z.ZodRawShape>) : undefined,
      outputZodSchema: isOutputZodSchema ? (validationResult.data.outputSchema as z.ZodType) : undefined,
      inputJsonSchema: validationResult.data.inputSchema ? toJSONSchema(validationResult.data.inputSchema) : undefined,
      outputJsonSchema: validationResult.data.outputSchema ? toJSONSchema(validationResult.data.outputSchema) : undefined
    };

    // Wrap handler with input validation if Zod schema is provided
    if (processedTool.inputZodSchema) {
      const originalHandler = processedTool.handler;
      processedTool.handler = async (input: unknown) => {
        const validationResult = processedTool.inputZodSchema?.safeParse(input);
        if (!validationResult?.success) {
          throw new Error(`Invalid tool input: ${validationResult?.error?.message}`);
        }
        return originalHandler(validationResult?.data);
      };
    }

    this.tools.set(processedTool.name, processedTool);

    // Register immediately if connected
    if (this.connected) {
      this.registerTool(processedTool);
    }

    return tool;
  }

  /**
   * Remove a tool
   */
  removeTool(name: string) {
    this.tools.delete(name);
  }

  /**
   * Add tools for getting and optionally setting state.
   *
   * Creates a getter tool and optionally setter tool(s) for state management.
   * Supports schema decomposition to split large state into multiple focused setters.
   *
   * @returns Object containing all created tools and a cleanup function
   *
   * @example
   * ```typescript
   * // Basic read-write state
   * const { tools, cleanup } = mcp.addStateTool({
   *   name: 'counter',
   *   description: 'Application counter',
   *   get: () => count,
   *   set: (val) => { count = val },
   *   schema: z.number()
   * });
   *
   * // Read-only state (omit set)
   * mcp.addStateTool({
   *   name: 'config',
   *   description: 'App configuration',
   *   get: () => appConfig,
   *   schema: ConfigSchema
   * });
   *
   * // With schema decomposition for large objects
   * mcp.addStateTool({
   *   name: 'game_state',
   *   description: 'Game board state',
   *   get: () => gameState,
   *   set: (val) => { gameState = val },
   *   schema: GameStateSchema,
   *   schemaSplit: {
   *     board: ['board'],
   *     players: ['currentPlayer', 'scores']
   *   }
   * });
   * // Creates: get_game_state, set_game_state_board, set_game_state_players
   * ```
   */
  addStateTool<T>(config: {
    name: string;
    description: string;
    get: () => T;
    set?: (value: T) => void;
    schema: z.ZodType<T> | z.core.JSONSchema.JSONSchema;
    schemaSplit?: SplitPlan | DecompositionOptions;
  }): { tools: ToolDefinition[]; cleanup: () => void } {
    const { name, description, get, set, schema, schemaSplit } = config;

    const tools: ToolDefinition[] = [];

    // Always add a getter tool
    const getterTool = this.addTool({
      name: `get_${name}`,
      description: `Get the current value of ${name}. ${description}`,
      handler: get,
      outputSchema: schema as z.ZodType<T>,
    });
    tools.push(getterTool);

    // Add setter tools if set function is provided
    if (set) {
      const isZodObjectSchema = isZodSchema(schema) && schema instanceof ZodObject;
      const shouldDecompose = isZodObjectSchema && schemaSplit !== undefined;

      let decomposedSchemas: DecomposedSchema[] = [];

      if (shouldDecompose && schemaSplit) {
        try {
          decomposedSchemas = decomposeSchema(
            schema as unknown as Parameters<typeof decomposeSchema>[0],
            schemaSplit
          );
        } catch (error) {
          console.warn(`Failed to decompose schema for ${name}:`, error);
        }
      }

      if (decomposedSchemas.length > 0) {
        // Add decomposed setter tools
        for (const decomposed of decomposedSchemas) {
          const setterTool = this.addTool({
            name: `set_${name}_${decomposed.name}`,
            description: `Set ${decomposed.name} properties of ${name}. ${description}`,
            handler: (partialValue: z.infer<typeof decomposed.schema>) => {
              try {
                const currentValue = get();
                const updatedValue = applyPartialUpdate(
                  currentValue,
                  decomposed.targetPaths,
                  partialValue
                );
                const validatedValue = validateInput(updatedValue, schema);
                set(validatedValue);
                return { success: true };
              } catch (error) {
                return {
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown error',
                };
              }
            },
            inputSchema: decomposed.schema,
            outputSchema: z.object({
              success: z.boolean(),
              error: z.string().optional(),
            }),
          });
          tools.push(setterTool);
        }
      } else {
        // Add single setter tool
        // Wrap non-object schemas in a value property (MCP requires object inputs)
        const inputSchema = isZodObjectSchema
          ? (schema as z.ZodObject<z.ZodRawShape>)
          : z.object({ value: schema as z.ZodType<T> });
        const setterTool = this.addTool({
          name: `set_${name}`,
          description: `Set the value of ${name}. ${description}`,
          handler: (newValue: unknown) => {
            try {
              // Unwrap if we wrapped in value property
              const actualValue = isZodObjectSchema ? newValue : (newValue as { value: unknown }).value;
              const validatedValue = validateInput(actualValue, schema);
              set(validatedValue);
              return { success: true };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          },
          inputSchema,
          outputSchema: z.object({
            success: z.boolean(),
            error: z.string().optional(),
          }),
        });
        tools.push(setterTool);
      }
    }

    // Return tools and cleanup function
    return {
      tools,
      cleanup: () => {
        for (const tool of tools) {
          this.removeTool(tool.name);
        }
      },
    };
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
      this.ws.onmessage = null;
      this.ws.onopen = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
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

  /**
   * Query the agent (only available when agentUrl is configured)
   *
   * @param request - The query request object
   * @param signal - Optional AbortSignal for canceling the query
   * @returns QueryResponse instance with uuid and async iterable stream
   */
  query(request: QueryRequest, signal?: AbortSignal): QueryResponse {
    if (!this.config.agentUrl) {
      throw new Error('Agent URL not configured. Add agentUrl to MCPWeb config to enable queries.');
    }

    if (!this.connected) {
      throw new Error('Not connected to bridge. Ensure MCPWeb is connected before making queries.');
    }

    const parsedRequest = QueryRequestSchema.parse(request);

    const {
      prompt,
      context,
      responseTool,
      timeout,
    } = parsedRequest;

    // Validate that responseTool is registered if provided
    if (responseTool && !this.tools.has(responseTool.name)) {
      throw new Error(`Response tool '${responseTool.name}' is not registered. Register it with addTool() first.`);
    }

    // Generate a unique identifier for the query
    const uuid = crypto?.randomUUID() ?? (() => {
      const fallbackUuid = `query-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      console.warn(
        '⚠️  Running in insecure context (http://). Using fallback UUID generation.\n',
        '   For production, use https:// to enable secure crypto.randomUUID().'
      );
      return fallbackUuid;
    })();

    // Create internal AbortController if none provided
    const internalAbortController = signal ? undefined : new AbortController();
    const effectiveSignal = signal || internalAbortController?.signal;

    // Create the async generator that will be wrapped in Query instance
    const stream = this.createQueryStream(uuid, prompt, context, responseTool, timeout, effectiveSignal);

    // Create cancel function that works with both external and internal AbortController
    const cancelFn = () => {
      if (internalAbortController) {
        internalAbortController.abort();
      } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // If using external signal, send cancel directly to bridge
        this.ws.send(JSON.stringify({
          type: 'query_cancel',
          uuid
        }));
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
    signal?: AbortSignal
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
            schema: item.outputSchema ? toJSONSchema(item.outputSchema) : undefined,
            description: item.description,
            type: 'tool'
          });
        } else {
          // Ephemeral context
          processedContext.push({
            name: item.name,
            value: item.value,
            schema: item.schema,
            description: item.description,
            type: 'ephemeral'
          });
        }
      }
    }

    // Convert responseTool to serializable metadata
    const responseToolMetadata = responseTool ? toToolMetadataJson(responseTool) : undefined;

    // Send query message to bridge
    const queryMessage = QueryMessageSchema.parse({
      uuid,
      prompt,
      context: processedContext,
      responseTool: responseToolMetadata
    } satisfies Query);

    this.ws?.send(JSON.stringify(queryMessage));

    // Create async iterator for streaming events
    let completed = false;
    let timeoutId: number | null = null;
    let aborted = false;

    const eventQueue: QueryResponseResult[] = [];
    let resolveNext: ((value: IteratorResult<QueryResponseResult>) => void) | null = null;

    // Handle abort signal
    const handleAbort = () => {
      if (aborted || completed) return;
      aborted = true;
      completed = true;

      // Send cancellation message to bridge
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'query_cancel',
          uuid
        }));
      }

      if (timeoutId) clearTimeout(timeoutId);
      this.ws?.removeEventListener('message', handleMessage);

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
          if (parsedMessage.type === 'query_complete' || parsedMessage.type === 'query_failure') {
            completed = true;
            if (timeoutId) clearTimeout(timeoutId);
            this.ws?.removeEventListener('message', handleMessage);
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

    this.ws?.addEventListener('message', handleMessage);

    // Set up timeout
    timeoutId = setTimeout(() => {
      completed = true;
      this.ws?.removeEventListener('message', handleMessage);
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
