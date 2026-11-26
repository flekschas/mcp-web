import { test, expect, beforeEach, afterEach, describe } from 'bun:test';
import { MCPWebBridgeNode } from './adapters/node.js';
import { WebSocket } from 'ws';

// Helper to create a mock WebSocket client
function createMockClient(port: number, sessionId: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}?session=${sessionId}`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

// Helper to wait for a specific message type
function waitForMessage<T>(ws: WebSocket, type: string, timeout = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${type}`)), timeout);

    const handler = (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === type) {
          clearTimeout(timer);
          ws.removeListener('message', handler);
          resolve(message);
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.on('message', handler);
  });
}

// Helper to authenticate a client
async function authenticateClient(ws: WebSocket, authToken: string): Promise<void> {
  ws.send(
    JSON.stringify({
      type: 'authenticate',
      authToken,
      origin: 'http://localhost:3000',
      pageTitle: 'Test Page',
      userAgent: 'Test Agent',
      timestamp: Date.now(),
    })
  );

  await waitForMessage(ws, 'authenticated');
}

// Helper to register a tool
function registerTool(ws: WebSocket, name: string, description: string): void {
  ws.send(
    JSON.stringify({
      type: 'register-tool',
      tool: {
        name,
        description,
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
          required: ['input'],
        },
      },
    })
  );
}

// Helper to make MCP JSON-RPC request
async function mcpRequest(
  port: number,
  method: string,
  params?: Record<string, unknown>,
  headers?: Record<string, string>,
  queryParams?: Record<string, string>
): Promise<{ status: number; body: unknown; headers: Headers }> {
  const url = new URL(`http://localhost:${port}`);
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
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

describe('Remote MCP - Initialize', () => {
  let bridge: MCPWebBridgeNode;
  const port = 4601;

  afterEach(async () => {
    if (bridge) {
      await bridge.close();
    }
  });

  test('initialize returns Mcp-Session-Id header', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test Remote MCP',
      port,
    });

    const { status, body, headers } = await mcpRequest(
      port,
      'initialize',
      { protocolVersion: '2024-11-05' },
      { Authorization: 'Bearer test-token' }
    );

    expect(status).toBe(200);
    expect(body).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: true },
          resources: {},
          prompts: {},
        },
        serverInfo: {
          name: 'Test Bridge',
          description: 'Test Remote MCP',
        },
      },
    });

    // Should have Mcp-Session-Id header
    const sessionId = headers.get('mcp-session-id');
    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe('string');
    expect(sessionId!.length).toBeGreaterThan(0);
  });

  test('initialize requires authorization header', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const { status, body } = await mcpRequest(port, 'initialize', {
      protocolVersion: '2024-11-05',
    });

    expect(status).toBe(200);
    expect(body).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -32600,
        message: 'MissingAuthentication',
      },
    });
  });

  test('initialize accepts token via query param (for Remote MCP)', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test Remote MCP with query param',
      port,
    });

    const { status, body, headers } = await mcpRequest(
      port,
      'initialize',
      { protocolVersion: '2024-11-05' },
      undefined, // no Authorization header
      { token: 'query-param-token' }
    );

    expect(status).toBe(200);
    expect(body).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: true },
          resources: {},
          prompts: {},
        },
        serverInfo: {
          name: 'Test Bridge',
          description: 'Test Remote MCP with query param',
        },
      },
    });

    // Should have Mcp-Session-Id header
    const sessionId = headers.get('mcp-session-id');
    expect(sessionId).toBeTruthy();
  });

  test('initialize creates unique session IDs', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const session1 = await mcpRequest(
      port,
      'initialize',
      { protocolVersion: '2024-11-05' },
      { Authorization: 'Bearer test-token' }
    );

    const session2 = await mcpRequest(
      port,
      'initialize',
      { protocolVersion: '2024-11-05' },
      { Authorization: 'Bearer test-token' }
    );

    const sessionId1 = session1.headers.get('mcp-session-id');
    const sessionId2 = session2.headers.get('mcp-session-id');

    expect(sessionId1).toBeTruthy();
    expect(sessionId2).toBeTruthy();
    expect(sessionId1).not.toBe(sessionId2);
  });
});

