import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCPWebClient, type MCPWebClientConfig } from '@mcp-web/client';
import {
  type MCPWebConfig,
  QueryDoneErrorCode,
  QueryNotFoundErrorCode,
  type Query,
  ClientNotConextualizedErrorCode,
} from '@mcp-web/types';
import { MCPWeb } from '@mcp-web/web';
import { ListPromptsResultSchema, ListResourcesResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { MockAgentServer } from '../helpers/mock-agent';
import { killProcess } from '../helpers/kill-process';

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
let mockAgentServer: MockAgentServer | undefined;

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
    await killProcess(bridgeProcess);
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
    await mockAgentServer.stop();
  }
});

test('MCPWebBridge accepts query-contextualized client requests', async () => {
  // Start a mock agent server
  let capturedQuery: Query | undefined;

  const queryHandler = async (_client: MCPWebClient, query: Query) => {
    capturedQuery = query;
  };

  mockAgentServer = new MockAgentServer(mcpWebClientConfig, queryHandler);

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
  const response = mcpWeb.query({ prompt: 'Test query prompt' });

  // Get the first event (should be acceptance)
  const firstEvent = await response.stream.next();
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
  const queryHandler = async (client: MCPWebClient) => {
    await client.sendProgress('Progress');

    const listResult = await client.listTools();
    expect(listResult.tools.length).toBe(3);

    const testTool1 = listResult.tools.find((t) => t.name === 'test_1');
    expect(testTool1).toBeDefined();
    if (!testTool1) throw new Error('Expected testTool1 to be defined');

    const callResult1 = await client.callTool(testTool1.name, {});
    expect(callResult1.isError).toBeUndefined();
    expect(callResult1.content).toBeDefined();
    expect(callResult1.content.length).toBeGreaterThan(0);
    expect(callResult1.content[0].type).toBe('text');
    const data1 = callResult1.content[0].type === 'text' ? callResult1.content[0].text : '';
    expect(data1).toBe('test_1');

    await client.sendProgress('Progress 2');

    const testTool2 = listResult.tools.find((t) => t.name === 'test_2');
    expect(testTool2).toBeDefined();
    if (!testTool2) throw new Error('Expected testTool2 to be defined');

    const callResult2 = await client.callTool(testTool2.name, { value: 123 });
    expect(callResult2.isError).toBeUndefined();
    expect(callResult2.content).toBeDefined();
    expect(callResult2.content.length).toBeGreaterThan(0);
    expect(callResult2.content[0].type).toBe('text');
    const data2 = callResult2.content[0].type === 'text' ? callResult2.content[0].text : '';
    expect(JSON.parse(data2)).toEqual({ result: 'test_2:123' });

    await client.complete(`Tool call result: ${data1} and ${data2}`);
  };

  mockAgentServer = new MockAgentServer(mcpWebClientConfig, queryHandler);

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
    handler: ({ value }) => ({ result: `test_2:${value}` }),
    inputSchema: z.object({ value: z.int() }),
    outputSchema: z.object({ result: z.string() })
  });

  // Connect and wait for authentication
  await mcpWeb.connect();

  // Start the query - this sends it to the bridge and mock agent
  const response = mcpWeb.query({ prompt: 'Test prompt' });

  // Get the first event (should be acceptance)
  const firstEvent = await response.stream.next();
  expect(firstEvent.value.type).toBe('query_accepted');

  // Get the second event (should be progress)
  const secondEvent = await response.stream.next();
  expect(secondEvent.value.type).toBe('query_progress');
  expect(secondEvent.value.message).toBe('Progress');

  // Get the second event (should be progress)
  const thirdEvent = await response.stream.next();
  expect(thirdEvent.value.type).toBe('query_progress');
  expect(thirdEvent.value.message).toBe('Progress 2');

  // Get the third and final event (should be complete)
  const fourthEvent = await response.stream.next();
  expect(fourthEvent.value.type).toBe('query_complete');
  expect(fourthEvent.value.message.replace(/\n/g, '')).toBe('Tool call result: test_1 and {  "result": "test_2:123"}');
  expect(fourthEvent.value.toolCalls).toBeDefined();
  expect(fourthEvent.value.toolCalls?.length).toBe(2);
  expect(fourthEvent.value.toolCalls?.[0].tool).toBe('test_1');
  expect(fourthEvent.value.toolCalls?.[0].arguments).toBeDefined();
  expect(fourthEvent.value.toolCalls?.[0].result).toBe('test_1');
  expect(fourthEvent.value.toolCalls?.[1].tool).toBe('test_2');
  expect(fourthEvent.value.toolCalls?.[1].arguments).toEqual({ value: 123 });
  expect(fourthEvent.value.toolCalls?.[1].result).toEqual({ result: 'test_2:123' });

  // Verify the iterator is complete (no more events)
  const lastEvent = await response.stream.next();
  expect(lastEvent.done).toBe(true);
  expect(lastEvent.value).toBeUndefined();
});


