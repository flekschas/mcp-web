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
import { generateObject, generateText, type JSONSchema7, jsonSchema, stepCountIs } from 'ai';
import type { LanguageModelV2 } from '@ai-sdk/provider';
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
  openai: 'gpt-4o',
  cerebras: 'llama-4-scout-17b-16e-instruct',
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
function createLazyModel(config: AgentConfig): () => LanguageModelV2 {
  let cachedModel: LanguageModelV2 | null = null;

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

function mcpToAiSdkTools(
  tools: Tool[],
  mcpClient: ReturnType<typeof MCPWebClient.prototype.contextualize>
) {
  return Object.fromEntries(
    tools.map((toolDef) => [
      toolDef.name,
      {
        description: toolDef.description || '',
        inputSchema: jsonSchema(toolDef.inputSchema as JSONSchema7),
        execute: async (args: Record<string, unknown>) => {
          return await mcpClient.callTool(toolDef.name, args);
        },
      },
    ])
  );
}

const xml = (tag: string, content: string) => `<${tag}>${content}</${tag}>`;

function queryContextToXmlTemplate(query: Query) {
  let out: string = '<context>';
  query.context.forEach((context) => {
    out += xml(
      context.type,
      [
        xml('name', context.name),
        xml('description', context.name),
        xml('value', JSON.stringify(context.value)),
        context.schema ? xml('schema', JSON.stringify(context.schema)) : '',
      ].join('')
    );
  });
  out += '</context>';
  return out;
}

const trim = (str: string) => str.replace(/\s+/g, ' ');

type UnstructuredQuery = Omit<Query, 'responseTool'>;
type StructuredQuery = Required<Pick<Query, 'responseTool'>> & UnstructuredQuery;

const isStructuredQuery = (query: Query): query is StructuredQuery => 'responseTool' in query;

/**
 * Generic contextual generate object function using a two-phase approach:
 *
 * PHASE 1: Context Gathering (generateText with tools)
 * - LLM can call any MCP tool EXCEPT the response tool
 * - Uses `activeTools` to limit which tools are available
 * - Gathers information needed to answer the query
 * - Builds up a conversation history with tool results
 *
 * PHASE 2: Structured Output (generateObject with schema only)
 * - Takes the conversation history from Phase 1
 * - LLM generates JSON matching the response tool's input schema
 * - NO tool calling happens in this phase
 * - generateObject does NOT support tools/activeTools/toolChoice
 * - The schema tells the LLM what structure to produce
 *
 * DATA FLOW:
 * 1. User query → Phase 1 → LLM calls tools → context gathered
 * 2. Context + query → Phase 2 → LLM generates structured JSON
 * 3. Structured JSON can be passed to response tool by caller
 *
 * WHY TWO PHASES?
 * - Separates information gathering from decision making
 * - Response tool gets well-formed structured input
 * - Clear separation of concerns: context vs. action
 */
async function generateStructuredAnswer<T extends Record<string, unknown>>({
  query,
  mcpClient,
  tools,
  model,
  maxSteps = 5,
}: {
  query: StructuredQuery;
  mcpClient: ReturnType<typeof MCPWebClient.prototype.contextualize>;
  tools: Tool[];
  model: LanguageModelV2;
  maxSteps?: number;
}): Promise<{ object: T; contextMessages: unknown[] }> {
  if (!query.responseTool) {
    const error = new Error('Response tool is required for structured output generation');
    mcpClient.fail(error);
    throw error;
  }

  const responseToolInputSchema = query.responseTool.inputSchema;

  if (!responseToolInputSchema) {
    const error = new Error(
      'Response tool input schema is required for structured output generation'
    );
    mcpClient.fail(error);
    throw error;
  }

  // Wrap JSON Schema with jsonSchema() for AI SDK
  const responseToolSchema = jsonSchema(responseToolInputSchema as JSONSchema7);

  const aiSdkTools = mcpToAiSdkTools(tools, mcpClient);

  const nonResponseAiSdkTools = { ...aiSdkTools };

  delete nonResponseAiSdkTools[query.responseTool.name];

  // Phase 1: Gather context (use all tools EXCEPT response tool)
  const contextGathering = await generateText({
    model,
    system: trim(`
    You are an information gathering agent who is an expert in Spanish checkers rules, strategy, and gameplay.
    Your role is to use available tools to collect any information needed to answer the user's query.

    The context below contains:
    1. Already-executed tool calls and their results
    2. Ephemeral information relevant to the query

    ${queryContextToXmlTemplate(query)}

    INSTRUCTIONS:
    - Analyze what additional information is required to answer the query
    - Call relevant tools to gather missing information
    - Make multiple tool calls if needed to get complete information
    - Do NOT re-call tools whose results are already provided in the context above
    - Do NOT answer the user's query - only gather the necessary context

    Your output will be provided to another agent that will generate the final answer.
    `),
    prompt: query.prompt,
    tools: nonResponseAiSdkTools,
    stopWhen: stepCountIs(maxSteps),
  });

  console.log('contextGathering: messages', contextGathering.response.messages);

  // Phase 2: Structured output - LLM generates the final response in the shape of response tool input
  // If no response tool specified, we can't generate structured output

  // Use generateObject to create structured data conforming to the response tool's input schema
  // NOTE: generateObject does NOT support tools/activeTools/toolChoice parameters
  // It only generates JSON matching the schema based on the conversation history
  const result = await generateObject({
    model,
    schema: responseToolSchema,
    messages: [
      {
        role: 'system',
        content: trim(`
          You are an AI assistant expert in Spanish checkers rules, strategy, and gameplay.
          Use the provided information below to answer the user's query.

          The context below contains:
          1. Already-executed tool calls and their results
          2. Ephemeral information relevant to the query

          ${queryContextToXmlTemplate(query)}
        `),
      },
      ...contextGathering.response.messages,
      { role: 'user', content: query.prompt },
    ],
    providerOptions: {
      openai: {
        jsonSchemaStrict: true,
      },
    },
  });

  return {
    object: result.object as T,
    contextMessages: contextGathering.response.messages,
  };
}

async function generateTextAnswer({
  query,
  mcpClient,
  tools,
  model,
  maxSteps = 5,
}: {
  query: UnstructuredQuery;
  mcpClient: ReturnType<typeof MCPWebClient.prototype.contextualize>;
  tools: Tool[];
  model: LanguageModelV2;
  maxSteps?: number;
}): Promise<string> {
  const aiSdkTools = mcpToAiSdkTools(tools, mcpClient);

  const answer = await generateText({
    model,
    system: trim(`
    You are an AI assistant expert in Spanish checkers rules, strategy, and gameplay.
    Use available tools to collect any information needed to answer the user's query.

    The context below contains:
    1. Already-executed tool calls and their results
    2. Ephemeral information relevant to the query

    ${queryContextToXmlTemplate(query)}

    INSTRUCTIONS:
    - Analyze what additional information is required to answer the query
    - Call relevant tools to gather missing information
    - Make multiple tool calls if needed to get complete information
    - Do NOT re-call tools whose results are already provided in the context above
    - After gathering necessary information, provide a complete answer to the user's query
    `),
    prompt: query.prompt,
    tools: aiSdkTools,
    stopWhen: stepCountIs(maxSteps),
  });

  return answer.text;
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

      if (isStructuredQuery(query)) {
        const { object } = await generateStructuredAnswer({
          query,
          mcpClient: queryClient,
          tools,
          model: getModel(),
        });
        await queryClient.callTool(query.responseTool.name, object);
      } else {
        const answer = await generateTextAnswer({
          query,
          mcpClient: queryClient,
          tools,
          model: getModel(),
        });
        await queryClient.complete(answer);
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