describe('Remote MCP - Session Management', () => {
  let bridge: MCPWebBridgeNode;
  const port = 4602;

  afterEach(async () => {
    if (bridge) {
      await bridge.close();
    }
  });

  test('subsequent requests with Mcp-Session-Id are accepted', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    // Initialize to get session ID
    const initResponse = await mcpRequest(
      port,
      'initialize',
      { protocolVersion: '2024-11-05' },
      { Authorization: 'Bearer test-token' }
    );
    const sessionId = initResponse.headers.get('mcp-session-id')!;

    // Send notifications/initialized
    const initializedResponse = await mcpRequest(
      port,
      'notifications/initialized',
      {},
      {
        Authorization: 'Bearer test-token',
        'Mcp-Session-Id': sessionId,
      }
    );

    expect(initializedResponse.status).toBe(202);
  });

  test('DELETE with Mcp-Session-Id closes the session', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    // Initialize to get session ID
    const initResponse = await mcpRequest(
      port,
      'initialize',
      { protocolVersion: '2024-11-05' },
      { Authorization: 'Bearer test-token' }
    );
    const sessionId = initResponse.headers.get('mcp-session-id')!;

    // Delete the session
    const deleteResponse = await fetch(`http://localhost:${port}`, {
      method: 'DELETE',
      headers: {
        'Mcp-Session-Id': sessionId,
      },
    });

    expect(deleteResponse.status).toBe(200);
    const body = await deleteResponse.json();
    expect(body).toEqual({ success: true });
  });

  test('DELETE with invalid session ID returns 404', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const deleteResponse = await fetch(`http://localhost:${port}`, {
      method: 'DELETE',
      headers: {
        'Mcp-Session-Id': 'invalid-session-id',
      },
    });

    expect(deleteResponse.status).toBe(404);
  });

  test('DELETE without Mcp-Session-Id returns 400', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const deleteResponse = await fetch(`http://localhost:${port}`, {
      method: 'DELETE',
    });

    expect(deleteResponse.status).toBe(400);
  });
});

describe('Remote MCP - SSE Stream', () => {
  let bridge: MCPWebBridgeNode;
  const port = 4603;

  afterEach(async () => {
    if (bridge) {
      await bridge.close();
    }
  });

  test('GET with Accept: text/event-stream opens SSE connection', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    // Initialize to get session ID
    const initResponse = await mcpRequest(
      port,
      'initialize',
      { protocolVersion: '2024-11-05' },
      { Authorization: 'Bearer test-token' }
    );
    const sessionId = initResponse.headers.get('mcp-session-id')!;

    // Open SSE connection
    const controller = new AbortController();
    const ssePromise = fetch(`http://localhost:${port}`, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        'Mcp-Session-Id': sessionId,
      },
      signal: controller.signal,
    });

    // Give it a moment to establish
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Abort the connection
    controller.abort();

    // The fetch should have started (we can't easily test streaming in this context)
    try {
      await ssePromise;
    } catch (error) {
      // AbortError is expected
      expect((error as Error).name).toBe('AbortError');
    }
  });

  test('GET without Accept: text/event-stream returns server info', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const response = await fetch(`http://localhost:${port}`, {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe('Test Bridge');
    expect(body.description).toBe('Test');
  });

  test('GET SSE without Mcp-Session-Id returns error event', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const response = await fetch(`http://localhost:${port}`, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');

    // Read the first event
    const reader = response.body!.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain('data:');
    expect(text).toContain('Mcp-Session-Id header required');

    reader.cancel();
  });
});