test('Response tool automatically completes a query', async () => {
  const queryHandler = async (client: MCPWebClient, query: Query) => {
    expect(query.responseTool).toBeDefined();
    if (!query.responseTool) throw new Error('Expected responseTool to be defined');

    const callResult1 = await client.callTool('tool_1', {});
    expect(callResult1.isError).toBeUndefined();
    expect(callResult1.content).toBeDefined();
    expect(callResult1.content.length).toBeGreaterThan(0);
    expect(callResult1.content[0].type).toBe('text');
    const data1 = JSON.parse(callResult1.content[0].type === 'text' ? callResult1.content[0].text : '{}');
    expect(data1).toEqual({ theAnswerToEverything: 42 });

    await client.sendProgress('Progress 1');

    const callResult2 = await client.callTool('tool_1', {});
    expect(callResult2.isError).toBeUndefined();
    expect(callResult2.content).toBeDefined();
    expect(callResult2.content.length).toBeGreaterThan(0);
    expect(callResult2.content[0].type).toBe('text');
    const data2 = JSON.parse(callResult2.content[0].type === 'text' ? callResult2.content[0].text : '{}');
    expect(data2).toEqual({ theAnswerToEverything: 42 });

    const responseToolResult = await client.callTool(
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
    expect(client.sendProgress('Progress 2')).rejects.toThrow(QueryDoneErrorCode);
    expect(client.callTool('tool_1', {})).rejects.toThrow(QueryDoneErrorCode);
    expect(client.complete('This should not be passed to the MCP Web instance')).rejects.toThrow(QueryDoneErrorCode);
  };

  mockAgentServer = new MockAgentServer(mcpWebClientConfig, queryHandler);

  // Create MCPWeb with agentUrl pointing to mock agent
  mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  // Register discoverable tools
  const tool1 = mcpWeb.addTool({
    name: 'tool_1',
    description: 'Tool 1',
    handler: () => ({ theAnswerToEverything: 42 }),
    outputSchema: z.object({ theAnswerToEverything: z.int() })
  });

  const responseTool = mcpWeb.addTool({
    name: 'response_tool',
    description: 'Response tool',
    handler: ({ number }: { number: number }) => ({ double: number * 2 }),
    inputSchema: z.object({ number: z.int() }),
    outputSchema: z.object({ double: z.int() })
  });

  // Connect and wait for authentication
  await mcpWeb.connect();

  // Start the query - this sends it to the bridge and mock agent
  const response = mcpWeb.query({
    prompt: 'Test prompt',
    responseTool
  });

  // Get the first event (should be acceptance)
  const firstEvent = await response.stream.next();
  expect(firstEvent.value.type).toBe('query_accepted');

  // Get the second event (should be progress)
  const secondEvent = await response.stream.next();
  expect(secondEvent.value.type).toBe('query_progress');
  expect(secondEvent.value.message).toBe('Progress 1');

  // Get the third and final event (should be complete)
  const fourthEvent = await response.stream.next();
  expect(fourthEvent.value.type).toBe('query_complete');
  expect(fourthEvent.value.toolCalls).toBeDefined();
  expect(fourthEvent.value.toolCalls?.length).toBe(3);
  expect(fourthEvent.value.toolCalls?.[0].tool).toBe('tool_1');
  expect(fourthEvent.value.toolCalls?.[0].arguments).toBeDefined();
  expect(fourthEvent.value.toolCalls?.[0].result).toEqual({ theAnswerToEverything: 42 });
  expect(fourthEvent.value.toolCalls?.[1].tool).toBe('tool_1');
  expect(fourthEvent.value.toolCalls?.[1].arguments).toBeDefined();
  expect(fourthEvent.value.toolCalls?.[1].result).toEqual({ theAnswerToEverything: 42 });
  expect(fourthEvent.value.toolCalls?.[2].tool).toBe('response_tool');
  expect(fourthEvent.value.toolCalls?.[2].arguments).toEqual({ number: 123 });
  expect(fourthEvent.value.toolCalls?.[2].result).toEqual({ double: 246 });

  // Verify the iterator is complete (no more events)
  const lastEvent = await response.stream.next();
  expect(lastEvent.done).toBe(true);
  expect(lastEvent.value).toBeUndefined();
});


test('Query can be cancelled by the MCP Web client', async () => {
  const queryHandler = async (_client: MCPWebClient, query: Query) => {
    const client = new MCPWebClient(mcpWebClientConfig);

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

  mockAgentServer = new MockAgentServer(mcpWebClientConfig, queryHandler);

  // Create MCPWeb with agentUrl pointing to mock agent
  mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  // Register discoverable tools
  mcpWeb.addTool({
    name: 'tool_1',
    description: 'Tool 1',
    handler: () => ({ theAnswerToLife: 42 }),
    outputSchema: z.object({ theAnswerToLife: z.int() })
  });

  // Connect and wait for authentication
  await mcpWeb.connect();

  // Start the query - this sends it to the bridge and mock agent
  const response = mcpWeb.query({ prompt: 'Test prompt' });

  // Get the first event (should be acceptance)
  const firstEvent = await response.stream.next();
  expect(firstEvent.value.type).toBe('query_accepted');

  // Get the second event (should be progress)
  const secondEvent = await response.stream.next();
  expect(secondEvent.value.type).toBe('query_cancel');
  expect(secondEvent.value.reason).toBe('I am tired');
});

test('Query can be cancelled by the frontend', async () => {
  const queryHandler = async (client: MCPWebClient) => {
    // Before the query is cancelled, the client should be able to
    // list tools, resources, prompts, send progress, call tools
    expect(client.listTools()).resolves.toBeDefined();
    expect(client.listResources()).resolves.toBeDefined();
    expect(client.listPrompts()).resolves.toBeDefined();
    expect(client.sendProgress('progress 1')).resolves.toBeUndefined();
    expect(client.callTool('tool_1', {})).resolves.toBeDefined();

    // Wait for the query to be cancelled by the frontend.
    await new Promise(resolve => setTimeout(resolve, 100));

    // All subsequent progress and tool calls should be rejected.
    expect(client.listTools()).rejects.toThrow(QueryNotFoundErrorCode);
    expect(client.listResources()).rejects.toThrow(QueryNotFoundErrorCode);
    expect(client.listPrompts()).rejects.toThrow(QueryNotFoundErrorCode);
    expect(client.sendProgress('progress 2')).rejects.toThrow(QueryNotFoundErrorCode);
    expect(client.callTool('tool_1', {})).rejects.toThrow(QueryNotFoundErrorCode);
    expect(client.complete('complete')).rejects.toThrow(QueryNotFoundErrorCode);
  };

  mockAgentServer = new MockAgentServer(mcpWebClientConfig, queryHandler);

  // Create MCPWeb with agentUrl pointing to mock agent
  mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  // Register discoverable tools
  mcpWeb.addTool({
    name: 'tool_1',
    description: 'Tool 1',
    handler: () => ({ theAnswerToLife: 42 }),
    outputSchema: z.object({ theAnswerToLife: z.int() })
  });

  // Connect and wait for authentication
  await mcpWeb.connect();

  const abortController = new AbortController();

  // Start the query - this sends it to the bridge and mock agent
  const response = mcpWeb.query({ prompt: 'Test prompt' }, abortController.signal);

  setTimeout(() => {
    abortController.abort();
  }, 50);

  // Get the first event (should be acceptance)
  const firstEvent = await response.stream.next();
  expect(firstEvent.value.type).toBe('query_accepted');

  // Get the second event (should be progress)
  const secondEvent = await response.stream.next();
  expect(secondEvent.value.type).toBe('query_progress');
  expect(secondEvent.value.message).toBe('progress 1');

  // The third event should be a cancel
  const thirdEvent = await response.stream.next();
  expect(thirdEvent.value.type).toBe('query_cancel');
  expect(thirdEvent.value.reason).toBeUndefined();

  // Verify the iterator is complete (no more events)
  const lastEvent = await response.stream.next();
  expect(lastEvent.done).toBe(true);
  expect(lastEvent.value).toBeUndefined();
});

test('Query can complete despite unsuccessful tool calls', async () => {
  const queryHandler = async (client: MCPWebClient) => {
    const callToolResult1 = await client.callTool('tool_1', { value: 123 });
    expect(callToolResult1.isError).toBe(true);
    expect(callToolResult1.content).toBeDefined();
    expect(callToolResult1.content.length).toBeGreaterThan(0);
    expect(callToolResult1.content[0].type).toBe('text');
    const callToolResult1Content = JSON.parse(callToolResult1.content[0].type === 'text' ? callToolResult1.content[0].text : '{}');
    expect(callToolResult1Content).toEqual({ error: 'Tool execution failed: Don\'t call me with 123' });

    const callToolResult2 = await client.callTool('tool_1', { value: 42 });
    expect(callToolResult2.content).toBeDefined();
    expect(callToolResult2.content.length).toBeGreaterThan(0);
    expect(callToolResult2.content[0].type).toBe('text');
    const callToolResult2Content = JSON.parse(callToolResult2.content[0].type === 'text' ? callToolResult2.content[0].text : '{}');
    expect(callToolResult2Content).toEqual({ theAnswerToAnything: 42 });

    await client.complete('The answer to anything is 42');
  };

  mockAgentServer = new MockAgentServer(mcpWebClientConfig, queryHandler);

  // Create MCPWeb with agentUrl pointing to mock agent
  mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  // Register discoverable tools
  mcpWeb.addTool({
    name: 'tool_1',
    description: 'Tool 1',
    handler: ({ value }: { value: number }) => {
      if (value === 123) throw new Error('Don\'t call me with 123');
      return { theAnswerToAnything: value };
    },
    inputSchema: z.object({ value: z.int() }),
    outputSchema: z.object({ theAnswerToAnything: z.int() })
  });

  // Connect and wait for authentication
  await mcpWeb.connect();

  const response = mcpWeb.query({ prompt: 'Test prompt' });

  // Get the first event (should be acceptance)
  const firstEvent = await response.stream.next();
  expect(firstEvent.value.type).toBe('query_accepted');

  // Get the second event (should be progress)
  const secondEvent = await response.stream.next();
  expect(secondEvent.value.type).toBe('query_complete');
  expect(secondEvent.value.message).toBe('The answer to anything is 42');
  expect(secondEvent.value.toolCalls).toBeDefined();
  expect(secondEvent.value.toolCalls?.length).toBe(2);
  expect(secondEvent.value.toolCalls?.[0].tool).toBe('tool_1');
  expect(secondEvent.value.toolCalls?.[0].arguments).toEqual({ value: 123 });
  expect(secondEvent.value.toolCalls?.[0].result).toEqual({ error: 'Tool execution failed: Don\'t call me with 123' });
  expect(secondEvent.value.toolCalls?.[1].tool).toBe('tool_1');
  expect(secondEvent.value.toolCalls?.[1].arguments).toEqual({ value: 42 });
  expect(secondEvent.value.toolCalls?.[1].result).toEqual({ theAnswerToAnything: 42 });

  // Verify the iterator is complete (no more events)
  const lastEvent = await response.stream.next();
  expect(lastEvent.done).toBe(true);
  expect(lastEvent.value).toBeUndefined();
});


test('Unsuccesful response tool calls don\'t complete the query', async () => {
  const queryHandler = async (client: MCPWebClient, query: Query) => {
    // This call should not complete the query because the call will fail
    const callToolResult1 = await client.callTool('response_tool', { value: 123 });
    expect(callToolResult1.isError).toBe(true);
    expect(callToolResult1.content).toBeDefined();
    expect(callToolResult1.content.length).toBeGreaterThan(0);
    expect(callToolResult1.content[0].type).toBe('text');
    const callToolResult1Content = JSON.parse(callToolResult1.content[0].type === 'text' ? callToolResult1.content[0].text : '{}');
    expect(callToolResult1Content).toEqual({ error: 'Tool execution failed: Wrong answer to nothing' });

    // The query should stiull be active and accept other tool calls.
    const callToolResult2 = await client.callTool('tool', { number: 42 });
    expect(callToolResult2.content).toBeDefined();
    expect(callToolResult2.content.length).toBeGreaterThan(0);
    expect(callToolResult2.content[0].type).toBe('text');
    const callToolResult2Content = JSON.parse(callToolResult2.content[0].type === 'text' ? callToolResult2.content[0].text : '{}');
    expect(callToolResult2Content).toEqual({ double: 84 });

    // The response tool should succeed and complete the query.
    const callToolResult3 = await client.callTool('response_tool', { value: 42 });
    expect(callToolResult3.content).toBeDefined();
    expect(callToolResult3.content.length).toBeGreaterThan(0);
    expect(callToolResult3.content[0].type).toBe('text');
    const callToolResult3Content = JSON.parse(callToolResult3.content[0].type === 'text' ? callToolResult3.content[0].text : '{}');
    expect(callToolResult3Content).toEqual({ theAnswerToNothing: 42 });

    // The query should be completed already because the response tool succeeded.
    // Attempting to complete it again should throw an error.
    expect(client.complete('The answer to nothing is 123!!')).rejects.toThrow(QueryDoneErrorCode);
  };

  mockAgentServer = new MockAgentServer(mcpWebClientConfig, queryHandler);

  // Create MCPWeb with agentUrl pointing to mock agent
  mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  // Register discoverable tools
  mcpWeb.addTool({
    name: 'tool',
    description: 'Tool',
    handler: ({ number }: { number: number }) => ({ double: number * 2 }),
    inputSchema: z.object({ number: z.int() }),
    outputSchema: z.object({ double: z.int() })
  });

  const responseTool = mcpWeb.addTool({
    name: 'response_tool',
    description: 'Response tool',
    handler: ({ value }: { value: number }) => {
      if (value !== 42) throw new Error('Wrong answer to nothing');
      return { theAnswerToNothing: value };
    },
    inputSchema: z.object({ value: z.int() }),
    outputSchema: z.object({ theAnswerToNothing: z.int() })
  });

  // Connect and wait for authentication
  await mcpWeb.connect();

  const response = mcpWeb.query({
    prompt: 'Test prompt',
    responseTool,
  });

  // Get the first event (should be acceptance)
  const firstEvent = await response.stream.next();
  expect(firstEvent.value.type).toBe('query_accepted');

  // Get the second event (should be progress)
  const secondEvent = await response.stream.next();
  expect(secondEvent.value.type).toBe('query_complete');
  expect(secondEvent.value.message).toBeUndefined();
  expect(secondEvent.value.toolCalls).toBeDefined();
  expect(secondEvent.value.toolCalls?.length).toBe(3);
  expect(secondEvent.value.toolCalls?.[0].tool).toBe('response_tool');
  expect(secondEvent.value.toolCalls?.[0].arguments).toEqual({ value: 123 });
  expect(secondEvent.value.toolCalls?.[0].result).toEqual({ error: 'Tool execution failed: Wrong answer to nothing' });
  expect(secondEvent.value.toolCalls?.[1].tool).toBe('tool');
  expect(secondEvent.value.toolCalls?.[1].arguments).toEqual({ number: 42 });
  expect(secondEvent.value.toolCalls?.[1].result).toEqual({ double: 84 });
  expect(secondEvent.value.toolCalls?.[2].tool).toBe('response_tool');
  expect(secondEvent.value.toolCalls?.[2].arguments).toEqual({ value: 42 });
  expect(secondEvent.value.toolCalls?.[2].result).toEqual({ theAnswerToNothing: 42 });

  // Verify the iterator is complete (no more events)
  const lastEvent = await response.stream.next();
  expect(lastEvent.done).toBe(true);
  expect(lastEvent.value).toBeUndefined();
});

test('Query result promise resolves on successful completion', async () => {
  const queryHandler = async (client: MCPWebClient) => {
    await client.sendProgress('Processing...');
    const callToolResult = await client.callTool('tool_1');
    expect(callToolResult.isError).toBeUndefined();
    expect(callToolResult.content).toBeDefined();
    expect(callToolResult.content.length).toBeGreaterThan(0);
    expect(callToolResult.content[0].type).toBe('text');
    const data = callToolResult.content[0].type === 'text' ? callToolResult.content[0].text : '';
    await client.complete(`Tool returned: ${data}`);
  };

  mockAgentServer = new MockAgentServer(mcpWebClientConfig, queryHandler);

  // Create MCPWeb with agentUrl pointing to mock agent
  mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  // Register discoverable tools
  mcpWeb.addTool({
    name: 'tool_1',
    description: 'Tool 1',
    handler: () => ({ answer: 42 }),
    outputSchema: z.object({ answer: z.int() })
  });

  // Connect and wait for authentication
  await mcpWeb.connect();

  // Start the query
  const response = mcpWeb.query({ prompt: 'Test prompt' });

  // Await the final result
  const result = await response.result;

  // Verify it's a completion event
  expect(result.type).toBe('query_complete');
  if (result.type === 'query_complete') {
    expect(result.message).toBeDefined();
    expect(result.toolCalls).toBeDefined();
    expect(result.toolCalls.length).toBe(1);
    expect(result.toolCalls[0].tool).toBe('tool_1');
    expect(result.toolCalls[0].result).toEqual({ answer: 42 });
  }
});

test('Query result promise resolves on failure', async () => {
  const queryHandler = async (client: MCPWebClient) => {
    await client.sendProgress('Starting...');
    await client.fail('Something went wrong');
  };

  mockAgentServer = new MockAgentServer(mcpWebClientConfig, queryHandler);

  // Create MCPWeb with agentUrl pointing to mock agent
  mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  // Register discoverable tools
  mcpWeb.addTool({
    name: 'tool_1',
    description: 'Tool 1',
    handler: () => ({ value: 'test' }),
    outputSchema: z.object({ value: z.string() })
  });

  // Connect and wait for authentication
  await mcpWeb.connect();

  // Start the query
  const response = mcpWeb.query({ prompt: 'Test prompt' });

  // Await the final result
  const result = await response.result;

  // Verify it's a failure event
  expect(result.type).toBe('query_failure');
  if (result.type === 'query_failure') {
    expect(result.error).toBe('Something went wrong');
  }
});
