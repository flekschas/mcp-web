#!/usr/bin/env node

import {
  ClientNotConextualizedErrorCode,
  type ErroredListPromptsResult,
  type ErroredListResourcesResult,
  type ErroredListToolsResult,
  type FatalError,
  InvalidAuthenticationErrorCode,
  type McpRequestMetaParams,
  MissingAuthenticationErrorCode,
  type Query,
  QueryDoneErrorCode,
  QueryNotActiveErrorCode,
  QueryNotFoundErrorCode,
  QuerySchema,
} from '@mcp-web/types';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  type CallToolRequest,
  CallToolRequestSchema,
  type CallToolResult,
  ListPromptsRequestSchema,
  type ListPromptsResult,
  ListResourcesRequestSchema,
  type ListResourcesResult,
  ListToolsRequestSchema,
  type ListToolsResult,
  type ReadResourceRequest,
  ReadResourceRequestSchema,
  type ReadResourceResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  JsonRpcRequestSchema,
  JsonRpcResponseSchema,
  MCPWebClientConfigSchema,
} from './schemas.js';
import type {
  Content,
  MCPWebClientConfig,
  MCPWebClientConfigOutput,
} from './types.js';

function isFatalError<T extends object>(result: T | FatalError): result is FatalError {
  return 'errorIsFatal' in result && result.errorIsFatal === true;
}

/**
 * MCP client that connects AI agents (like Claude Desktop) to the bridge server.
 *
 * MCPWebClient implements the MCP protocol and can run as a stdio server for
 * AI host applications, or be used programmatically in agent server code.
 *
 * @example Running as MCP server for Claude Desktop
 * ```typescript
 * const client = new MCPWebClient({
 *   serverUrl: 'http://localhost:3001',
 *   authToken: 'your-auth-token',
 * });
 * await client.run(); // Starts stdio transport
 * ```
 *
 * @example Programmatic usage in agent code
 * ```typescript
 * const client = new MCPWebClient({
 *   serverUrl: 'http://localhost:3001',
 *   authToken: 'your-auth-token',
 * });
 *
 * // List available tools
 * const { tools } = await client.listTools();
 *
 * // Call a tool
 * const result = await client.callTool('get_todos');
 * ```
 *
 * @example With query context (for agent servers)
 * ```typescript
 * const contextualClient = client.contextualize(query);
 * const result = await contextualClient.callTool('update_todo', { id: '1' });
 * await contextualClient.complete('Todo updated successfully');
 * ```
 */
export class MCPWebClient {
  #config: MCPWebClientConfigOutput;
  #server?: Server;
  #query?: Query;
  #isDone = false; // Track if query has been completed

  /**
   * Creates a new MCPWebClient instance.
   *
   * @param config - Client configuration with server URL and auth token
   * @param query - Optional query for contextualized instances (internal use)
   */
  constructor(config: MCPWebClientConfig, query?: Query) {
    this.#config = MCPWebClientConfigSchema.parse(config);

    if (query) {
      this.#query = QuerySchema.parse(query);
    }
  }

  private getMetaParams(sessionId?: string): McpRequestMetaParams | undefined {
    if (sessionId || this.#query?.uuid) {
      const meta: McpRequestMetaParams = {};
      if (sessionId) {
      meta.sessionId = sessionId;
      }
      if (this.#query?.uuid) {
        meta.queryId = this.#query.uuid;
      }
      return meta;
    }
    return undefined;
  }

  private getParams(sessionId?: string): { _meta: McpRequestMetaParams } | undefined {
    const meta = this.getMetaParams(sessionId);
    if (meta) {
      return { _meta: meta };
    }
    return undefined;
  }

