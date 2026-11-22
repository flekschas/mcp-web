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
import { createCodeMode, FunctionExecutor } from '@mcp-web/tools/code';
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
        resources: { listChanged: true },
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

describe('Remote MCP Integration - Tool and Resource Removal', () => {
  type List = 'tools' | 'resources';

  const countListChanged = (text: string, list: List) =>
    text.split(`notifications/${list}/list_changed`).length - 1;

  /**
   * Opens the SSE stream of an MCP session and collects what arrives. The
   * bridge sends the headers once the stream is set up, so notifications sent
   * after this resolves are not missed.
   */
  async function openSSE(sessionId: string) {
    const controller = new AbortController();
    const response = await fetch(`http://localhost:${BRIDGE_PORT}`, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        'Mcp-Session-Id': sessionId,
      },
      signal: controller.signal,
    });
    expect(response.status).toBe(200);

    let text = '';
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    const reading = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value);
      }
    })().catch((error) => {
      if (!controller.signal.aborted) throw error;
    });

    return {
      count: (list: List) => countListChanged(text, list),
      async waitFor(list: List, count: number, timeoutMs = 2000) {
        const deadline = Date.now() + timeoutMs;
        while (countListChanged(text, list) < count && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        return countListChanged(text, list);
      },
      async close() {
        controller.abort();
        await reading;
      },
    };
  }

  type SSE = Awaited<ReturnType<typeof openSSE>>;

  /**
   * Resolves once everything `mcpWeb` sent earlier has reached the SSE stream.
   * The bridge handles a socket's messages in order and writes notifications
   * in order, so the fence's own notification arrives last. The fence changes
   * `list`, so only the other list's count can be checked after it.
   */
  async function fence(mcpWeb: MCPWeb, sse: SSE, list: List) {
    const count = sse.count(list);
    if (list === 'tools') {
      mcpWeb.addTool(simpleTool(`fence_${count}`));
    } else {
      mcpWeb.addResource({
        uri: `test://fence/${count}`,
        name: 'fence',
        handler: () => '',
      });
    }
    expect(await sse.waitFor(list, count + 1)).toBe(count + 1);
  }

  async function listNames(
    list: List,
    authToken: string,
    mcpSessionId: string,
    browserSessionId?: string,
  ) {
    const { body } = await mcpRequest(
      `${list}/list`,
      browserSessionId ? { _meta: { sessionId: browserSessionId } } : {},
      {
        Authorization: `Bearer ${authToken}`,
        'Mcp-Session-Id': mcpSessionId,
      },
    );
    const result = (
      body as { result: Record<List, Array<{ name: string; uri?: string }>> }
    ).result[list];
    return result.map((item) =>
      list === 'tools' ? item.name : (item.uri ?? ''),
    );
  }

  async function waitForNames(
    list: List,
    authToken: string,
    mcpSessionId: string,
    accept: (names: string[]) => boolean,
    browserSessionId?: string,
  ) {
    const deadline = Date.now() + 2000;
    let names = await listNames(
      list,
      authToken,
      mcpSessionId,
      browserSessionId,
    );
    while (!accept(names) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      names = await listNames(list, authToken, mcpSessionId, browserSessionId);
    }
    return names;
  }

  const simpleTool = (
    name: string,
    inputSchema: z.ZodObject = z.object({}),
  ) => ({
    name,
    description: `The ${name} tool`,
    inputSchema,
    outputSchema: z.object({ ok: z.boolean() }),
    handler: async () => ({ ok: true }),
  });

  test('removeTool drops the tool and sends one list_changed', async () => {
    const authToken = 'remove-tool-token';
    const mcpWeb = new MCPWeb({ ...mcpWebConfig, authToken });
    mcpWeb.addTool(simpleTool('keep_me'));
    mcpWeb.addTool(simpleTool('drop_me'));
    await mcpWeb.connect();

    const { sessionId } = await initializeMcpSession(authToken);
    const registered = await waitForNames(
      'tools',
      authToken,
      sessionId,
      (names) => names.includes('drop_me'),
    );
    expect(registered).toEqual(expect.arrayContaining(['keep_me', 'drop_me']));

    const sse = await openSSE(sessionId);

    mcpWeb.removeTool('drop_me');
    expect(await sse.waitFor('tools', 1)).toBe(1);

    // A second removal changes nothing.
    mcpWeb.removeTool('drop_me');
    await fence(mcpWeb, sse, 'resources');
    expect(sse.count('tools')).toBe(1);

    const names = await listNames('tools', authToken, sessionId);
    expect(names).toContain('keep_me');
    expect(names).not.toContain('drop_me');

    await sse.close();
    mcpWeb.disconnect();
  });

  test('a rejected replacement drops the earlier registration of that session', async () => {
    const authToken = 'remove-rejected-token';
    const tabA = new MCPWeb({ ...mcpWebConfig, authToken });
    const tabB = new MCPWeb({ ...mcpWebConfig, authToken });
    tabA.addTool(simpleTool('shared'));
    tabB.addTool(simpleTool('shared'));
    await tabA.connect();
    await tabB.connect();

    const { sessionId } = await initializeMcpSession(authToken);
    const hasShared = (names: string[]) => names.includes('shared');
    for (const tab of [tabA, tabB]) {
      const names = await waitForNames(
        'tools',
        authToken,
        sessionId,
        hasShared,
        tab.sessionId,
      );
      expect(names).toContain('shared');
    }

    // Tab B holds the old schema, so the bridge rejects this and tab A drops
    // the tool. The bridge drops tab A's earlier registration before it sends
    // the rejection.
    const rejected = new Promise((resolve) => {
      tabA.addTool(simpleTool('shared', z.object({ other: z.string() })), {
        onRegistrationError: resolve,
      });
    });
    await rejected;
    expect(tabA.tools.has('shared')).toBe(false);

    expect(
      await listNames('tools', authToken, sessionId, tabA.sessionId),
    ).not.toContain('shared');
    expect(
      await listNames('tools', authToken, sessionId, tabB.sessionId),
    ).toContain('shared');

    tabA.disconnect();
    tabB.disconnect();
  });

  test('the cleanup of addStateTools with codeMode removes its tools', async () => {
    const authToken = 'remove-code-mode-token';
    const mcpWeb = new MCPWeb({ ...mcpWebConfig, authToken });
    let state = { count: 0, label: 'start' };
    const [, , cleanup] = mcpWeb.addStateTools({
      name: 'app',
      description: 'App state',
      get: () => state,
      set: (value) => {
        state = value;
      },
      schema: z.object({ count: z.number(), label: z.string() }),
      expand: true,
      codeMode: createCodeMode({ executor: () => new FunctionExecutor() }),
    });
    mcpWeb.addTool(simpleTool('stays'));
    await mcpWeb.connect();

    const { sessionId } = await initializeMcpSession(authToken);
    const registered = await waitForNames(
      'tools',
      authToken,
      sessionId,
      (names) =>
        ['get_app', 'code_app', 'stays'].every((name) => names.includes(name)),
    );
    expect(registered).toEqual(
      expect.arrayContaining(['get_app', 'code_app', 'stays']),
    );

    const sse = await openSSE(sessionId);

    cleanup();

    const names = await waitForNames(
      'tools',
      authToken,
      sessionId,
      (toolNames) =>
        !toolNames.includes('get_app') && !toolNames.includes('code_app'),
    );
    expect(names).not.toContain('get_app');
    expect(names).not.toContain('code_app');
    expect(names).toContain('stays');

    // One notification per removed tool.
    const removed = registered.filter((name) => !names.includes(name));
    await fence(mcpWeb, sse, 'resources');
    expect(sse.count('tools')).toBe(removed.length);

    await sse.close();
    mcpWeb.disconnect();
  });

  test('a tool removed while disconnected is not registered on reconnect', async () => {
    const authToken = 'remove-offline-token';
    const mcpWeb = new MCPWeb({ ...mcpWebConfig, authToken });
    // Registrations replay in this order, so seeing `online` after reconnecting
    // means the bridge has handled any replay of `offline_removed`.
    mcpWeb.addTool(simpleTool('offline_removed'));
    mcpWeb.addTool(simpleTool('online'));
    await mcpWeb.connect();

    const { sessionId } = await initializeMcpSession(authToken);
    expect(
      await waitForNames('tools', authToken, sessionId, (names) =>
        ['offline_removed', 'online'].every((name) => names.includes(name)),
      ),
    ).toEqual(expect.arrayContaining(['offline_removed', 'online']));

    mcpWeb.disconnect();
    expect(
      await waitForNames(
        'tools',
        authToken,
        sessionId,
        (names) => !names.includes('online'),
      ),
    ).not.toContain('online');
    mcpWeb.removeTool('offline_removed');
    await mcpWeb.connect();

    const names = await waitForNames(
      'tools',
      authToken,
      sessionId,
      (toolNames) => toolNames.includes('online'),
    );
    expect(names).toContain('online');
    expect(names).not.toContain('offline_removed');

    mcpWeb.disconnect();
  });

  test('the first browser session notifies both lists', async () => {
    const authToken = 'first-session-token';
    const { sessionId } = await initializeMcpSession(authToken);
    expect(await listNames('resources', authToken, sessionId)).toEqual([
      'status://connection',
    ]);
    const sse = await openSSE(sessionId);

    const mcpWeb = new MCPWeb({ ...mcpWebConfig, authToken });
    await mcpWeb.connect();

    expect(await sse.waitFor('tools', 1)).toBe(1);
    expect(await sse.waitFor('resources', 1)).toBe(1);
    expect(await listNames('resources', authToken, sessionId)).toEqual([
      'sessions://list',
    ]);

    await sse.close();
    mcpWeb.disconnect();
  });

  test('addResource and removeResource each send one list_changed', async () => {
    const authToken = 'remove-resource-token';
    const mcpWeb = new MCPWeb({ ...mcpWebConfig, authToken });
    await mcpWeb.connect();

    const { sessionId } = await initializeMcpSession(authToken);
    const sse = await openSSE(sessionId);

    const uri = 'test://removable';
    mcpWeb.addResource({ uri, name: 'removable', handler: () => 'content' });
    expect(await sse.waitFor('resources', 1)).toBe(1);
    expect(await listNames('resources', authToken, sessionId)).toContain(uri);

    mcpWeb.removeResource(uri);
    expect(await sse.waitFor('resources', 2)).toBe(2);
    expect(await listNames('resources', authToken, sessionId)).not.toContain(
      uri,
    );

    // A second removal changes nothing.
    mcpWeb.removeResource(uri);
    await fence(mcpWeb, sse, 'tools');
    expect(sse.count('resources')).toBe(2);

    await sse.close();
    mcpWeb.disconnect();
  });

  test('removeApp drops its tool and resource and notifies both lists', async () => {
    const authToken = 'remove-app-token';
    const mcpWeb = new MCPWeb({ ...mcpWebConfig, authToken });
    const resourceUri = 'ui://show_stats/app.html';
    mcpWeb.addApp({
      name: 'show_stats',
      description: 'Shows stats',
      component: () => null,
      handler: () => ({}),
      resourceUri,
    });
    await mcpWeb.connect();

    const { sessionId } = await initializeMcpSession(authToken);
    expect(
      await waitForNames('tools', authToken, sessionId, (names) =>
        names.includes('show_stats'),
      ),
    ).toContain('show_stats');
    expect(
      await waitForNames('resources', authToken, sessionId, (uris) =>
        uris.includes(resourceUri),
      ),
    ).toContain(resourceUri);

    const sse = await openSSE(sessionId);

    mcpWeb.removeApp('show_stats');
    expect(await sse.waitFor('tools', 1)).toBe(1);
    expect(await sse.waitFor('resources', 1)).toBe(1);

    expect(await listNames('tools', authToken, sessionId)).not.toContain(
      'show_stats',
    );
    expect(await listNames('resources', authToken, sessionId)).not.toContain(
      resourceUri,
    );

    await sse.close();
    mcpWeb.disconnect();
  });
});
