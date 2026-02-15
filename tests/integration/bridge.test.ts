import { afterAll, beforeAll, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCPWebClient, type MCPWebClientConfig, type TextContent } from '@mcp-web/client';
import { MCPWeb } from '@mcp-web/core';
import {
  type MCPWebConfig,
  SessionNotSpecifiedErrorCode,
  ToolNotFoundErrorCode,
} from '@mcp-web/types';
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
  bridgeUrl: `localhost:${BRIDGE_PORT}`,
  persistAuthToken: false,
  autoConnect: false,
} satisfies MCPWebConfig;

const mcpWebClientConfig: MCPWebClientConfig = {
  serverUrl: `http://${mcpWebConfig.bridgeUrl}`,
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

test('MCPWebBridge accepts multiple sessions', async () => {
  const mcpWeb1 = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  await mcpWeb1.connect();

  const mcpWeb2 = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  await mcpWeb2.connect();

  mcpWeb2.disconnect();

  expect(mcpWeb1.connected).toBe(true);
  expect(mcpWeb2.connected).toBe(false);

  mcpWeb1.disconnect();
});

test('Tools from differently authenticated clients are isolated', async () => {
  const mcpWeb1AuthToken = 'mcpWeb1AuthToken';
  const mcpWeb1 = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
    authToken: mcpWeb1AuthToken,
  });

  mcpWeb1.addTool({
    name: 'tool1',
    description: 'Tool 1',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ result: z.string() }),
    handler: async ({ name }) => ({ result: `Hello, ${name}!` }),
  });

  await mcpWeb1.connect();

  const mcpWeb2AuthToken = 'mcpWeb2AuthToken';
  const mcpWeb2 = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
    authToken: mcpWeb2AuthToken,
  });

  mcpWeb2.addTool({
    name: 'tool2',
    description: 'Tool 2',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ result: z.string() }),
    handler: async ({ name }) => ({ result: `Hallo, ${name}!` }),
  });

  await mcpWeb2.connect();

  const client1 = new MCPWebClient({
    ...mcpWebClientConfig,
    authToken: mcpWeb1AuthToken,
  });
  const client2 = new MCPWebClient({
    ...mcpWebClientConfig,
    authToken: mcpWeb2AuthToken,
  });

  const tools1 = await client1.listTools();
  expect(tools1.tools.length).toBe(2);
  expect(tools1.tools[0].name).toBe('list_sessions');
  expect(tools1.tools[1].name).toBe('tool1');

  const tools2 = await client2.listTools();
  expect(tools2.tools.length).toBe(2);
  expect(tools2.tools[0].name).toBe('list_sessions');
  expect(tools2.tools[1].name).toBe('tool2');

  const result1 = await client1.callTool('tool1', { name: 'John' });
  expect(result1).toEqual({
    content: [{
      type: 'text',
      text: JSON.stringify({ result: 'Hello, John!' }, null, 2)
    }],
  });

  const result2 = await client2.callTool('tool2', { name: 'Jane' });
  expect(result2).toEqual({
    content: [{
      type: 'text',
      text: JSON.stringify({ result: 'Hallo, Jane!' }, null, 2)
    }],
  });

  // Calling tools from a different session should fail
  const result3 = await client1.callTool('tool2', { name: 'John' });
  expect(result3).toEqual({
    content: [{
      type: 'text',
      text: JSON.stringify({ error: ToolNotFoundErrorCode, available_tools: ['tool1'] }, null, 2)
    }],
    isError: true,
  });

  const result4 = await client2.callTool('tool1', { name: 'Jane' });
  expect(result4).toEqual({
    content: [{
      type: 'text',
      text: JSON.stringify({ error: ToolNotFoundErrorCode, available_tools: ['tool2'] }, null, 2)
    }],
    isError: true,
  });

  mcpWeb1.disconnect();
  mcpWeb2.disconnect();
});