  private async makeToolCallRequest(request: CallToolRequest): Promise<CallToolResult> {
    try {
      const { name, arguments: args, _meta } = request.params as any;

      const response = await this.makeRequest('tools/call', {
        name,
        arguments: args || {},
        ...(_meta && { _meta })
      });

      // Check if response is already in CallToolResult format (from bridge)
      // This happens when the bridge wraps results for Remote MCP compatibility
      if (
        response &&
        typeof response === 'object' &&
        'content' in response &&
        Array.isArray((response as { content: unknown }).content)
      ) {
        return response as CallToolResult;
      }

      // Handle different response formats (legacy/unwrapped responses)
      // Check if this is an error response from bridge
      if (response && typeof response === 'object' && 'error' in response) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            }
          ],
          isError: true
        };
      }

      // Handle successful responses
      // The response could be:
      // 1. A wrapped response: { data: <actual data> }
      // 2. Direct tool result: any type (string, number, object, etc.)
      let content: Content[];
      let topLevelMeta: Record<string, unknown> | undefined;
      let actualData = (response && typeof response === 'object' && 'data' in response)
        ? response.data
        : response;

      // Extract _meta from the data to place at the top level of CallToolResult.
      // The MCP protocol expects _meta as a top-level field on the result object,
      // not embedded inside the JSON text content.
      if (actualData && typeof actualData === 'object' && '_meta' in actualData) {
        const { _meta: extractedMeta, ...rest } = actualData as Record<string, unknown>;
        if (extractedMeta && typeof extractedMeta === 'object') {
          topLevelMeta = extractedMeta as Record<string, unknown>;
        }
        actualData = rest;
      }

      if (typeof actualData === 'string') {
        // Check if it's a data URL (image)
        if (actualData.startsWith('data:image/')) {
          content = [
            {
              type: 'image',
              data: actualData,
              mimeType: actualData.split(';')[0].split(':')[1]
            }
          ];
        } else {
          content = [
            {
              type: 'text',
              text: actualData
            }
          ];
        }
      } else if (actualData !== null && actualData !== undefined) {
        content = [
          {
            type: 'text',
            text: typeof actualData === 'object' ? JSON.stringify(actualData, null, 2) : String(actualData)
          }
        ];
      } else {
        // null or undefined result
        content = [
          {
            type: 'text',
            text: ''
          }
        ];
      }

      const callToolResult: CallToolResult = { content };
      if (topLevelMeta) {
        callToolResult._meta = topLevelMeta;
      }
      return callToolResult;

    } catch (error) {
      // Re-throw authentication and query errors
      if (error instanceof Error) {
        const errorMessage = error.message;
        if (errorMessage === MissingAuthenticationErrorCode ||
            errorMessage === InvalidAuthenticationErrorCode ||
            errorMessage === QueryNotFoundErrorCode ||
            errorMessage === QueryNotActiveErrorCode) {
          throw error;
        }
      }

      // All other errors get returned as CallToolResult with isError: true
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }

  private async makeListToolsRequest(sessionId?: string): Promise<ListToolsResult | ErroredListToolsResult> {
    const response = await this.makeRequest<ListToolsResult | ErroredListToolsResult | FatalError>('tools/list', this.getParams(sessionId));

    if (isFatalError(response)) {
      throw new Error(response.error_message);
    }

    return response;
  }

  private async makeListResourcesRequest(sessionId?: string): Promise<ListResourcesResult | ErroredListResourcesResult> {
    const response = await this.makeRequest<ListResourcesResult | ErroredListResourcesResult | FatalError>('resources/list', this.getParams(sessionId));

    if (isFatalError(response)) {
      throw new Error(response.error_message);
    }

    return response;
  }

  private async makeListPromptsRequest(sessionId?: string): Promise<ListPromptsResult | ErroredListPromptsResult> {
    const response = await this.makeRequest<ListPromptsResult | ErroredListPromptsResult | FatalError>('prompts/list', this.getParams(sessionId));

    if (isFatalError(response)) {
      throw new Error(response.error_message);
    }

    return response;
  }

  private async makeReadResourceRequest(request: ReadResourceRequest): Promise<ReadResourceResult> {
    const { uri, _meta } = request.params;

    const response = await this.makeRequest<ReadResourceResult | FatalError>('resources/read', {
      uri,
      ...(_meta && { _meta }),
      ...this.getParams(),
    });

    if (isFatalError(response)) {
      throw new Error(response.error_message);
    }

    return response;
  }

  private setupHandlers() {
    if (!this.#server) return;

    // Handle tool listing
    this.#server.setRequestHandler(ListToolsRequestSchema, () => this.makeListToolsRequest());

    // Handle tool calls
    this.#server.setRequestHandler(CallToolRequestSchema, this.makeToolCallRequest.bind(this));

    // Handle resource listing
    this.#server.setRequestHandler(ListResourcesRequestSchema, () => this.makeListResourcesRequest());

    // Handle resource reading
    this.#server.setRequestHandler(ReadResourceRequestSchema, (request: ReadResourceRequest) => this.makeReadResourceRequest(request));

    // Handle prompt listing
    this.#server.setRequestHandler(ListPromptsRequestSchema, () => this.makeListPromptsRequest());
  }

  /**
   * Creates a contextualized client for a specific query.
   *
   * All tool calls made through the returned client will be tagged with the
   * query UUID, enabling the bridge to track tool calls for that query.
   *
   * @param query - The query object containing uuid and optional responseTool
   * @returns A new MCPWebClient instance bound to the query context
   *
   * @example
   * ```typescript
   * const contextualClient = client.contextualize(query);
   * await contextualClient.callTool('analyze_data');
   * await contextualClient.complete('Analysis complete');
   * ```
   */
  contextualize(query: Query): MCPWebClient {
    return new MCPWebClient(this.#config, query);
  }

  /**
   * Calls a tool on the connected frontend.
   *
   * Automatically includes query context if this is a contextualized client.
   * If the query has tool restrictions, only allowed tools can be called.
   *
   * @param name - Name of the tool to call
   * @param args - Optional arguments to pass to the tool
   * @param sessionId - Optional session ID for multi-session scenarios
   * @returns Tool execution result
   * @throws {Error} If query is already done or tool is not allowed
   *
   * @example
   * ```typescript
   * const result = await client.callTool('create_todo', {
   *   title: 'New task',
   *   priority: 'high',
   * });
   * ```
   */
  async callTool(name: string, args?: Record<string, unknown>, sessionId?: string): Promise<CallToolResult> {
    if (this.#query && this.#isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    // Check tool restrictions if query has them
    if (this.#query?.restrictTools && this.#query?.tools) {
      const allowed = this.#query.tools.some(t => t.name === name);
      if (!allowed) {
        throw new Error(
          `Tool '${name}' not allowed. Query restricted to: ${this.#query.tools.map(t => t.name).join(', ')}`
        );
      }
    }

    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name,
        arguments: args || {} as Record<string, unknown>,
        // Augment with query context if this is a contextualized instance
        ...this.getParams(sessionId)
      },
    };

    const response = await this.makeToolCallRequest(request);

    // Auto-complete if this was the responseTool and it succeeded
    // Note: response.isError is true for errors, undefined for success
    if (this.#query?.responseTool?.name === name && response.isError !== true) {
      this.#isDone = true;
    }

    return response;
  }

  /**
   * Lists all available tools from the connected frontend.
   *
   * If this is a contextualized client with restricted tools, returns only
   * those tools. Otherwise fetches all tools from the bridge.
   *
   * @param sessionId - Optional session ID for multi-session scenarios
   * @returns List of available tools
   * @throws {Error} If query is already done
   */
  async listTools(sessionId?: string): Promise<ListToolsResult | ErroredListToolsResult> {
    if (this.#isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    // If we have tools from the query, return those
    if (this.#query?.tools) {
      // Need to convert ToolDefinition to Tool format expected by MCP
      const tools = this.#query.tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema || { type: 'object', properties: {}, required: [] }
      }));
      return { tools: tools as Tool[] };
    }

    // Otherwise use the shared request handler
    return this.makeListToolsRequest(sessionId);
  }

  /**
   * Lists all available resources from the connected frontend.
   *
   * @param sessionId - Optional session ID for multi-session scenarios
   * @returns List of available resources
   * @throws {Error} If query is already done
   */
  async listResources(sessionId?: string): Promise<ListResourcesResult | ErroredListResourcesResult> {
    if (this.#isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    return this.makeListResourcesRequest(sessionId);
  }

  /**
   * Lists all available prompts from the connected frontend.
   *
   * @param sessionId - Optional session ID for multi-session scenarios
   * @returns List of available prompts
   * @throws {Error} If query is already done
   */
  async listPrompts(sessionId?: string): Promise<ListPromptsResult | ErroredListPromptsResult> {
    if (this.#isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    return this.makeListPromptsRequest(sessionId);
  }

  /**
   * Sends a progress update for the current query.
   *
   * Use this to provide intermediate updates during long-running operations.
   * Can only be called on a contextualized client instance.
   *
   * @param message - Progress message to send to the frontend
   * @throws {Error} If not a contextualized client or query is done
   *
   * @example
   * ```typescript
   * await contextualClient.sendProgress('Processing step 1 of 3...');
   * // ... do work ...
   * await contextualClient.sendProgress('Processing step 2 of 3...');
   * ```
   */
  async sendProgress(message: string): Promise<void> {
    if (!this.#query) {
      throw new Error(ClientNotConextualizedErrorCode);
    }

    if (this.#isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    const url = this.#config.serverUrl.replace('ws:', 'http:').replace('wss:', 'https:');
    const progressUrl = `${url}/query/${this.#query.uuid}/progress`;
      const response = await fetch(progressUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
        throw new Error(errorData.error || `Failed to send progress: HTTP ${response.status}`);
      }
  }

  /**
   * Marks the current query as complete with a message.
   *
   * Can only be called on a contextualized client instance.
   * If the query specified a responseTool, call that tool instead - calling
   * this method will result in an error.
   *
   * @param message - Completion message to send to the frontend
   * @throws {Error} If not a contextualized client, query is done, or responseTool was specified
   *
   * @example
   * ```typescript
   * await contextualClient.complete('Analysis complete: found 5 issues');
   * ```
   */
  async complete(message: string): Promise<void> {
    if (!this.#query) {
      throw new Error(ClientNotConextualizedErrorCode);
    }

    if (this.#isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    const url = this.#config.serverUrl.replace('ws:', 'http:').replace('wss:', 'https:');
    const completeUrl = `${url}/query/${this.#query.uuid}/complete`;

    try {
      const response = await fetch(completeUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
        throw new Error(`Failed to complete query: ${errorData.error || response.statusText}`);
      }

      // Only mark as completed after successful response
      this.#isDone = true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Marks the current query as failed with an error message.
   *
   * Can only be called on a contextualized client instance.
   * Use this when the query encounters an unrecoverable error.
   *
   * @param error - Error message or Error object describing the failure
   * @throws {Error} If not a contextualized client or query is already done
   *
   * @example
   * ```typescript
   * try {
   *   await contextualClient.callTool('risky_operation');
   * } catch (e) {
   *   await contextualClient.fail(e);
   * }
   * ```
   */
  async fail(error: string | Error): Promise<void> {
    if (!this.#query) {
      throw new Error(ClientNotConextualizedErrorCode);
    }

    if (this.#isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    const errorMessage = typeof error === 'string' ? error : error.message;
    const url = this.#config.serverUrl.replace('ws:', 'http:').replace('wss:', 'https:');
    const failUrl = `${url}/query/${this.#query.uuid}/fail`;

    try {
      const response = await fetch(failUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: errorMessage })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
        throw new Error(`Failed to mark query as failed: ${errorData.error || response.statusText}`);
      }

      // Mark as completed to prevent further operations
      this.#isDone = true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Cancels the current query.
   *
   * Can only be called on a contextualized client instance.
   * Use this when the user or system needs to abort query processing.
   *
   * @param reason - Optional reason for the cancellation
   * @throws {Error} If not a contextualized client or query is already done
   *
   * @example
   * ```typescript
   * // User requested cancellation
   * await contextualClient.cancel('User cancelled operation');
   * ```
   */
  async cancel(reason?: string): Promise<void> {
    if (!this.#query) {
      throw new Error(ClientNotConextualizedErrorCode);
    }

    if (this.#isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    const url = this.#config.serverUrl.replace('ws:', 'http:').replace('wss:', 'https:');
    const cancelUrl = `${url}/query/${this.#query.uuid}/cancel`;

    try {
      const response = await fetch(cancelUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reason ? { reason } : {})
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
        throw new Error(`Failed to cancel query: ${errorData.error || response.statusText}`);
      }

      // Mark as completed to prevent further operations
      this.#isDone = true;
    } catch (err) {
      throw err;
    }
  }

  private async makeRequest<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    const url = this.#config.serverUrl.replace('ws:', 'http:').replace('wss:', 'https:');

    const requestBody = JsonRpcRequestSchema.parse({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.#config.timeout);

      // Only include Authorization header if we have an authToken
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.#config.authToken) {
        headers.Authorization = `Bearer ${this.#config.authToken}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();

      const data = JsonRpcResponseSchema.parse(rawData);

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result as T;

    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error(`Unknown error: ${error}`);
    }
  }

  /**
   * Fetches server identity (name, version, icon) from the bridge.
   * Falls back to defaults if the bridge is unreachable.
   */
  private async fetchBridgeInfo(): Promise<{
    name: string;
    version: string;
    icon?: string;
  }> {
    const defaults = { name: '@mcp-web/client', version: '1.0.0' };
    try {
      const url = this.#config.serverUrl
        .replace('ws:', 'http:')
        .replace('wss:', 'https:');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) return defaults;

      const data = (await response.json()) as Record<string, unknown>;
      return {
        name: typeof data.name === 'string' ? data.name : defaults.name,
        version:
          typeof data.version === 'string'
            ? data.version
            : defaults.version,
        ...(typeof data.icon === 'string' && { icon: data.icon }),
      };
    } catch {
      return defaults;
    }
  }

  /**
   * Starts the MCP server using stdio transport.
   *
   * This method is intended for running as a subprocess of an AI host like
   * Claude Desktop. It connects to stdin/stdout for MCP communication.
   *
   * Cannot be called on contextualized client instances.
   *
   * @throws {Error} If called on a contextualized client or server not initialized
   *
   * @example
   * ```typescript
   * // In your entry point script
   * const client = new MCPWebClient(config);
   * await client.run();
   * ```
   */
  async run() {
    if (this.#query) {
      throw new Error('Cannot run a contextualized client instance. Only root clients can be run as MCP servers.');
    }

    // Fetch bridge identity before creating the MCP server
    const bridgeInfo = await this.fetchBridgeInfo();

    this.#server = new Server(
      {
        name: bridgeInfo.name,
        version: bridgeInfo.version,
        ...(bridgeInfo.icon && { icon: bridgeInfo.icon }),
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();

    const transport = new StdioServerTransport();
    await this.#server.connect(transport);
  }
}