describe('Remote MCP - Tools List Changed Notification', () => {
  let bridge: MCPWebBridgeNode;
  let wsClient: WebSocket;
  const port = 4604;

  afterEach(async () => {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.close();
    }
    if (bridge) {
      await bridge.close();
    }
  });

  test('tool registration triggers notification to SSE stream', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const authToken = 'test-token-notify';

    // Initialize MCP session
    const initResponse = await mcpRequest(
      port,
      'initialize',
      { protocolVersion: '2024-11-05' },
      { Authorization: `Bearer ${authToken}` }
    );
    const mcpSessionId = initResponse.headers.get('mcp-session-id')!;

    // Open SSE stream and collect events
    const receivedEvents: string[] = [];
    const controller = new AbortController();

    const ssePromise = (async () => {
      const response = await fetch(`http://localhost:${port}`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Mcp-Session-Id': mcpSessionId,
        },
        signal: controller.signal,
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          receivedEvents.push(text);
        }
      } catch {
        // Stream was aborted, that's expected
      }
    })();

    // Wait for SSE connection to establish
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Connect WebSocket client and register tool
    wsClient = await createMockClient(port, 'session-notify-1');
    await authenticateClient(wsClient, authToken);

    // Small delay to ensure authentication is processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Register a tool - this should trigger notification
    registerTool(wsClient, 'test_tool', 'A test tool');

    // Wait for notification to be sent and received
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Abort SSE connection
    controller.abort();
    await ssePromise.catch(() => {});

    // Check received events
    const fullText = receivedEvents.join('');
    expect(fullText).toContain('notifications/tools/list_changed');
  });

  test('tool registration only notifies matching auth token', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const authToken1 = 'test-token-1';
    const authToken2 = 'test-token-2';

    // Initialize MCP session for token1
    const initResponse = await mcpRequest(
      port,
      'initialize',
      { protocolVersion: '2024-11-05' },
      { Authorization: `Bearer ${authToken1}` }
    );
    const mcpSessionId = initResponse.headers.get('mcp-session-id')!;

    // Open SSE stream for token1's session and collect events
    const receivedEvents: string[] = [];
    const controller = new AbortController();

    const ssePromise = (async () => {
      const response = await fetch(`http://localhost:${port}`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Mcp-Session-Id': mcpSessionId,
        },
        signal: controller.signal,
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          receivedEvents.push(text);
        }
      } catch {
        // Stream was aborted, that's expected
      }
    })();

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Connect WebSocket client with DIFFERENT auth token
    wsClient = await createMockClient(port, 'session-different-token');
    await authenticateClient(wsClient, authToken2);

    // Register tool with different token - should NOT notify token1's SSE
    registerTool(wsClient, 'other_tool', 'Other tool');

    await new Promise((resolve) => setTimeout(resolve, 200));

    controller.abort();
    await ssePromise.catch(() => {});

    const fullText = receivedEvents.join('');

    // Should NOT contain tools/list_changed (different auth token)
    expect(fullText).not.toContain('notifications/tools/list_changed');
  });

  test('session disconnect triggers notification to SSE stream', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const authToken = 'test-token-disconnect';

    // Connect WebSocket client and register tool first
    wsClient = await createMockClient(port, 'session-disconnect-1');
    await authenticateClient(wsClient, authToken);
    registerTool(wsClient, 'disconnect_tool', 'A tool');

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Initialize MCP session
    const initResponse = await mcpRequest(
      port,
      'initialize',
      { protocolVersion: '2024-11-05' },
      { Authorization: `Bearer ${authToken}` }
    );
    const mcpSessionId = initResponse.headers.get('mcp-session-id')!;

    // Open SSE stream and collect events
    const receivedEvents: string[] = [];
    const controller = new AbortController();

    const ssePromise = (async () => {
      const response = await fetch(`http://localhost:${port}`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Mcp-Session-Id': mcpSessionId,
        },
        signal: controller.signal,
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          receivedEvents.push(text);
        }
      } catch {
        // Stream was aborted
      }
    })();

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Disconnect the WebSocket client - this should trigger notification
    wsClient.close();

    // Wait for notification
    await new Promise((resolve) => setTimeout(resolve, 200));

    controller.abort();
    await ssePromise.catch(() => {});

    const fullText = receivedEvents.join('');
    expect(fullText).toContain('notifications/tools/list_changed');
  });
});

describe('Remote MCP - Capabilities', () => {
  let bridge: MCPWebBridgeNode;
  const port = 4605;

  afterEach(async () => {
    if (bridge) {
      await bridge.close();
    }
  });

  test('initialize response includes listChanged capability', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const { body } = await mcpRequest(
      port,
      'initialize',
      { protocolVersion: '2024-11-05' },
      { Authorization: 'Bearer test-token' }
    );

    expect(body).toMatchObject({
      result: {
        capabilities: {
          tools: { listChanged: true },
          resources: { listChanged: true },
        },
      },
    });
  });
});

