import { test, expect, afterEach, describe } from 'bun:test';
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

// Helper to authenticate a client with optional session name
async function authenticateClient(
  ws: WebSocket,
  authToken: string,
  sessionName?: string
): Promise<void> {
  ws.send(JSON.stringify({
    type: 'authenticate',
    authToken,
    origin: 'http://localhost:3000',
    pageTitle: 'Test Page',
    sessionName,
    userAgent: 'Test Agent',
    timestamp: Date.now(),
  }));

  await waitForMessage(ws, 'authenticated');
}

// Helper to register a tool
function registerTool(ws: WebSocket, name: string, description: string): void {
  ws.send(JSON.stringify({
    type: 'register-tool',
    tool: { name, description },
  }));
}

// Helper to make MCP HTTP requests
async function mcpRequest(
  port: number,
  method: string,
  params?: Record<string, unknown>,
  authToken?: string
): Promise<unknown> {
  const response = await fetch(`http://localhost:${port}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  return response.json();
}

// ============================================================================
// Session Naming Tests
// ============================================================================

describe('Session Naming', () => {
  let bridge: MCPWebBridgeNode;
  let clients: WebSocket[] = [];
  const port = 4701;

  afterEach(async () => {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    }
    clients = [];

    if (bridge) {
      await bridge.close();
    }
  });

  test('session with a name authenticates successfully', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const client = await createMockClient(port, 'session-named-1');
    clients.push(client);
    await authenticateClient(client, 'token-1', 'Game 1');

    expect(client.readyState).toBe(WebSocket.OPEN);
  });

  test('sessions without names work as before', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const client1 = await createMockClient(port, 'session-unnamed-1');
    clients.push(client1);
    await authenticateClient(client1, 'token-1');

    const client2 = await createMockClient(port, 'session-unnamed-2');
    clients.push(client2);
    await authenticateClient(client2, 'token-1');

    expect(client1.readyState).toBe(WebSocket.OPEN);
    expect(client2.readyState).toBe(WebSocket.OPEN);
  });

  test('rejects duplicate session name under same auth token', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const authToken = 'token-dup-name';

    // First session with name "Game 1"
    const client1 = await createMockClient(port, 'session-dup-1');
    clients.push(client1);
    await authenticateClient(client1, authToken, 'Game 1');

    // Second session with same name "Game 1" — should be rejected
    const client2 = await createMockClient(port, 'session-dup-2');
    clients.push(client2);

    const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
      client2.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() });
      });
    });

    client2.send(JSON.stringify({
      type: 'authenticate',
      authToken,
      origin: 'http://localhost:3000',
      sessionName: 'Game 1',
      timestamp: Date.now(),
    }));

    // Should receive authentication-failed message
    const failedMessage = await waitForMessage<{ type: string; error: string; code: string }>(
      client2,
      'authentication-failed'
    );
    expect(failedMessage.code).toBe('SessionNameAlreadyInUse');
    expect(failedMessage.error).toContain('Game 1');

    // Connection should be closed
    const closeResult = await closePromise;
    expect(closeResult.code).toBe(1008);
    expect(closeResult.reason).toBe('Session name already in use');
  });

  test('allows same session name under different auth tokens', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    // "Game 1" under token-a
    const client1 = await createMockClient(port, 'session-cross-1');
    clients.push(client1);
    await authenticateClient(client1, 'token-a', 'Game 1');

    // "Game 1" under token-b — should succeed (different token)
    const client2 = await createMockClient(port, 'session-cross-2');
    clients.push(client2);
    await authenticateClient(client2, 'token-b', 'Game 1');

    expect(client1.readyState).toBe(WebSocket.OPEN);
    expect(client2.readyState).toBe(WebSocket.OPEN);
  });

  test('allows different session names under same auth token', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const authToken = 'token-diff-names';

    const client1 = await createMockClient(port, 'session-diff-1');
    clients.push(client1);
    await authenticateClient(client1, authToken, 'Game 1');

    const client2 = await createMockClient(port, 'session-diff-2');
    clients.push(client2);
    await authenticateClient(client2, authToken, 'Game 2');

    expect(client1.readyState).toBe(WebSocket.OPEN);
    expect(client2.readyState).toBe(WebSocket.OPEN);
  });

  test('allows named and unnamed sessions under same token', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const authToken = 'token-mixed';

    const client1 = await createMockClient(port, 'session-mixed-1');
    clients.push(client1);
    await authenticateClient(client1, authToken, 'Game 1');

    // Unnamed session — should work fine
    const client2 = await createMockClient(port, 'session-mixed-2');
    clients.push(client2);
    await authenticateClient(client2, authToken);

    expect(client1.readyState).toBe(WebSocket.OPEN);
    expect(client2.readyState).toBe(WebSocket.OPEN);
  });

  test('reclaiming a name after the original session disconnects', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const authToken = 'token-reclaim';

    // Create and authenticate with "Game 1"
    const client1 = await createMockClient(port, 'session-reclaim-1');
    clients.push(client1);
    await authenticateClient(client1, authToken, 'Game 1');

    // Disconnect client1
    client1.close();
    await new Promise(resolve => setTimeout(resolve, 100));

    // New client should be able to use "Game 1"
    const client2 = await createMockClient(port, 'session-reclaim-2');
    clients.push(client2);
    await authenticateClient(client2, authToken, 'Game 1');

    expect(client2.readyState).toBe(WebSocket.OPEN);
  });
});

// ============================================================================
// Session Name in list_sessions
// ============================================================================

describe('Session Name in list_sessions', () => {
  let bridge: MCPWebBridgeNode;
  let clients: WebSocket[] = [];
  const port = 4702;

  afterEach(async () => {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    }
    clients = [];

    if (bridge) {
      await bridge.close();
    }
  });

  test('list_sessions includes session_name for named sessions', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const authToken = 'token-list';

    const client1 = await createMockClient(port, 'session-list-1');
    clients.push(client1);
    await authenticateClient(client1, authToken, 'Game 1');
    registerTool(client1, 'move_piece', 'Move a piece');

    // Small delay for tool registration
    await new Promise(resolve => setTimeout(resolve, 100));

    const client2 = await createMockClient(port, 'session-list-2');
    clients.push(client2);
    await authenticateClient(client2, authToken, 'Game 2');
    registerTool(client2, 'move_piece', 'Move a piece');

    // Small delay for tool registration
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize MCP session first
    const initResult = await fetch(`http://localhost:${port}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {},
      }),
    });
    const initJson = await initResult.json() as { result: unknown };
    const mcpSessionId = initResult.headers.get('mcp-session-id');

    // Call list_sessions tool
    const response = await fetch(`http://localhost:${port}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        ...(mcpSessionId ? { 'Mcp-Session-Id': mcpSessionId } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list_sessions',
          arguments: {},
        },
      }),
    });

    const result = await response.json() as {
      result: {
        content: Array<{ type: string; text: string }>;
      };
    };

    const sessions = JSON.parse(result.result.content[0].text).sessions;
    expect(sessions).toHaveLength(2);

    const session1 = sessions.find((s: { session_name: string }) => s.session_name === 'Game 1');
    const session2 = sessions.find((s: { session_name: string }) => s.session_name === 'Game 2');

    expect(session1).toBeDefined();
    expect(session1.session_id).toBe('session-list-1');
    expect(session1.session_name).toBe('Game 1');

    expect(session2).toBeDefined();
    expect(session2.session_id).toBe('session-list-2');
    expect(session2.session_name).toBe('Game 2');
  });

  test('list_sessions returns undefined session_name for unnamed sessions', async () => {
    bridge = new MCPWebBridgeNode({
      name: 'Test Bridge',
      description: 'Test',
      port,
    });

    const authToken = 'token-list-unnamed';

    const client1 = await createMockClient(port, 'session-unnamed-list');
    clients.push(client1);
    await authenticateClient(client1, authToken);
    registerTool(client1, 'some_tool', 'Some tool');

    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize MCP session
    const initResult = await fetch(`http://localhost:${port}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {},
      }),
    });
    const mcpSessionId = initResult.headers.get('mcp-session-id');

    // Call list_sessions
    const response = await fetch(`http://localhost:${port}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        ...(mcpSessionId ? { 'Mcp-Session-Id': mcpSessionId } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list_sessions',
          arguments: {},
        },
      }),
    });

    const result = await response.json() as {
      result: {
        content: Array<{ type: string; text: string }>;
      };
    };

    const sessions = JSON.parse(result.result.content[0].text).sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0].session_name).toBeUndefined();
  });
});
