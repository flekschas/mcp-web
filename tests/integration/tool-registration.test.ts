import { afterAll, beforeAll, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCPWebClient, type MCPWebClientConfig } from '@mcp-web/client';
import { MCPWeb } from '@mcp-web/core';
import type { MCPWebConfig } from '@mcp-web/types';
import { z } from 'zod';
import { killProcess } from '../helpers/kill-process';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Single port for both WebSocket and HTTP (new architecture)
const BRIDGE_PORT = 3001;

const mcpWebConfig = {
  name: 'test',
  description: 'Test ',
  host: 'localhost',
  wsPort: BRIDGE_PORT,
  mcpPort: BRIDGE_PORT,
  persistAuthToken: false,
  autoConnect: false,
} satisfies MCPWebConfig;

const mcpWebClientConfig: MCPWebClientConfig = {
  serverUrl: `http://${mcpWebConfig.host}:${BRIDGE_PORT}`,
};

let bridgeProcess: ReturnType<typeof spawn> | undefined;

// Start bridge as separate process using Bun
const spawnBridge = () => spawn(
  'bun',
  ['run', join(__dirname, '../helpers/start-bridge.ts')],
  {
    env: {
      ...process.env,
      PORT: BRIDGE_PORT.toString(),
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

test('Tools registered before connection are available after connecting', async () => {
  const authToken = 'before-connect-token';
  const mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    autoConnect: false,
  });

  // Register tools BEFORE connecting
  mcpWeb.addTool({
    name: 'tool_before_connect_1',
    description: 'First tool registered before connection',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ greeting: z.string() }),
    handler: ({ name }: { name: string }) => ({ greeting: `Hello, ${name}!` }),
  });

  mcpWeb.addTool({
    name: 'tool_before_connect_2',
    description: 'Second tool registered before connection',
    inputSchema: z.object({ value: z.number() }),
    outputSchema: z.object({ doubled: z.number() }),
    handler: ({ value }: { value: number }) => ({ doubled: value * 2 }),
  });

  // Now connect
  await mcpWeb.connect();

  // Verify tools are available via client
  const client = new MCPWebClient({
    ...mcpWebClientConfig,
    authToken,
  });

  const tools = await client.listTools();
  expect(tools.tools.length).toBe(3); // list_sessions + 2 custom tools
  expect(tools.tools[0].name).toBe('list_sessions');
  expect(tools.tools[1].name).toBe('tool_before_connect_1');
  expect(tools.tools[2].name).toBe('tool_before_connect_2');

  // Verify tools work correctly
  const result1 = await client.callTool('tool_before_connect_1', { name: 'Alice' });
  expect(result1).toEqual({
    content: [{
      type: 'text',
      text: JSON.stringify({ greeting: 'Hello, Alice!' }, null, 2)
    }],
  });

  const result2 = await client.callTool('tool_before_connect_2', { value: 21 });
  expect(result2).toEqual({
    content: [{
      type: 'text',
      text: JSON.stringify({ doubled: 42 }, null, 2)
    }],
  });

  mcpWeb.disconnect();
});

test('Tools registered after connection are immediately available', async () => {
  const authToken = 'after-connect-token';
  const mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    autoConnect: false,
  });

  // Connect first
  await mcpWeb.connect();

  const client = new MCPWebClient({
    ...mcpWebClientConfig,
    authToken,
  });

  // Initially only list_sessions should be available
  const toolsBefore = await client.listTools();
  expect(toolsBefore.tools.length).toBe(1);
  expect(toolsBefore.tools[0].name).toBe('list_sessions');

  // Now register tools AFTER connection
  mcpWeb.addTool({
    name: 'tool_after_connect',
    description: 'Tool registered after connection',
    inputSchema: z.object({ text: z.string() }),
    outputSchema: z.object({ upper: z.string() }),
    handler: ({ text }: { text: string }) => ({ upper: text.toUpperCase() }),
  });

  // Small delay to ensure registration message is processed
  await new Promise(resolve => setTimeout(resolve, 100));

  // Verify tool is now available
  const toolsAfter = await client.listTools();
  expect(toolsAfter.tools.length).toBe(2);
  expect(toolsAfter.tools[0].name).toBe('list_sessions');
  expect(toolsAfter.tools[1].name).toBe('tool_after_connect');

  // Verify tool works correctly
  const result = await client.callTool('tool_after_connect', { text: 'hello' });
  expect(result).toEqual({
    content: [{
      type: 'text',
      text: JSON.stringify({ upper: 'HELLO' }, null, 2)
    }],
  });

  mcpWeb.disconnect();
});

test('Tools are removed after mcpWeb instance disconnects', async () => {
  const authToken = 'disconnect-cleanup-token';
  const mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    autoConnect: false,
  });

  mcpWeb.addTool({
    name: 'temporary_tool',
    description: 'This tool should disappear after disconnect',
    inputSchema: z.object({ input: z.string() }),
    outputSchema: z.object({ output: z.string() }),
    handler: ({ input }: { input: string }) => ({ output: `Processed: ${input}` }),
  });

  await mcpWeb.connect();

  const client = new MCPWebClient({
    ...mcpWebClientConfig,
    authToken,
  });

  // Verify tool is available
  const toolsBefore = await client.listTools();
  expect(toolsBefore.tools.length).toBe(2);
  expect(toolsBefore.tools[1].name).toBe('temporary_tool');

  // Verify tool works
  const result = await client.callTool('temporary_tool', { input: 'test' });
  expect(result).toEqual({
    content: [{
      type: 'text',
      text: JSON.stringify({ output: 'Processed: test' }, null, 2)
    }],
  });

  // Now disconnect
  mcpWeb.disconnect();

  // Small delay to ensure disconnect is processed
  await new Promise(resolve => setTimeout(resolve, 100));

  // Verify tools are no longer available
  // The bridge should reject requests since session is disconnected
  expect(client.listTools()).rejects.toThrow();
});

test('Mixed registration order - tools are all available', async () => {
  const authToken = 'mixed-registration-token';
  const mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    autoConnect: false,
  });

  // Register some tools before connection
  mcpWeb.addTool({
    name: 'before_1',
    description: 'Tool 1 before connection',
    handler: () => ({ result: 'before_1' }),
  });

  mcpWeb.addTool({
    name: 'before_2',
    description: 'Tool 2 before connection',
    handler: () => ({ result: 'before_2' }),
  });

  // Connect
  await mcpWeb.connect();

  // Register more tools after connection
  mcpWeb.addTool({
    name: 'after_1',
    description: 'Tool 1 after connection',
    handler: () => ({ result: 'after_1' }),
  });

  mcpWeb.addTool({
    name: 'after_2',
    description: 'Tool 2 after connection',
    handler: () => ({ result: 'after_2' }),
  });

  // Small delay to ensure all registrations are processed
  await new Promise(resolve => setTimeout(resolve, 100));

  const client = new MCPWebClient({
    ...mcpWebClientConfig,
    authToken,
  });

  // Verify all tools are available
  const tools = await client.listTools();
  expect(tools.tools.length).toBe(5); // list_sessions + 4 custom tools
  expect(tools.tools.map(t => t.name).sort()).toEqual([
    'after_1',
    'after_2',
    'before_1',
    'before_2',
    'list_sessions',
  ].sort());

  // Verify each tool works
  for (const toolName of ['before_1', 'before_2', 'after_1', 'after_2']) {
    const result = await client.callTool(toolName);
    expect(result).toEqual({
      content: [{
        type: 'text',
        text: JSON.stringify({ result: toolName }, null, 2)
      }],
    });
  }

  mcpWeb.disconnect();
});