test('Tools from different sessions are isolated', async () => {
  const authToken = 'multi-session-tools-test';
  const mcpWeb1 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    autoConnect: false,
  });

  mcpWeb1.addTool({
    name: 'tool1',
    description: 'Tool 1',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ result: z.string() }),
    handler: async ({ name }) => ({ result: `Hello, ${name}!` }),
  });

  await mcpWeb1.connect();

  const mcpWeb2 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    autoConnect: false,
  });

  mcpWeb2.addTool({
    name: 'tool2',
    description: 'Tool 2',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ result: z.string() }),
    handler: async ({ name }) => ({ result: `Hallo, ${name}!` }),
  });

  await mcpWeb2.connect();

  const client = new MCPWebClient({
    ...mcpWebClientConfig,
    authToken,
  });

  // Without sessionId: should get all deduplicated tools with session_id required
  const toolListResult = await client.listTools();

  // Should get list_sessions + tool1 + tool2 (deduplicated across sessions)
  expect(toolListResult.tools).toHaveLength(3);
  expect(toolListResult.tools[0].name).toBe('list_sessions');

  const toolNames = toolListResult.tools.map(t => t.name);
  expect(toolNames).toContain('tool1');
  expect(toolNames).toContain('tool2');

  // Each tool should have session_id as a required parameter
  const tool1 = toolListResult.tools.find(t => t.name === 'tool1')!;
  expect(tool1.inputSchema.properties).toHaveProperty('session_id');
  expect(tool1.inputSchema.required).toContain('session_id');

  const tool2 = toolListResult.tools.find(t => t.name === 'tool2')!;
  expect(tool2.inputSchema.properties).toHaveProperty('session_id');
  expect(tool2.inputSchema.required).toContain('session_id');

  // Should NOT be an error result anymore
  expect(toolListResult.isError).toBeUndefined();

  // Should have available_sessions in _meta
  expect(toolListResult._meta).toBeDefined();
  const available_sessions = (toolListResult._meta as Record<string, unknown>).available_sessions as Array<Record<string, unknown>>;
  expect(available_sessions).toHaveLength(2);
  expect(available_sessions[0].session_id).toBe(mcpWeb1.sessionId);
  expect(available_sessions[1].session_id).toBe(mcpWeb2.sessionId);

  // With specific sessionId: should still get session-specific tools
  const session1Tools = await client.listTools(mcpWeb1.sessionId);
  expect(session1Tools.tools.length).toBe(2);
  expect(session1Tools.tools[0].name).toBe('list_sessions');
  expect(session1Tools.tools[1].name).toBe('tool1');

  const session2Tools = await client.listTools(mcpWeb2.sessionId);
  expect(session2Tools.tools.length).toBe(2);
  expect(session2Tools.tools[0].name).toBe('list_sessions');
  expect(session2Tools.tools[1].name).toBe('tool2');

  // Calling tools with explicit session ID should work
  const tools1Result = await client.callTool('tool1', { name: 'John' }, mcpWeb1.sessionId);
  expect(tools1Result).toEqual({
    content: [{
      type: 'text',
      text: JSON.stringify({ result: 'Hello, John!' }, null, 2)
    }],
  });
  const tools2Result = await client.callTool('tool2', { name: 'Jane' }, mcpWeb2.sessionId);
  expect(tools2Result).toEqual({
    content: [{
      type: 'text',
      text: JSON.stringify({ result: 'Hallo, Jane!' }, null, 2)
    }],
  });

  // Calling tools with session_id in the arguments should also work
  const tools1ViaArgs = await client.callTool('tool1', { name: 'John', session_id: mcpWeb1.sessionId });
  expect(tools1ViaArgs).toEqual({
    content: [{
      type: 'text',
      text: JSON.stringify({ result: 'Hello, John!' }, null, 2)
    }],
  });

  // Calling tools without a session ID should fail
  const callToolResult1 = await client.callTool('tool1', { name: 'John' });
  expect(callToolResult1.isError).toEqual(true);
  const callToolResult1Content = JSON.parse((callToolResult1.content[0] as TextContent).text);
  expect(callToolResult1Content.error).toEqual(SessionNotSpecifiedErrorCode);
  expect(callToolResult1Content.available_sessions.length).toEqual(2);

  const callToolResult2 = await client.callTool('tool2', { name: 'Jane' });
  expect(callToolResult2.isError).toEqual(true);
  const callToolResult2Content = JSON.parse((callToolResult2.content[0] as TextContent).text);
  expect(callToolResult2Content.error).toEqual(SessionNotSpecifiedErrorCode);
  expect(callToolResult2Content.available_sessions.length).toEqual(2);

  // Calling tools with an invalid session ID should fail with error result
  // Since there are multiple sessions, error will be SessionNotSpecified
  const invalidSessionResult1 = await client.callTool('tool1', { name: 'John' }, 'invalid-session-id');
  expect(invalidSessionResult1.isError).toBe(true);
  expect((invalidSessionResult1.content[0] as TextContent).text).toContain(SessionNotSpecifiedErrorCode);

  const invalidSessionResult2 = await client.callTool('tool2', { name: 'Jane' }, 'invalid-session-id');
  expect(invalidSessionResult2.isError).toBe(true);
  expect((invalidSessionResult2.content[0] as TextContent).text).toContain(SessionNotSpecifiedErrorCode);

  // Calling tools with a valid but wrong session ID should fail with ToolNotFound
  // because the session doesn't have the requested tool
  const wrongSessionResult1 = await client.callTool('tool1', { name: 'John' }, mcpWeb2.sessionId);
  expect(wrongSessionResult1.isError).toBe(true);
  expect((wrongSessionResult1.content[0] as TextContent).text).toContain(ToolNotFoundErrorCode);

  const wrongSessionResult2 = await client.callTool('tool2', { name: 'Jane' }, mcpWeb1.sessionId);
  expect(wrongSessionResult2.isError).toBe(true);
  expect((wrongSessionResult2.content[0] as TextContent).text).toContain(ToolNotFoundErrorCode);

  mcpWeb1.disconnect();
  mcpWeb2.disconnect();
});

