import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCPWebClient, type MCPWebClientConfig } from '@mcp-web/client';
import {
  defineTool,
  type MCPWebConfig,
  MissingAuthenticationErrorCode,
  QueryDoneErrorCode,
  QueryNotFoundErrorCode,
  type Query,
  ClientNotConextualizedErrorCode,
} from '@mcp-web/types';
import { MCPWeb } from '@mcp-web/web';
import { ListPromptsResultSchema, ListResourcesResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mcpWebConfig = {
  name: 'test',
  description: 'Test ',
  host: 'localhost',
  wsPort: 3001,
  mcpPort: 3002,
  persistAuthToken: false,
  autoConnect: true,
  agentUrl: 'http://localhost:3003',
} satisfies MCPWebConfig;

const mcpWebClientConfig: MCPWebClientConfig = {
  serverUrl: `http://${mcpWebConfig.host}:${mcpWebConfig.mcpPort}`,
};

let bridgeProcess: ReturnType<typeof spawn> | undefined;
let mcpWeb: MCPWeb | undefined;
let mockAgentServer: ReturnType<typeof Bun.serve> | undefined;

// Start bridge as separate process using Bun
const spawnBridge = () => spawn(
  'bun',
  ['run', join(__dirname, '../helpers/start-bridge.ts')],
  {
    env: {
      ...process.env,
      WS_PORT: mcpWebConfig.wsPort.toString(),
      MCP_PORT: mcpWebConfig.mcpPort.toString(),
      AGENT_URL: mcpWebConfig.agentUrl,
    },
    stdio: ['ignore', 'ignore', 'pipe'], // Suppress stdout, only show stderr for errors
    detached: false, // Keep bridge attached to test process
  }
);

beforeAll(async () => {
  bridgeProcess = spawnBridge();

  // Wait for bridge to be ready
  await new Promise<void>((resolve) => {
    bridgeProcess?.stderr?.on('data', (data) => {
      if (data.toString().includes('[Bridge] Ready')) {
        resolve();
      }
    });
  });
});

afterAll(async () => {
  if (bridgeProcess) {
    bridgeProcess.kill();
  }
});

beforeEach(async () => {
  mcpWeb = undefined;
  mockAgentServer = undefined;
});

afterEach(async () => {
  if (mcpWeb) {
    mcpWeb.disconnect();
  }
  if (mockAgentServer) {
    mockAgentServer.stop(true);
    // Wait a bit for the port to be released
    await new Promise(resolve => setTimeout(resolve, 100));
  }
});

test('MCPWebBridge accepts query-contextualized client requests', async () => {
  // Start a mock agent server
  let capturedQuery: Query | undefined;

  mockAgentServer = Bun.serve({
    port: 3003,
    async fetch(req) {
      const url = new URL(req.url);

      if (req.method === 'PUT' && url.pathname.startsWith('/query/')) {
        capturedQuery = await req.json() as Query;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not found', { status: 404 });
    }
  });

  // Create MCPWeb with agentUrl pointing to mock agent
  mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  // Register a tool that should be discoverable
  mcpWeb.addTool({
    name: 'test_tool',
    description: 'A test tool',
    handler: () => 'test result'
  });

  // Connect and wait for authentication
  await mcpWeb.connect();

  // Start the query - this sends it to the bridge and mock agent
  const queryIterator = mcpWeb.query({ prompt: 'Test query prompt' });

  // Get the first event (should be acceptance)
  const firstEvent = await queryIterator.next();
  expect(firstEvent.value.type).toBe('query_accepted');

  // Wait a bit for the query to be captured by the agent
  await new Promise(resolve => setTimeout(resolve, 100));

  expect(capturedQuery).toBeDefined();
  if (!capturedQuery) throw new Error('Expected capturedQuery to be defined');

  expect(capturedQuery.prompt).toBe('Test query prompt');

  // Now create a client and contextualize it with the captured query
  const client = new MCPWebClient(mcpWebClientConfig);
  const contextClient = client.contextualize(capturedQuery);

  // The contextualized client should be able to list tools
  const listResult = await contextClient.listTools();
  const parsedListToolsResult = ListToolsResultSchema.safeParse(listResult);
  expect(parsedListToolsResult.success).toBe(true);

  // And call the registered tool
  const callResult = await contextClient.callTool('test_tool', {});
  expect(callResult).toBeDefined();

  const listResourcesResult = await contextClient.listResources();
  const parsedListResourcesResult = ListResourcesResultSchema.safeParse(listResourcesResult);
  expect(parsedListResourcesResult.success).toBe(true);

  const listPromptsResult = await contextClient.listPrompts();
  const parsedListPromptsResult = ListPromptsResultSchema.safeParse(listPromptsResult);
  expect(parsedListPromptsResult.success).toBe(true);
});


test('Query events are emitted correctly', async () => {
  mockAgentServer = Bun.serve({
    port: 3003,
    async fetch(req) {
      const url = new URL(req.url);

      const client = new MCPWebClient(mcpWebClientConfig);

      const handleQuery = async (query: Query) => {
        const contextClient = client.contextualize(query);

        await contextClient.sendProgress('Progress');

        const listResult = await contextClient.listTools();
        expect(listResult.tools.length).toBe(3);

        const testTool1 = listResult.tools.find((t) => t.name === 'test_1');
        expect(testTool1).toBeDefined();
        if (!testTool1) throw new Error('Expected testTool1 to be defined');

        const callResult1 = await contextClient.callTool(testTool1.name, {});
        expect(callResult1.isError).toBeUndefined();
        expect(callResult1.content).toBeDefined();
        expect(callResult1.content.length).toBeGreaterThan(0);
        expect(callResult1.content[0].type).toBe('text');
        const data1 = callResult1.content[0].type === 'text' ? callResult1.content[0].text : '';
        expect(data1).toBe('test_1');

        await contextClient.sendProgress('Progress 2');

        const testTool2 = listResult.tools.find((t) => t.name === 'test_2');
        expect(testTool2).toBeDefined();
        if (!testTool2) throw new Error('Expected testTool2 to be defined');

        const callResult2 = await contextClient.callTool(testTool2.name, { value: 123 });
        expect(callResult2.isError).toBeUndefined();
        expect(callResult2.content).toBeDefined();
        expect(callResult2.content.length).toBeGreaterThan(0);
        expect(callResult2.content[0].type).toBe('text');
        const data2 = callResult2.content[0].type === 'text' ? callResult2.content[0].text : '';
        expect(data2).toBe('test_2:123');

        await contextClient.complete(`Tool call result: ${data1} and ${data2}`);
      };

      if (req.method === 'PUT' && url.pathname.startsWith('/query/')) {
        const query = await req.json() as Query;
        setTimeout(() => { handleQuery(query) }, 0);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not found', { status: 404 });
    }
  });

  // Create MCPWeb with agentUrl pointing to mock agent
  mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  // Register discoverable tools
  mcpWeb.addTool({
    name: 'test_1',
    description: 'Tool 1',
    handler: () => 'test_1'
  });
  mcpWeb.addTool({
    name: 'test_2',
    description: 'Tool 2',
    handler: ({ value }: { value: number }) => `test_2:${value}`,
    inputSchema: z.object({ value: z.int() }),
    outputSchema: z.object({ result: z.string() })
  });

  // Connect and wait for authentication
  await mcpWeb.connect();

  // Start the query - this sends it to the bridge and mock agent
  const responseIterator = mcpWeb.query({ prompt: 'Test prompt' });

  // Get the first event (should be acceptance)
  const firstEvent = await responseIterator.next();
  expect(firstEvent.value.type).toBe('query_accepted');

  // Get the second event (should be progress)
  const secondEvent = await responseIterator.next();
  expect(secondEvent.value.type).toBe('query_progress');
  expect(secondEvent.value.message).toBe('Progress');

  // Get the second event (should be progress)
  const thirdEvent = await responseIterator.next();
  expect(thirdEvent.value.type).toBe('query_progress');
  expect(thirdEvent.value.message).toBe('Progress 2');

  // Get the third and final event (should be complete)
  const fourthEvent = await responseIterator.next();
  expect(fourthEvent.value.type).toBe('query_complete');
  expect(fourthEvent.value.message).toBe('Tool call result: test_1 and test_2:123');
  expect(fourthEvent.value.toolCalls).toBeDefined();
  expect(fourthEvent.value.toolCalls?.length).toBe(2);
  expect(fourthEvent.value.toolCalls?.[0].tool).toBe('test_1');
  expect(fourthEvent.value.toolCalls?.[0].arguments).toBeDefined();
  expect(fourthEvent.value.toolCalls?.[0].result.data).toBe('test_1');
  expect(fourthEvent.value.toolCalls?.[1].tool).toBe('test_2');
  expect(fourthEvent.value.toolCalls?.[1].arguments).toEqual({ value: 123 });
  expect(fourthEvent.value.toolCalls?.[1].result.data).toBe('test_2:123');

  // Verify the iterator is complete (no more events)
  const lastEvent = await responseIterator.next();
  expect(lastEvent.done).toBe(true);
  expect(lastEvent.value).toBeUndefined();
});


test('Response tool automatically completes a query', async () => {
  mockAgentServer = Bun.serve({
    port: 3003,
    async fetch(req) {
      const url = new URL(req.url);

      const client = new MCPWebClient(mcpWebClientConfig);

      const handleQuery = async (query: Query) => {
        const contextClient = client.contextualize(query);

        expect(query.responseTool).toBeDefined();
        if (!query.responseTool) throw new Error('Expected responseTool to be defined');

        const callResult1 = await contextClient.callTool('tool_1', {});
        expect(callResult1.isError).toBeUndefined();
        expect(callResult1.content).toBeDefined();
        expect(callResult1.content.length).toBeGreaterThan(0);
        expect(callResult1.content[0].type).toBe('text');
        const data1 = JSON.parse(callResult1.content[0].type === 'text' ? callResult1.content[0].text : '{}');
        expect(data1).toEqual({ theAnswerToEverything: 42 });

        await contextClient.sendProgress('Progress 1');

        const callResult2 = await contextClient.callTool('tool_1', {});
        expect(callResult2.isError).toBeUndefined();
        expect(callResult2.content).toBeDefined();
        expect(callResult2.content.length).toBeGreaterThan(0);
        expect(callResult2.content[0].type).toBe('text');
        const data2 = JSON.parse(callResult2.content[0].type === 'text' ? callResult2.content[0].text : '{}');
        expect(data2).toEqual({ theAnswerToEverything: 42 });

        const responseToolResult = await contextClient.callTool(
          query.responseTool.name,
          { number: 123 }
        );
        expect(responseToolResult.isError).toBeUndefined();
        expect(responseToolResult.content).toBeDefined();
        expect(responseToolResult.content.length).toBeGreaterThan(0);
        expect(responseToolResult.content[0].type).toBe('text');
        const responseData = JSON.parse(responseToolResult.content[0].type === 'text' ? responseToolResult.content[0].text : '{}');
        expect(responseData).toEqual({ double: 246 });

        // Query should be automatically completed by the responseTool call.
        // All subsequent progress and tool calls should be rejected.
        expect(contextClient.sendProgress('Progress 2')).rejects.toThrow(QueryDoneErrorCode);
        expect(contextClient.callTool('tool_1', {})).rejects.toThrow(QueryDoneErrorCode);
        expect(contextClient.complete('This should not be passed to the MCP Web instance')).rejects.toThrow(QueryDoneErrorCode);
      };

      if (req.method === 'PUT' && url.pathname.startsWith('/query/')) {
        const query = await req.json() as Query;
        setTimeout(() => { handleQuery(query) }, 0);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not found', { status: 404 });
    }
  });

  // Create MCPWeb with agentUrl pointing to mock agent
  mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  // Register discoverable tools
  const tool1 = defineTool({
    name: 'tool_1',
    description: 'Tool 1',
    handler: () => ({ theAnswerToEverything: 42 }),
    outputSchema: z.object({ theAnswerToEverything: z.int() })
  });
  mcpWeb.addTool(tool1);

  const responseTool = defineTool({
    name: 'response_tool',
    description: 'Response tool',
    handler: ({ number }) => ({ double: number * 2 }),
    inputSchema: z.object({ number: z.int() }),
    outputSchema: z.object({ double: z.int() })
  });
  mcpWeb.addTool(responseTool);

  // Connect and wait for authentication
  await mcpWeb.connect();

  // Start the query - this sends it to the bridge and mock agent
  const responseIterator = mcpWeb.query({
    prompt: 'Test prompt',
    responseTool
  });

  // Get the first event (should be acceptance)
  const firstEvent = await responseIterator.next();
  expect(firstEvent.value.type).toBe('query_accepted');

  // Get the second event (should be progress)
  const secondEvent = await responseIterator.next();
  expect(secondEvent.value.type).toBe('query_progress');
  expect(secondEvent.value.message).toBe('Progress 1');

  // Get the third and final event (should be complete)
  const fourthEvent = await responseIterator.next();
  expect(fourthEvent.value.type).toBe('query_complete');
  expect(fourthEvent.value.toolCalls).toBeDefined();
  expect(fourthEvent.value.toolCalls?.length).toBe(3);
  expect(fourthEvent.value.toolCalls?.[0].tool).toBe('tool_1');
  expect(fourthEvent.value.toolCalls?.[0].arguments).toBeDefined();
  expect(fourthEvent.value.toolCalls?.[0].result.data).toEqual({ theAnswerToEverything: 42 });
  expect(fourthEvent.value.toolCalls?.[1].tool).toBe('tool_1');
  expect(fourthEvent.value.toolCalls?.[1].arguments).toBeDefined();
  expect(fourthEvent.value.toolCalls?.[1].result.data).toEqual({ theAnswerToEverything: 42 });
  expect(fourthEvent.value.toolCalls?.[2].tool).toBe('response_tool');
  expect(fourthEvent.value.toolCalls?.[2].arguments).toEqual({ number: 123 });
  expect(fourthEvent.value.toolCalls?.[2].result.data).toEqual({ double: 246 });

  // Verify the iterator is complete (no more events)
  const lastEvent = await responseIterator.next();
  expect(lastEvent.done).toBe(true);
  expect(lastEvent.value).toBeUndefined();
});


test('Query can be cancelled by the MCP Web client', async () => {
  mockAgentServer = Bun.serve({
    port: 3003,
    async fetch(req) {
      const url = new URL(req.url);

      const client = new MCPWebClient(mcpWebClientConfig);

      const handleQuery = async (query: Query) => {
        expect(client.cancel()).rejects.toThrow(ClientNotConextualizedErrorCode);
        const contextClient = client.contextualize(query);
        expect(contextClient.cancel('I am tired')).resolves.toBeUndefined();

        // All subsequent progress and tool calls should be rejected.
        expect(contextClient.listTools()).rejects.toThrow(QueryDoneErrorCode);
        expect(contextClient.listResources()).rejects.toThrow(QueryDoneErrorCode);
        expect(contextClient.listPrompts()).rejects.toThrow(QueryDoneErrorCode);
        expect(contextClient.sendProgress('progress')).rejects.toThrow(QueryDoneErrorCode);
        expect(contextClient.callTool('tool_1', {})).rejects.toThrow(QueryDoneErrorCode);
        expect(contextClient.complete('complete')).rejects.toThrow(QueryDoneErrorCode);
      };

      if (req.method === 'PUT' && url.pathname.startsWith('/query/')) {
        const query = await req.json() as Query;
        setTimeout(() => { handleQuery(query) }, 0);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not found', { status: 404 });
    }
  });

  // Create MCPWeb with agentUrl pointing to mock agent
  mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  // Register discoverable tools
  const tool1 = defineTool({
    name: 'tool_1',
    description: 'Tool 1',
    handler: () => ({ theAnswerToLife: 42 }),
    outputSchema: z.object({ theAnswerToLife: z.int() })
  });
  mcpWeb.addTool(tool1);

  // Connect and wait for authentication
  await mcpWeb.connect();

  // Start the query - this sends it to the bridge and mock agent
  const responseIterator = mcpWeb.query({ prompt: 'Test prompt' });

  // Get the first event (should be acceptance)
  const firstEvent = await responseIterator.next();
  expect(firstEvent.value.type).toBe('query_accepted');

  // Get the second event (should be progress)
  const secondEvent = await responseIterator.next();
  expect(secondEvent.value.type).toBe('query_cancel');
  expect(secondEvent.value.reason).toBe('I am tired');
});

test('Query can be cancelled by the frontend', async () => {
  mockAgentServer = Bun.serve({
    port: 3003,
    async fetch(req) {
      const url = new URL(req.url);

      const client = new MCPWebClient(mcpWebClientConfig);

      const handleQuery = async (query: Query) => {
        const contextClient = client.contextualize(query);

        // Before the query is cancelled, the client should be able to
        // list tools, resources, prompts, send progress, call tools
        expect(contextClient.listTools()).resolves.toBeDefined();
        expect(contextClient.listResources()).resolves.toBeDefined();
        expect(contextClient.listPrompts()).resolves.toBeDefined();
        expect(contextClient.sendProgress('progress 1')).resolves.toBeUndefined();
        expect(contextClient.callTool('tool_1', {})).resolves.toBeDefined();

        // Wait for the query to be cancelled by the frontend.
        await new Promise(resolve => setTimeout(resolve, 100));

        // All subsequent progress and tool calls should be rejected.
        expect(contextClient.listTools()).rejects.toThrow(QueryNotFoundErrorCode);
        expect(contextClient.listResources()).rejects.toThrow(QueryNotFoundErrorCode);
        expect(contextClient.listPrompts()).rejects.toThrow(QueryNotFoundErrorCode);
        expect(contextClient.sendProgress('progress 2')).rejects.toThrow(QueryNotFoundErrorCode);
        expect(contextClient.callTool('tool_1', {})).rejects.toThrow(QueryNotFoundErrorCode);
        expect(contextClient.complete('complete')).rejects.toThrow(QueryNotFoundErrorCode);
      };

      if (req.method === 'PUT' && url.pathname.startsWith('/query/')) {
        const query = await req.json() as Query;
        setTimeout(() => { handleQuery(query) }, 0);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not found', { status: 404 });
    }
  });

  // Create MCPWeb with agentUrl pointing to mock agent
  mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  // Register discoverable tools
  const tool1 = defineTool({
    name: 'tool_1',
    description: 'Tool 1',
    handler: () => ({ theAnswerToLife: 42 }),
    outputSchema: z.object({ theAnswerToLife: z.int() })
  });
  mcpWeb.addTool(tool1);

  // Connect and wait for authentication
  await mcpWeb.connect();

  const abortController = new AbortController();

  // Start the query - this sends it to the bridge and mock agent
  const responseIterator = mcpWeb.query({ prompt: 'Test prompt' }, abortController.signal);

  setTimeout(() => {
    abortController.abort();
  }, 50);

  // Get the first event (should be acceptance)
  const firstEvent = await responseIterator.next();
  expect(firstEvent.value.type).toBe('query_accepted');

  // Get the second event (should be progress)
  const secondEvent = await responseIterator.next();
  expect(secondEvent.value.type).toBe('query_progress');
  expect(secondEvent.value.message).toBe('progress 1');

  // Get the second event (should be progress)
  const thirdEvent = await responseIterator.next();
  expect(thirdEvent.value.type).toBe('query_cancel');
  expect(thirdEvent.value.reason).toBeUndefined();
});
