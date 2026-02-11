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
