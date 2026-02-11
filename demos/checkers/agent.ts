/**
 * Checkers AI Agent - Core Logic
 *
 * This module exports a createApp function that creates a Hono app
 * configured for the checkers AI agent. It is runtime-agnostic and
 * can be used with both Node.js and Deno.
 *
 * For serving, see:
 * - serve-agent.ts (Node.js local development)
 * - ../deploy/checkers/serve-agent.ts (Deno Deploy)
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createCerebras } from '@ai-sdk/cerebras';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { MCPWebClient } from '@mcp-web/client';
import { type Query, QuerySchema, type Tool } from '@mcp-web/types';
import { Output, ToolLoopAgent, tool, ToolSet, type JSONSchema7, jsonSchema, stepCountIs } from 'ai';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

/**
 * Configuration for the checkers AI agent
 */
export interface AgentConfig {
  /** URL of the MCP bridge server */
  bridgeUrl: string;
  /** Origins allowed for CORS */
  allowedOrigins: string[];
  /** Anthropic API key */
  anthropicApiKey?: string;
  /** OpenAI API key */
  openaiApiKey?: string;
  /** Google AI API key */
  googleApiKey?: string;
  /** Cerebras API key */
  cerebrasApiKey?: string;
  /** Override the default model provider (anthropic, openai, google, cerebras) */
  modelProvider?: string;
  /** Override the default model name */
  modelName?: string;
}

// Provider defaults - can be overridden by modelName config
const PROVIDER_DEFAULTS = {
  anthropic: 'claude-sonnet-4-5',
  google: 'gemini-2.5-flash',
  openai: 'gpt-5-mini',
  cerebras: 'gpt-oss-120b',
} as const;

type Provider = keyof typeof PROVIDER_DEFAULTS;

/**
 * Detect available providers based on API keys in config
 */
function getAvailableProviders(config: AgentConfig): Provider[] {
  const providers: Provider[] = [];
  if (config.anthropicApiKey) providers.push('anthropic');
  if (config.openaiApiKey) providers.push('openai');
  if (config.googleApiKey) providers.push('google');
  if (config.cerebrasApiKey) providers.push('cerebras');
  return providers;
}

/**
 * Select and initialize the model based on configuration.
 * Returns a lazy getter that initializes on first use.
 */
function createLazyModel(config: AgentConfig): () => LanguageModelV3 {
  let cachedModel: LanguageModelV3 | null = null;

  return () => {
    if (cachedModel) return cachedModel;

    const availableProviders = getAvailableProviders(config);

    if (availableProviders.length === 0) {
      throw new Error(
        'No AI provider API keys found. Please set at least one of these environment variables: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, or CEREBRAS_API_KEY'
      );
    }

    // Determine provider: use modelProvider config, or first available
    const requestedProvider = config.modelProvider?.toLowerCase() as Provider | undefined;
    const provider =
      requestedProvider && availableProviders.includes(requestedProvider)
        ? requestedProvider
        : availableProviders[0];

    // Determine model name: use modelName config, or provider default
    const modelName = config.modelName || PROVIDER_DEFAULTS[provider];

    console.log(`🤖 Using AI provider: ${provider}`);
    console.log(`📦 Model: ${modelName}`);
    if (availableProviders.length > 1) {
      console.log(`   Available providers: ${availableProviders.join(', ')}`);
      console.log(`   Set MODEL_PROVIDER env var to switch (e.g., MODEL_PROVIDER=anthropic)`);
    }

    // Initialize the selected provider
    switch (provider) {
      case 'anthropic':
        cachedModel = createAnthropic({
          apiKey: config.anthropicApiKey,
          headers: {
            'anthropic-beta': 'structured-outputs-2025-11-13',
          },
        })(modelName);
        break;
      case 'google':
        cachedModel = createGoogleGenerativeAI({
          apiKey: config.googleApiKey,
        })(modelName);
        break;
      case 'openai':
        cachedModel = createOpenAI({
          apiKey: config.openaiApiKey,
        })(modelName);
        break;
      case 'cerebras':
        cachedModel = createCerebras({
          apiKey: config.cerebrasApiKey,
          fetch: (async (url: string | URL | Request, init?: RequestInit) => {
            if (init?.body && typeof init.body === 'string') {
              const body = JSON.parse(init.body);
              // Add strict: true to json_schema response_format
              if (body.response_format?.type === 'json_schema' && body.response_format.json_schema) {
                body.response_format.json_schema.strict = true;
              }
              return fetch(url, {
                ...init,
                body: JSON.stringify(body),
              });
            }
            return fetch(url, init);
          }) as typeof fetch,
        })(modelName);
        break;
    }

    return cachedModel!;
  };
}

function mcpToAiSdkToolset(
  tools: Tool[],
  mcpClient: ReturnType<typeof MCPWebClient.prototype.contextualize>
): ToolSet {
  return tools.reduce((acc, toolDef) => {
    acc[toolDef.name] = tool({
      description: toolDef.description || '',
      inputSchema: jsonSchema(toolDef.inputSchema as JSONSchema7),
      execute: async (args: Record<string, unknown>) => {
        return await mcpClient.callTool(toolDef.name, args);
      },
    });
    return acc;
  }, {} as ToolSet);
}

const xml = (tag: string, content: string) => `<${tag}>${content}</${tag}>`;

function queryContextToXmlTemplate(query: Query) {
  let out: string = '<context>';
  query.context.forEach((context) => {
    out += xml(
      context.type,
      [
        xml('name', context.name),
        context.description ? xml('description', context.description) : '',
        xml('value', JSON.stringify(context.value))
      ].join('')
    );
  });
  out += '</context>';
  return out;
}

