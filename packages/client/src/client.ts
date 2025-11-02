#!/usr/bin/env node

import {
  InvalidAuthenticationErrorCode,
  MissingAuthenticationErrorCode,
  type Query,
  QueryDoneErrorCode,
  QueryNotActiveErrorCode,
  QueryNotFoundErrorCode,
  QuerySchema,
  ClientNotConextualizedErrorCode,
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
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  JsonRpcRequestSchema,
  JsonRpcResponseSchema,
  MCPWebClientConfigSchema,
} from './schemas.js';
import type {
  Content,
  MCPWebBridgeResponse,
  MCPWebClientConfig,
  MCPWebClientConfigOutput,
} from './types.js';

export class MCPWebClient {
  private config: MCPWebClientConfigOutput;
  private server?: Server;
  private query?: Query;
  private isDone = false; // Track if query has been completed

  constructor(config: MCPWebClientConfig, query?: Query) {
    this.config = MCPWebClientConfigSchema.parse(config);

    if (query) {
      this.query = QuerySchema.parse(query);
    }

    // Only create server for root instances (not contextualized ones)
    if (!this.query) {
      this.server = new Server(
        {
          name: '@mcp-web/client',
          version: '1.0.0',
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
    }
  }

  private getQueryContextParams(): { _queryContext: { queryId: string } } | undefined {
    return this.query ? { _queryContext: { queryId: this.query.uuid } } : undefined;
  }

  private async makeToolCallRequest(request: CallToolRequest): Promise<CallToolResult> {
    try {
      const { name, arguments: args, _queryContext } = request.params as any;

      const response = await this.makeRequest('tools/call', {
        name,
        arguments: args || {},
        ...(_queryContext && { _queryContext })
      });

      // Handle different response formats
      if (response.error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${response.error}${response.available_sessions ? `\n\nAvailable sessions:\n${JSON.stringify(response.available_sessions, null, 2)}` : ''}`
            }
          ],
          isError: true
        };
      }

      // Handle successful responses
      let content: Content[];
      if (response.data) {
        if (typeof response.data === 'string') {
          // Check if it's a data URL (image)
          if (response.data.startsWith('data:image/')) {
            content = [
              {
                type: 'image',
                data: response.data,
                mimeType: response.data.split(';')[0].split(':')[1]
              }
            ];
          } else {
            content = [
              {
                type: 'text',
                text: response.data
              }
            ];
          }
        } else {
          content = [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }
          ];
        }
      } else {
        content = [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ];
      }

      return { content };

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
      console.error('Tool call failed:', error);
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

  private async makeListToolsRequest(): Promise<ListToolsResult> {
    const response = await this.makeRequest('tools/list', this.getQueryContextParams());
    return response.tools ? { tools: response.tools as Tool[] } : { tools: [] };
  }

  private async makeListResourcesRequest(): Promise<ListResourcesResult> {
    const response = await this.makeRequest('resources/list', this.getQueryContextParams());
    return response.resources ? { resources: response.resources as ListResourcesResult['resources'] } : { resources: [] };
  }

  private async makeListPromptsRequest(): Promise<ListPromptsResult> {
    const response = await this.makeRequest('prompts/list', this.getQueryContextParams());
    return response.prompts ? { prompts: response.prompts as ListPromptsResult['prompts'] } : { prompts: [] };
  }

  private setupHandlers() {
    if (!this.server) return;

    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, () => this.makeListToolsRequest());

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, this.makeToolCallRequest.bind(this));

    // Handle resource listing
    this.server.setRequestHandler(ListResourcesRequestSchema, () => this.makeListResourcesRequest());

    // Handle prompt listing
    this.server.setRequestHandler(ListPromptsRequestSchema, () => this.makeListPromptsRequest());
  }

  /**
   * Create a contextualized client for a specific query.
   * All tool calls made through this client will be tagged with the query UUID.
   *
   * @param query - The query object containing uuid and optional responseTool
   */
  contextualize(query: Query): MCPWebClient {
    return new MCPWebClient(this.config, query);
  }

  /**
   * Call a tool, automatically augmented with query context if this is a
   * contextualized client.
   */
  async callTool(name: string, args?: Record<string, unknown>): Promise<CallToolResult> {
    if (this.query && this.isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    // Check tool restrictions if query has them
    if (this.query?.restrictTools && this.query?.tools) {
      const allowed = this.query.tools.some(t => t.name === name);
      if (!allowed) {
        throw new Error(
          `Tool '${name}' not allowed. Query restricted to: ${this.query.tools.map(t => t.name).join(', ')}`
        );
      }
    }

    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name,
        arguments: args || {} as Record<string, unknown>,
        // Augment with query context if this is a contextualized instance
        ...this.getQueryContextParams()
      },
    };

    const response = await this.makeToolCallRequest(request);

    // Auto-complete if this was the responseTool
    if (this.query?.responseTool?.name === name) {
      this.isDone = true;
    }

    return response;
  }

  /**
   * List all available tools.
   * If this is a contextualized client with restricted tools, returns only those tools.
   * Otherwise fetches all tools from the bridge.
   */
  async listTools(): Promise<ListToolsResult> {
    if (this.isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    // If we have tools from the query, return those
    if (this.query?.tools) {
      // Need to convert ToolDefinition to Tool format expected by MCP
      const tools = this.query.tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema || { type: 'object', properties: {}, required: [] }
      }));
      return { tools: tools as Tool[] };
    }

    // Otherwise use the shared request handler
    return this.makeListToolsRequest();
  }

  /**
   * List all available resources.
   */
  async listResources(): Promise<ListResourcesResult> {
    if (this.isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    return this.makeListResourcesRequest();
  }

  /**
   * List all available prompts.
   */
  async listPrompts(): Promise<ListPromptsResult> {
    if (this.isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    return this.makeListPromptsRequest();
  }

  /**
   * Send a progress update for the current query.
   * Can only be called on a contextualized client instance.
   */
  async sendProgress(message: string): Promise<void> {
    if (!this.query) {
      throw new Error(ClientNotConextualizedErrorCode);
    }

    if (this.isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    const url = this.config.serverUrl.replace('ws:', 'http:').replace('wss:', 'https:');
    const progressUrl = `${url}/query/${this.query.uuid}/progress`;

    try {
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
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark the current query as complete with a message.
   * Can only be called on a contextualized client instance.
   * Note: If the query specified a responseTool, calling this method will result in an error.
   */
  async complete(message: string): Promise<void> {
    if (!this.query) {
      throw new Error(ClientNotConextualizedErrorCode);
    }

    if (this.isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    const url = this.config.serverUrl.replace('ws:', 'http:').replace('wss:', 'https:');
    const completeUrl = `${url}/query/${this.query.uuid}/complete`;

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
      this.isDone = true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark the current query as failed with an error message.
   * Can only be called on a contextualized client instance.
   * Use this when the query encounters an error during processing.
   */
  async fail(error: string | Error): Promise<void> {
    if (!this.query) {
      throw new Error(ClientNotConextualizedErrorCode);
    }

    if (this.isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    const errorMessage = typeof error === 'string' ? error : error.message;
    const url = this.config.serverUrl.replace('ws:', 'http:').replace('wss:', 'https:');
    const failUrl = `${url}/query/${this.query.uuid}/fail`;

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
      this.isDone = true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Cancel the current query.
   * Can only be called on a contextualized client instance.
   * Use this when the user or system needs to abort query processing.
   */
  async cancel(reason?: string): Promise<void> {
    if (!this.query) {
      throw new Error(ClientNotConextualizedErrorCode);
    }

    if (this.isDone) {
      throw new Error(QueryDoneErrorCode);
    }

    const url = this.config.serverUrl.replace('ws:', 'http:').replace('wss:', 'https:');
    const cancelUrl = `${url}/query/${this.query.uuid}/cancel`;

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
      this.isDone = true;
    } catch (err) {
      throw err;
    }
  }

  private async makeRequest(method: string, params?: Record<string, unknown>): Promise<MCPWebBridgeResponse> {
    const url = this.config.serverUrl.replace('ws:', 'http:').replace('wss:', 'https:');

    const requestBody = JsonRpcRequestSchema.parse({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      // Only include Authorization header if we have an authToken
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.authToken) {
        headers.Authorization = `Bearer ${this.config.authToken}`;
      }
      // If no authToken, params should include _queryContext for auth

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

      return data.result as MCPWebBridgeResponse;

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error(`Unknown error: ${error}`);
    }
  }

  async run() {
    if (this.query) {
      throw new Error('Cannot run a contextualized client instance. Only root clients can be run as MCP servers.');
    }

    if (!this.server) {
      throw new Error('Server not initialized. Cannot run client.');
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Bridge Client started');
  }
}
