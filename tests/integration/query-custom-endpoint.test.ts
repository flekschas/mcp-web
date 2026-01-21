import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCPWebClient, type MCPWebClientConfig } from '@mcp-web/client';
import { MCPWeb } from '@mcp-web/core';
import type {
  MCPWebConfig,
  Query,
} from '@mcp-web/types';
import { ListPromptsResultSchema, ListResourcesResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { killProcess } from '../helpers/kill-process';
import { MockAgentServer } from '../helpers/mock-agent';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// Single port for both WebSocket and HTTP (new architecture)
const BRIDGE_PORT = 3001;
const customEndpoint = '/api/v1/agent/query';

const mcpWebConfig = {
  name: 'test',
  description: 'Test ',
  host: 'localhost',
  wsPort: BRIDGE_PORT,
  mcpPort: BRIDGE_PORT,
  persistAuthToken: false,
  autoConnect: true,
  agentUrl: `http://localhost:3003${customEndpoint}`,
} satisfies MCPWebConfig;

const mcpWebClientConfig: MCPWebClientConfig = {
  serverUrl: `http://${mcpWebConfig.host}:${BRIDGE_PORT}`,
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
      PORT: BRIDGE_PORT.toString(),
      AGENT_URL: mcpWebConfig.agentUrl, // Full URL with custom path
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

  mockAgentServer = new MockAgentServer(mcpWebClientConfig, queryHandler, 3003, customEndpoint);

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