describe('Remote MCP - Server Info', () => {
  let bridge: MCPWebBridgeNode;
  const port = 4606;

  afterEach(async () => {
    if (bridge) {
      await bridge.close();
    }
  });

  test('GET / returns server info without auth', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'A test bridge server',
      port,
    });

    const response = await fetch(`http://localhost:${port}/`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body.name).toBe('Test Bridge');
    expect(body.description).toBe('A test bridge server');
    expect(typeof body.version).toBe('string');
    // No icon configured, so it should not be present
    expect(body.icon).toBeUndefined();
  });

  test('GET / includes icon when configured as data URI', async () => {
    const testIcon = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
      icon: testIcon,
    });

    const response = await fetch(`http://localhost:${port}/`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body.icon).toBe(testIcon);
  });

  test('initialize response includes icon when configured', async () => {
    const testIcon = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
      icon: testIcon,
    });

    const { body } = await mcpRequest(
      port,
      'initialize',
      { protocolVersion: '2024-11-05' },
      { Authorization: 'Bearer test-token' }
    );

    expect(body).toMatchObject({
      result: {
        serverInfo: {
          name: 'Test Bridge',
          icon: testIcon,
        },
      },
    });
  });
});

describe('Remote MCP - Structured Output', () => {
  let bridge: MCPWebBridgeNode;
  let wsClient: WebSocket;
  const port = 4607;
  const authToken = 'test-token-structured';

  afterEach(async () => {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.close();
    }
    if (bridge) {
      await bridge.close();
    }
  });

  // Connects a frontend that registers `tool` and answers every call with
  // `result`.
  async function connectFrontend(
    tool: Record<string, unknown>,
    result: unknown,
  ): Promise<void> {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });
    wsClient = await createMockClient(port, 'session-structured');
    await authenticateClient(wsClient, authToken);
    wsClient.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'tool-call') {
        wsClient.send(
          JSON.stringify({
            type: 'tool-response',
            requestId: message.requestId,
            result,
          }),
        );
      }
    });
    wsClient.send(JSON.stringify({ type: 'register-tool', tool }));
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const outputSchema = {
    type: 'object',
    properties: { message: { type: 'string' } },
    required: ['message'],
  };

  test('tools/list includes object output schemas', async () => {
    await connectFrontend(
      { name: 'get_greeting', description: 'Greet', outputSchema },
      { message: 'Hello' },
    );

    const { body } = await mcpRequest(
      port,
      'tools/list',
      {},
      {
        Authorization: `Bearer ${authToken}`,
      },
    );
    const tools = (
      body as { result: { tools: Array<Record<string, unknown>> } }
    ).result.tools;
    expect(tools.find((t) => t.name === 'get_greeting')?.outputSchema).toEqual(
      outputSchema,
    );
  });

  test('tools/list leaves out output schemas that are not objects', async () => {
    await connectFrontend(
      {
        name: 'get_name',
        description: 'Name',
        outputSchema: { type: 'string' },
      },
      'Alice',
    );

    const { body } = await mcpRequest(
      port,
      'tools/list',
      {},
      {
        Authorization: `Bearer ${authToken}`,
      },
    );
    const tools = (
      body as { result: { tools: Array<Record<string, unknown>> } }
    ).result.tools;
    const tool = tools.find((t) => t.name === 'get_name');
    expect(tool).toBeDefined();
    expect(tool).not.toHaveProperty('outputSchema');
  });

  test('tools/call returns structured content without _meta', async () => {
    await connectFrontend(
      { name: 'get_greeting', description: 'Greet', outputSchema },
      { message: 'Hello', _meta: { ui: { resourceUri: 'ui://greeting' } } },
    );

    const { body } = await mcpRequest(
      port,
      'tools/call',
      { name: 'get_greeting', arguments: {} },
      { Authorization: `Bearer ${authToken}` },
    );
    const result = (body as { result: Record<string, unknown> }).result;
    expect(result.structuredContent).toEqual({ message: 'Hello' });
    expect(result._meta).toEqual({ ui: { resourceUri: 'ui://greeting' } });
    expect(result.content).toEqual([
      { type: 'text', text: JSON.stringify({ message: 'Hello' }, null, 2) },
    ]);
  });

  test('tools/call returns no structured content for errors', async () => {
    await connectFrontend(
      { name: 'get_greeting', description: 'Greet', outputSchema },
      { error: 'Invalid output' },
    );

    const { body } = await mcpRequest(
      port,
      'tools/call',
      { name: 'get_greeting', arguments: {} },
      { Authorization: `Bearer ${authToken}` },
    );
    const result = (body as { result: Record<string, unknown> }).result;
    expect(result.isError).toBe(true);
    expect(result).not.toHaveProperty('structuredContent');
  });

  test.each([null, 'Hello', ['Hello']])(
    'tools/call fails for the result %j, which does not match the output schema',
    async (value) => {
      await connectFrontend(
        { name: 'get_greeting', description: 'Greet', outputSchema },
        value,
      );

      const { body } = await mcpRequest(
        port,
        'tools/call',
        { name: 'get_greeting', arguments: {} },
        { Authorization: `Bearer ${authToken}` },
      );
      const result = (body as { result: Record<string, unknown> }).result;
      expect(result.isError).toBe(true);
      expect(result).not.toHaveProperty('structuredContent');
    },
  );

  test('a result that does not match the output schema leaves the query active', async () => {
    const originalFetch = globalThis.fetch;
    // The agent accepts the query and never calls back
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
      String(input).includes('localhost:9999')
        ? Promise.resolve(new Response('{}'))
        : originalFetch(input, init)) as typeof fetch;

    try {
      bridge = new MCPWebBridgeNode({
        name: 'Test Bridge',
        description: 'Test',
        port,
        agentUrl: 'localhost:9999',
      });
      wsClient = await createMockClient(port, 'session-structured');
      await authenticateClient(wsClient, authToken);

      const results: unknown[] = [null, { message: 'Hello' }];
      const messageTypes: string[] = [];
      wsClient.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());
        messageTypes.push(message.type);
        if (message.type === 'tool-call') {
          wsClient.send(
            JSON.stringify({
              type: 'tool-response',
              requestId: message.requestId,
              result: results.shift(),
            }),
          );
        }
      });

      const tool = { name: 'get_greeting', description: 'Greet', outputSchema };
      wsClient.send(JSON.stringify({ type: 'register-tool', tool }));
      wsClient.send(
        JSON.stringify({
          type: 'query',
          uuid: 'query-structured',
          prompt: 'Greet',
          context: [],
          responseTool: tool,
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 100));

      const callResponseTool = async () => {
        const { body } = await mcpRequest(
          port,
          'tools/call',
          {
            name: 'get_greeting',
            arguments: {},
            _meta: { queryId: 'query-structured' },
          },
          { Authorization: `Bearer ${authToken}` },
        );
        return (body as { result: Record<string, unknown> }).result;
      };

      expect((await callResponseTool()).isError).toBe(true);
      expect(messageTypes).not.toContain('query_complete');

      const result = await callResponseTool();
      expect(result.structuredContent).toEqual({ message: 'Hello' });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(messageTypes).toContain('query_complete');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('tools/call returns no structured content without an output schema', async () => {
    await connectFrontend(
      { name: 'get_greeting', description: 'Greet' },
      { message: 'Hello' },
    );

    const { body } = await mcpRequest(
      port,
      'tools/call',
      { name: 'get_greeting', arguments: {} },
      { Authorization: `Bearer ${authToken}` },
    );
    const result = (body as { result: Record<string, unknown> }).result;
    expect(result).not.toHaveProperty('structuredContent');
  });

  test('tools/call keeps _meta and structured content for image results', async () => {
    const imageSchema = {
      type: 'object',
      properties: { dataUrl: { type: 'string' } },
      required: ['dataUrl'],
    };
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    await connectFrontend(
      { name: 'get_image', description: 'Image', outputSchema: imageSchema },
      { dataUrl, _meta: { ui: { resourceUri: 'ui://image' } } },
    );

    const { body } = await mcpRequest(
      port,
      'tools/call',
      { name: 'get_image', arguments: {} },
      { Authorization: `Bearer ${authToken}` },
    );
    const result = (body as { result: Record<string, unknown> }).result;
    expect(result.content).toEqual([
      { type: 'image', data: 'iVBORw0KGgo=', mimeType: 'image/png' },
    ]);
    expect(result.structuredContent).toEqual({ dataUrl });
    expect(result._meta).toEqual({ ui: { resourceUri: 'ui://image' } });
  });
});

