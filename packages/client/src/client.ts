#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export interface ClientConfig {
  serverUrl: string;
  authToken: string;
  timeout?: number;
}

const JsonRpcResponse = z.object({
  jsonrpc: z.string(),
  id: z.union([z.string(), z.number()]),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional()
  }).optional()
});

interface BridgeResponse {
  error?: string;
  data?: any;
  success?: boolean;
  available_sessions?: any[];
  available_tools?: string[];
  tools?: any[];
  resources?: any[];
  prompts?: any[];
}

interface TextContent {
  type: 'text';
  text: string;
};

interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
};

type Content = TextContent | ImageContent;

export class Client {
  private config: ClientConfig;
  private server: Server;

  constructor() {
    this.config = {
      serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:3002',
      authToken: process.env.AUTH_TOKEN || '',
      timeout: Number.parseInt(process.env.TIMEOUT || '30000')
    };

    if (!this.config.authToken) {
      console.error('AUTH_TOKEN environment variable is required');
      process.exit(1);
    }

    this.server = new Server(
      {
        name: 'mcp-frontend-client',
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

  private setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        const response = await this.makeRequest('tools/list');
        return response.tools ? { tools: response.tools } : { tools: [] };
      } catch (error) {
        console.error('Failed to list tools:', error);
        return { tools: [] };
      }
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        const response = await this.makeRequest('tools/call', {
          name,
          arguments: args || {}
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
    });

    // Handle resource listing
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      try {
        const response = await this.makeRequest('resources/list');
        return response.resources ? { resources: response.resources } : { resources: [] };
      } catch (error) {
        console.error('Failed to list resources:', error);
        return { resources: [] };
      }
    });

    // Handle prompt listing
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      try {
        const response = await this.makeRequest('prompts/list');
        return response.prompts ? { prompts: response.prompts } : { prompts: [] };
      } catch (error) {
        console.error('Failed to list prompts:', error);
        return { prompts: [] };
      }
    });
  }

  private async makeRequest(method: string, params?: any): Promise<BridgeResponse> {
    const url = this.config.serverUrl.replace('ws:', 'http:').replace('wss:', 'https:');

    const requestBody = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();

      const data = JsonRpcResponse.parse(rawData);

      if (data.error) {
        throw new Error(`MCP Error: ${data.error.message}`);
      }

      return data.result as BridgeResponse;

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
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Bridge Client started');
  }
}
