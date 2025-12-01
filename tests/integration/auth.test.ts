import { afterAll, beforeAll, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCPWebClient, type MCPWebClientConfig } from '@mcp-web/client';
import {
  type MCPWebConfig,
  MissingAuthenticationErrorCode,
  type Query,
} from '@mcp-web/types';
import { MCPWeb } from '@mcp-web/web';
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
  autoConnect: false,
} satisfies MCPWebConfig;

const mcpWebClientConfig: MCPWebClientConfig = {
  serverUrl: `http://${mcpWebConfig.host}:${mcpWebConfig.mcpPort}`,
};

let bridgeProcess: ReturnType<typeof spawn> | undefined;

// Start bridge as separate process using Bun
const spawnBridge = () => spawn(
  'bun',
  ['run', join(__dirname, '../helpers/start-bridge.ts')],
  {
    env: {
      ...process.env,
      WS_PORT: mcpWebConfig.wsPort.toString(),
      MCP_PORT: mcpWebConfig.mcpPort.toString(),
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

test('Bridge rejects unauthorized MCP requests', async () => {
  // Create a root client without authToken
  const client = new MCPWebClient(mcpWebClientConfig);

  expect(client.listTools()).rejects.toThrow(MissingAuthenticationErrorCode);
  expect(client.callTool('tool', {})).rejects.toThrow(MissingAuthenticationErrorCode);
  expect(client.listResources()).rejects.toThrow(MissingAuthenticationErrorCode);
  expect(client.listPrompts()).rejects.toThrow(MissingAuthenticationErrorCode);
});

test('Bridge accepts authToken-authorized MCP requests', async () => {
  const authToken = 'authToken';
  const mcpWeb = new MCPWeb({ ...mcpWebConfig, authToken });

  mcpWeb.addTool({
    name: 'tool-auth-1',
    description: 'Tool',
    handler: () => ({ result: 'Hello, world!' }),
  });

  await mcpWeb.connect();

  const client = new MCPWebClient({
    ...mcpWebClientConfig,
    authToken,
  });

  const tools = await client.listTools();
  expect(tools.tools.length).toBe(2);
  expect(tools.tools[0].name).toBe('list_sessions');
  expect(tools.tools[1].name).toBe('tool-auth-1');

  const resources = await client.listResources();
  expect(resources.resources.length).toBe(1);
  expect(resources.resources[0].name).toBe('sessions');

  const prompts = await client.listPrompts();
  expect(prompts.prompts.length).toBe(0);

  const result = await client.callTool('tool-auth-1');
  expect(result).toEqual({
    content: [{
      type: 'text',
      text: JSON.stringify({ result: 'Hello, world!' }, null, 2)
    }],
  });
});

test('Bridge accepts query-contextualized MCP requests', async () => {
  const queryHandler = async (client: MCPWebClient, query: Query) => {
    const tools = await client.listTools();
    expect(tools.tools.length).toBe(2);
    expect(tools.tools[0].name).toBe('list_sessions');
    expect(tools.tools[1].name).toBe('tool');

    const resources = await client.listResources();
    expect(resources.resources.length).toBe(1);
    expect(resources.resources[0].name).toBe('sessions');

    const prompts = await client.listPrompts();
    expect(prompts.prompts.length).toBe(0);

    const result = await client.callTool('tool', { query: query.prompt });
    expect(result).toEqual({
      content: [{
        type: 'text',
        text: JSON.stringify({ prompt: `Prompt: ${query.prompt}` }, null, 2)
      }],
    });
  };

  const mockAgentServer = new MockAgentServer(mcpWebClientConfig, queryHandler);

  const mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    agentUrl: 'http://localhost:3003',
  });

  mcpWeb.addTool({
    name: 'tool',
    description: 'Tool',
    handler: ({ query }) => ({ prompt: `Prompt: ${query}` }),
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.object({ prompt: z.string() }),
  });

  await mcpWeb.connect();

  mcpWeb.query({ prompt: 'Test query prompt' });

  await mockAgentServer.stop();
});