test('Rejects tools with same name but different schemas across sessions', async () => {
  const authToken = 'authToken-schema-conflict';
  const mcpWeb1 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    autoConnect: false,
  });

  mcpWeb1.addTool({
    name: 'shared_tool',
    description: 'Tool with schema A',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ result: z.string() }),
    handler: async ({ name }) => ({ result: name }),
  });

  await mcpWeb1.connect();

  const mcpWeb2 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    autoConnect: false,
  });

  // Register a tool with the same name but DIFFERENT schema
  mcpWeb2.addTool({
    name: 'shared_tool',
    description: 'Tool with schema B',
    inputSchema: z.object({ count: z.number() }),
    outputSchema: z.object({ result: z.number() }),
    handler: async ({ count }) => ({ result: count }),
  });

  await mcpWeb2.connect();

  // Give the bridge a moment to process the registration rejection
  await new Promise((resolve) => setTimeout(resolve, 200));

  const client = new MCPWebClient({
    ...mcpWebClientConfig,
    authToken,
  });

  // Session 1 should have shared_tool
  const session1Tools = await client.listTools(mcpWeb1.sessionId);
  const session1ToolNames = session1Tools.tools.map((t) => t.name);
  expect(session1ToolNames).toContain('shared_tool');

  // Session 2 should NOT have shared_tool (registration was rejected)
  const session2Tools = await client.listTools(mcpWeb2.sessionId);
  const session2ToolNames = session2Tools.tools.map((t) => t.name);
  expect(session2ToolNames).not.toContain('shared_tool');

  mcpWeb1.disconnect();
  mcpWeb2.disconnect();
});

test('onRegistrationError callback is called on schema conflict', async () => {
  const authToken = 'authToken-on-error-callback';
  const mcpWeb1 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    autoConnect: false,
  });

  mcpWeb1.addTool({
    name: 'conflicting_tool',
    description: 'Tool with schema A',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ result: z.string() }),
    handler: async ({ name }) => ({ result: name }),
  });

  await mcpWeb1.connect();

  const mcpWeb2 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    autoConnect: false,
  });

  // Track the error via the callback
  let registrationError: { toolName: string; code: string; message: string } | null = null;

  // Register a tool with the same name but DIFFERENT schema, with onRegistrationError
  mcpWeb2.addTool(
    {
      name: 'conflicting_tool',
      description: 'Tool with schema B',
      inputSchema: z.object({ count: z.number() }),
      outputSchema: z.object({ result: z.number() }),
      handler: async ({ count }) => ({ result: count }),
    },
    {
      onRegistrationError: (error) => {
        registrationError = error;
      },
    }
  );

  await mcpWeb2.connect();

  // Wait for the bridge to process the registration rejection
  await new Promise((resolve) => setTimeout(resolve, 300));

  // The callback should have been called with error details
  expect(registrationError).not.toBeNull();
  expect(registrationError!.toolName).toBe('conflicting_tool');
  expect(registrationError!.code).toBe('ToolSchemaConflict');
  expect(registrationError!.message).toContain('different schema');

  // The tool should have been removed from mcpWeb2
  expect(mcpWeb2.tools.has('conflicting_tool')).toBe(false);

  mcpWeb1.disconnect();
  mcpWeb2.disconnect();
});

test('Allows tools with same name and identical schemas across sessions', async () => {
  const authToken = 'authToken-same-schema';
  const mcpWeb1 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    autoConnect: false,
  });

  mcpWeb1.addTool({
    name: 'shared_tool',
    description: 'Shared tool',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ result: z.string() }),
    handler: async ({ name }) => ({ result: `Hello, ${name}!` }),
  });

  await mcpWeb1.connect();

  const mcpWeb2 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    autoConnect: false,
  });

  // Register a tool with the same name AND same schema
  mcpWeb2.addTool({
    name: 'shared_tool',
    description: 'Shared tool',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ result: z.string() }),
    handler: async ({ name }) => ({ result: `Hallo, ${name}!` }),
  });

  await mcpWeb2.connect();

  const client = new MCPWebClient({
    ...mcpWebClientConfig,
    authToken,
  });

  // Both sessions should have shared_tool
  const session1Tools = await client.listTools(mcpWeb1.sessionId);
  expect(session1Tools.tools.map((t) => t.name)).toContain('shared_tool');

  const session2Tools = await client.listTools(mcpWeb2.sessionId);
  expect(session2Tools.tools.map((t) => t.name)).toContain('shared_tool');

  // tools/list without sessionId should deduplicate — only one shared_tool
  const allTools = await client.listTools();
  const sharedTools = allTools.tools.filter((t) => t.name === 'shared_tool');
  expect(sharedTools).toHaveLength(1);

  // Calling with session_id should route to the correct session
  const result1 = await client.callTool('shared_tool', { name: 'World' }, mcpWeb1.sessionId);
  expect(result1).toEqual({
    content: [{
      type: 'text',
      text: JSON.stringify({ result: 'Hello, World!' }, null, 2)
    }],
  });

  const result2 = await client.callTool('shared_tool', { name: 'World' }, mcpWeb2.sessionId);
  expect(result2).toEqual({
    content: [{
      type: 'text',
      text: JSON.stringify({ result: 'Hallo, World!' }, null, 2)
    }],
  });

  mcpWeb1.disconnect();
  mcpWeb2.disconnect();
});