const trim = (str: string) => str.replace(/\s+/g, ' ');

async function generateAnswer<T extends Record<string, unknown>>({
  query,
  mcpClient,
  tools,
  model,
  maxSteps = 5,
}: {
  query: Query;
  mcpClient: ReturnType<typeof MCPWebClient.prototype.contextualize>;
  tools: Tool[];
  model: LanguageModelV3;
  maxSteps?: number;
}): Promise<{ text: string; object?: T }> {
  // Validate response tool schema if present
  if (query.responseTool && !query.responseTool.inputSchema) {
    const error = new Error(
      'Response tool input schema is required for structured output generation'
    );
    mcpClient.fail(error);
    throw error;
  }

  const aiSdkTools = mcpToAiSdkToolset(tools, mcpClient);

  // Remove response tool from available tools if present
  if (query.responseTool) {
    delete aiSdkTools[query.responseTool.name];
  }

  // Remove tools whose results are already provided in context
  for (const ctx of query.context) {
    delete aiSdkTools[ctx.name];
  }

  const instructions = trim(`
    You are an AI assistant. Use the provided context and available tools to fulfill the user's request.

    ${queryContextToXmlTemplate(query)}

    If you need additional information not present in the context, use the available tools to retrieve it.
  `)

  const agent = new ToolLoopAgent({
    model,
    tools: aiSdkTools,
    instructions,
    ...(query.responseTool?.inputSchema && {
      output: Output.object({
        schema: jsonSchema(query.responseTool.inputSchema as JSONSchema7),
      }),
    }),
    stopWhen: stepCountIs(maxSteps),
  });

  const result = await agent.generate({ prompt: query.prompt });

  return {
    text: result.text,
    object: result.output as T | undefined,
  };
}

/**
 * Creates a Hono app for the checkers AI agent
 *
 * @param config - Agent configuration including API keys and URLs
 * @returns Configured Hono app instance
 */
export function createApp(config: AgentConfig) {
  const mcpClient = new MCPWebClient({
    serverUrl: config.bridgeUrl,
  });

  // Lazy model initialization - only creates the model on first query
  const getModel = createLazyModel(config);

  // Initialize Hono app
  const app = new Hono();

  // Enable CORS
  app.use(
    '*',
    cors({
      origin: config.allowedOrigins,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    })
  );

  // Store active query contexts and retry counts
  const activeQueries = new Map<string, Query>();
  const queryRetryCount = new Map<string, number>();

  const MAX_RETRIES = 3;

  async function processQuery(query: Query, uuid: string): Promise<void> {
    const queryClient = mcpClient.contextualize(query);

    // Initialize retry count for this query
    const currentRetries = queryRetryCount.get(uuid) || 0;

    try {
      // Check if we've exceeded max retries
      if (currentRetries >= MAX_RETRIES) {
        const errorMessage = `Query failed after ${MAX_RETRIES} attempts. Please try again with different parameters.`;
        console.error(`\n❌ ${errorMessage}`);
        await queryClient.fail(errorMessage);
        return;
      }

      // Send initial progress (include retry info if retrying)
      const progressMessage =
        currentRetries > 0
          ? `Retrying (attempt ${currentRetries + 1}/${MAX_RETRIES})...`
          : 'Analyzing game state...';
      await queryClient.sendProgress(progressMessage);

      // Get available tools
      const { tools } = await queryClient.listTools();
      console.log(
        `Available tools for query ${uuid}:`,
        tools.map((t) => t.name)
      );

      const result = await generateAnswer({
        query,
        mcpClient: queryClient,
        tools,
        model: getModel(),
      });

      if (query.responseTool && result.object) {
        await queryClient.callTool(query.responseTool.name, result.object);
      } else {
        await queryClient.complete(result.text);
      }

      console.log(`✅ Query ${uuid} completed successfully`);
      // Clear retry count on success
      queryRetryCount.delete(uuid);
    } catch (error) {
      console.error(
        `\n❌ Error in query ${uuid} (attempt ${currentRetries + 1}/${MAX_RETRIES}):`,
        error
      );

      // Increment retry count
      queryRetryCount.set(uuid, currentRetries + 1);

      // Check if we should retry
      if (currentRetries + 1 < MAX_RETRIES) {
        console.log(`🔄 Retrying query ${uuid}...`);
        // Retry the query
        return processQuery(query, uuid);
      } else {
        // Max retries exceeded
        const errorMessage = `Query failed after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : String(error)}`;
        await queryClient.fail(errorMessage);
        queryRetryCount.delete(uuid);
      }
    } finally {
      // Always clean up the active query
      activeQueries.delete(uuid);
    }
  }

  // Health check
  app.get('/health', (c) =>
    c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  );

  // Main query endpoint
  app.put('/query/:uuid', async (c) => {
    const uuid = c.req.param('uuid');
    const request = QuerySchema.safeParse(await c.req.json());

    if (!request.success) {
      return c.json(
        {
          success: false,
          error: request.error.message,
        },
        400
      );
    }

    const query = request.data;

    console.log(`\n🎯 Received query ${query.uuid}:`, query.prompt);

    activeQueries.set(uuid, query);

    // Process asynchronously to provide an immediate response
    processQuery(query, uuid).catch((error) => {
      console.error(`\n💥 Unhandled error processing query ${uuid}:`, error);
    });

    // Return immediately with 202 Accepted
    return c.json(
      {
        success: true,
        message: 'Query accepted and processing',
      },
      202
    );
  });

  return app;
}