describe('Remote MCP - Output Schemas Across Sessions', () => {
  let bridge: MCPWebBridgeNode;
  const wsClients: WebSocket[] = [];
  const port = 4608;
  const authToken = 'test-token-output-sessions';

  afterEach(async () => {
    for (const ws of wsClients.splice(0)) {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    }
    if (bridge) {
      await bridge.close();
    }
  });

  const inputSchema = { type: 'object', properties: {} };
  const countSchema = {
    type: 'object',
    properties: { count: { type: 'number' } },
    required: ['count'],
  };

  async function connectSession(sessionId: string): Promise<WebSocket> {
    const ws = await createMockClient(port, sessionId);
    wsClients.push(ws);
    await authenticateClient(ws, authToken);
    return ws;
  }

  async function registerInTwoSessions(
    firstOutputSchema: unknown,
    secondOutputSchema: unknown,
  ): Promise<WebSocket> {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });
    const first = await connectSession('session-output-1');
    first.send(
      JSON.stringify({
        type: 'register-tool',
        tool: {
          name: 'get_count',
          description: 'Count',
          inputSchema,
          outputSchema: firstOutputSchema,
        },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));

    const second = await connectSession('session-output-2');
    second.send(
      JSON.stringify({
        type: 'register-tool',
        tool: {
          name: 'get_count',
          description: 'Count',
          inputSchema,
          outputSchema: secondOutputSchema,
        },
      }),
    );
    return second;
  }

  test('rejects the same tool with a different output schema', async () => {
    const second = await registerInTwoSessions(countSchema, {
      type: 'object',
      properties: { total: { type: 'number' } },
      required: ['total'],
    });
    const error = await waitForMessage<{ toolName: string }>(
      second,
      'tool-registration-error',
    );
    expect(error.toolName).toBe('get_count');
  });

  test('rejects the same tool when only one session has an output schema', async () => {
    const second = await registerInTwoSessions(countSchema, undefined);
    const error = await waitForMessage<{ toolName: string }>(
      second,
      'tool-registration-error',
    );
    expect(error.toolName).toBe('get_count');
  });

  test('accepts the same output schema with its keys in another order', async () => {
    const second = await registerInTwoSessions(countSchema, {
      required: ['count'],
      properties: { count: { type: 'number' } },
      type: 'object',
    });
    const messageTypes: string[] = [];
    second.on('message', (data: Buffer) => {
      messageTypes.push(JSON.parse(data.toString()).type);
    });
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(messageTypes).not.toContain('tool-registration-error');
  });

  test('accepts the same output schema with and without a root $schema', async () => {
    const second = await registerInTwoSessions(countSchema, {
      $schema: 'http://json-schema.org/draft-07/schema#',
      ...countSchema,
    });
    const messageTypes: string[] = [];
    second.on('message', (data: Buffer) => {
      messageTypes.push(JSON.parse(data.toString()).type);
    });
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(messageTypes).not.toContain('tool-registration-error');
  });

  test('lists the shared output schema when several sessions have the tool', async () => {
    await registerInTwoSessions(countSchema, countSchema);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const { body } = await mcpRequest(
      port,
      'tools/list',
      {},
      { Authorization: `Bearer ${authToken}` },
    );
    const result = (
      body as {
        result: {
          tools: Array<Record<string, unknown>>;
          _meta: { available_sessions: unknown[] };
        };
      }
    ).result;
    expect(result._meta.available_sessions).toHaveLength(2);
    expect(
      result.tools.find((t) => t.name === 'get_count')?.outputSchema,
    ).toEqual(countSchema);
  });
});
