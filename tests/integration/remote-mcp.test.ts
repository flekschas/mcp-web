/**
 * Integration tests for Remote MCP (Streamable HTTP) support.
 *
 * These tests verify end-to-end functionality of the Remote MCP protocol,
 * including direct HTTP connections from MCP clients to the bridge without
 * going through the @mcp-web/client stdio wrapper.
 */
import { afterAll, beforeAll, expect, test, describe } from 'bun:test';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCPWeb } from '@mcp-web/core';
import type { MCPWebConfig } from '@mcp-web/types';
import { z } from 'zod';
import { killProcess } from '../helpers/kill-process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BRIDGE_PORT = 3051;

const mcpWebConfig = {
  name: 'test',
  description: 'Test Remote MCP',
  bridgeUrl: `localhost:${BRIDGE_PORT}`,
  persistAuthToken: false,
  autoConnect: false,
} satisfies MCPWebConfig;

let bridgeProcess: ReturnType<typeof spawn> | undefined;

// Helper to make MCP JSON-RPC request directly to bridge
async function mcpRequest(
  method: string,
  params?: Record<string, unknown>,
  headers?: Record<string, string>
): Promise<{ status: number; body: unknown; headers: Headers }> {
  const response = await fetch(`http://localhost:${BRIDGE_PORT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  const body = await response.json();
  return { status: response.status, body, headers: response.headers };
}

// Helper to initialize and get MCP session
async function initializeMcpSession(
  authToken: string
): Promise<{ sessionId: string; result: unknown }> {
  const { body, headers } = await mcpRequest(
    'initialize',
    { protocolVersion: '2024-11-05' },
    { Authorization: `Bearer ${authToken}` }
  );
  const sessionId = headers.get('mcp-session-id')!;
  return { sessionId, result: (body as { result: unknown }).result };
}

beforeAll(async () => {
  bridgeProcess = spawn(
    'bun',
    ['run', join(__dirname, '../helpers/start-bridge.ts')],
    {
      env: {
        ...process.env,
        PORT: BRIDGE_PORT.toString(),
      },
      stdio: ['ignore', 'ignore', 'pipe'],
      detached: false,
    }
  );

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

describe('Remote MCP Integration - Initialize', () => {
  test('initialize returns proper server info and capabilities', async () => {
    const authToken = 'test-auth-token';
    const { sessionId, result } = await initializeMcpSession(authToken);

    expect(sessionId).toBeTruthy();
    expect(result).toMatchObject({
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: { listChanged: true },
        resources: {},
        prompts: {},
      },
      serverInfo: {
        name: 'Test Bridge',
      },
    });
  });
});

describe('Remote MCP Integration - Tools', () => {
  test('tools/list returns tools registered via WebSocket', async () => {
    const authToken = 'test-tools-token';

    // Connect MCPWeb frontend client
    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
    });

    mcpWeb.addTool({
      name: 'greet',
      description: 'Greets a person',
      inputSchema: z.object({ name: z.string() }),
      outputSchema: z.object({ message: z.string() }),
      handler: async ({ name }) => ({ message: `Hello, ${name}!` }),
    });

    await mcpWeb.connect();

    // Wait for tool registration to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Initialize MCP session via HTTP
    const { sessionId } = await initializeMcpSession(authToken);

    // List tools via HTTP
    const { body } = await mcpRequest(
      'tools/list',
      {},
      {
        Authorization: `Bearer ${authToken}`,
        'Mcp-Session-Id': sessionId,
      }
    );

    const toolsResult = body as { result: { tools: Array<{ name: string }> } };
    expect(toolsResult.result.tools.length).toBeGreaterThanOrEqual(2);

    const toolNames = toolsResult.result.tools.map((t) => t.name);
    expect(toolNames).toContain('list_sessions');
    expect(toolNames).toContain('greet');

    mcpWeb.disconnect();
  });

  test('tools/call invokes tool and returns result', async () => {
    const authToken = 'test-call-token';

    // Connect MCPWeb frontend client
    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
    });

    mcpWeb.addTool({
      name: 'add_numbers',
      description: 'Adds two numbers',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.object({ sum: z.number() }),
      handler: async ({ a, b }) => ({ sum: a + b }),
    });

    await mcpWeb.connect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Initialize MCP session via HTTP
    const { sessionId } = await initializeMcpSession(authToken);

    // Call tool via HTTP
    const { body } = await mcpRequest(
      'tools/call',
      {
        name: 'add_numbers',
        arguments: { a: 5, b: 3 },
        _meta: { sessionId: mcpWeb.sessionId },
      },
      {
        Authorization: `Bearer ${authToken}`,
        'Mcp-Session-Id': sessionId,
      }
    );

    const callResult = body as {
      result: {
        content: Array<{ type: string; text: string }>;
      };
    };
    expect(callResult.result.content).toHaveLength(1);
    expect(callResult.result.content[0].type).toBe('text');
    expect(JSON.parse(callResult.result.content[0].text)).toEqual({ sum: 8 });

    mcpWeb.disconnect();
  });
});

describe('Remote MCP Integration - Resources', () => {
  test('resources/list returns resources registered via WebSocket', async () => {
    const authToken = 'test-resources-token';

    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
    });

    mcpWeb.addResource({
      uri: 'app://config',
      name: 'App Configuration',
      description: 'Current application configuration',
      mimeType: 'application/json',
      handler: async () => JSON.stringify({ theme: 'dark', lang: 'en' }),
    });

    await mcpWeb.connect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const { sessionId } = await initializeMcpSession(authToken);

    const { body } = await mcpRequest(
      'resources/list',
      {},
      {
        Authorization: `Bearer ${authToken}`,
        'Mcp-Session-Id': sessionId,
      }
    );

    const resourcesResult = body as {
      result: { resources: Array<{ uri: string; name: string }> };
    };
    expect(resourcesResult.result.resources.length).toBeGreaterThanOrEqual(2);

    const resourceUris = resourcesResult.result.resources.map((r) => r.uri);
    expect(resourceUris).toContain('sessions://list');
    expect(resourceUris).toContain('app://config');

    mcpWeb.disconnect();
  });

  test('resources/read returns resource content', async () => {
    const authToken = 'test-read-resource-token';

    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
    });

    const configData = { theme: 'dark', lang: 'en' };

    mcpWeb.addResource({
      uri: 'app://settings',
      name: 'App Settings',
      mimeType: 'application/json',
      handler: async () => JSON.stringify(configData),
    });

    await mcpWeb.connect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const { sessionId } = await initializeMcpSession(authToken);

    const { body } = await mcpRequest(
      'resources/read',
      { uri: 'app://settings' },
      {
        Authorization: `Bearer ${authToken}`,
        'Mcp-Session-Id': sessionId,
      }
    );

    const readResult = body as {
      result: { contents: Array<{ uri: string; text: string; mimeType: string }> };
    };

    expect(readResult.result.contents).toHaveLength(1);
    expect(readResult.result.contents[0].uri).toBe('app://settings');
    expect(readResult.result.contents[0].mimeType).toBe('application/json');
    expect(JSON.parse(readResult.result.contents[0].text)).toEqual(configData);

    mcpWeb.disconnect();
  });
});

describe('Remote MCP Integration - Multi-Session', () => {
  test('multiple sessions can connect and each sees their own tools', async () => {
    const authToken1 = 'multi-session-token-1';
    const authToken2 = 'multi-session-token-2';

    // Connect first frontend
    const mcpWeb1 = new MCPWeb({
      ...mcpWebConfig,
      authToken: authToken1,
    });

    mcpWeb1.addTool({
      name: 'tool_from_app1',
      description: 'Tool from app 1',
      inputSchema: z.object({}),
      outputSchema: z.object({ app: z.number() }),
      handler: async () => ({ app: 1 }),
    });

    await mcpWeb1.connect();

    // Connect second frontend
    const mcpWeb2 = new MCPWeb({
      ...mcpWebConfig,
      authToken: authToken2,
    });

    mcpWeb2.addTool({
      name: 'tool_from_app2',
      description: 'Tool from app 2',
      inputSchema: z.object({}),
      outputSchema: z.object({ app: z.number() }),
      handler: async () => ({ app: 2 }),
    });

    await mcpWeb2.connect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Initialize MCP sessions for each
    const session1 = await initializeMcpSession(authToken1);
    const session2 = await initializeMcpSession(authToken2);

    // List tools for each session - they should see different tools
    const tools1Response = await mcpRequest(
      'tools/list',
      {},
      {
        Authorization: `Bearer ${authToken1}`,
        'Mcp-Session-Id': session1.sessionId,
      }
    );
    const tools1 = tools1Response.body as { result: { tools: Array<{ name: string }> } };
    const tool1Names = tools1.result.tools.map((t) => t.name);
    expect(tool1Names).toContain('tool_from_app1');
    expect(tool1Names).not.toContain('tool_from_app2');

    const tools2Response = await mcpRequest(
      'tools/list',
      {},
      {
        Authorization: `Bearer ${authToken2}`,
        'Mcp-Session-Id': session2.sessionId,
      }
    );
    const tools2 = tools2Response.body as { result: { tools: Array<{ name: string }> } };
    const tool2Names = tools2.result.tools.map((t) => t.name);
    expect(tool2Names).toContain('tool_from_app2');
    expect(tool2Names).not.toContain('tool_from_app1');

    mcpWeb1.disconnect();
    mcpWeb2.disconnect();
  });
});

describe('Remote MCP Integration - SSE Notifications', () => {
  test('SSE stream receives tools/list_changed when tool is registered', async () => {
    const authToken = 'sse-notify-token';

    // Initialize MCP session first
    const { sessionId } = await initializeMcpSession(authToken);

    // Open SSE stream
    const receivedEvents: string[] = [];
    const controller = new AbortController();

    const ssePromise = (async () => {
      const response = await fetch(`http://localhost:${BRIDGE_PORT}`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Mcp-Session-Id': sessionId,
        },
        signal: controller.signal,
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          receivedEvents.push(decoder.decode(value));
        }
      } catch {
        // Aborted
      }
    })();

    // Wait for SSE to establish
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Now connect a frontend with the same auth token
    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
    });

    await mcpWeb.connect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Register a tool - should trigger notification
    mcpWeb.addTool({
      name: 'dynamic_tool',
      description: 'A dynamically added tool',
      inputSchema: z.object({}),
      outputSchema: z.object({ dynamic: z.boolean() }),
      handler: async () => ({ dynamic: true }),
    });

    // Wait for notification
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Clean up
    controller.abort();
    await ssePromise.catch(() => {});
    mcpWeb.disconnect();

    // Check we received the notification
    const fullText = receivedEvents.join('');
    expect(fullText).toContain('notifications/tools/list_changed');
  });

  test('SSE stream receives notification when frontend disconnects', async () => {
    const authToken = 'sse-disconnect-token';

    // Connect frontend first
    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
    });

    mcpWeb.addTool({
      name: 'will_disappear',
      description: 'This tool will disappear',
      inputSchema: z.object({}),
      outputSchema: z.object({ gone: z.boolean() }),
      handler: async () => ({ gone: false }),
    });

    await mcpWeb.connect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Initialize MCP session
    const { sessionId } = await initializeMcpSession(authToken);

    // Open SSE stream
    const receivedEvents: string[] = [];
    const controller = new AbortController();

    const ssePromise = (async () => {
      const response = await fetch(`http://localhost:${BRIDGE_PORT}`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Mcp-Session-Id': sessionId,
        },
        signal: controller.signal,
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          receivedEvents.push(decoder.decode(value));
        }
      } catch {
        // Aborted
      }
    })();

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Disconnect the frontend - should trigger notification
    mcpWeb.disconnect();

    await new Promise((resolve) => setTimeout(resolve, 200));

    controller.abort();
    await ssePromise.catch(() => {});

    const fullText = receivedEvents.join('');
    expect(fullText).toContain('notifications/tools/list_changed');
  });
});

describe('Remote MCP Integration - Session Lifecycle', () => {
  test('closing MCP session via DELETE cleans up properly', async () => {
    const authToken = 'session-lifecycle-token';

    // Initialize session
    const { sessionId } = await initializeMcpSession(authToken);
    expect(sessionId).toBeTruthy();

    // Delete session
    const deleteResponse = await fetch(`http://localhost:${BRIDGE_PORT}`, {
      method: 'DELETE',
      headers: {
        'Mcp-Session-Id': sessionId,
      },
    });

    expect(deleteResponse.status).toBe(200);

    // Trying to use deleted session should fail (session not found)
    const sseResponse = await fetch(`http://localhost:${BRIDGE_PORT}`, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        'Mcp-Session-Id': sessionId,
      },
    });

    // Read the error from SSE
    const reader = sseResponse.body!.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain('MCP session not found');
    reader.cancel();
  });
});
