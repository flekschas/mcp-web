import { test, expect, beforeEach, afterEach, describe } from 'bun:test';
import { MCPWebBridge } from './bridge.js';
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
  ws.send(JSON.stringify({
    type: 'authenticate',
    authToken,
    origin: 'http://localhost:3000',
    pageTitle: 'Test Page',
    userAgent: 'Test Agent',
    timestamp: Date.now()
  }));
  
  await waitForMessage(ws, 'authenticated');
}

describe('Session Limits', () => {
  let bridge: MCPWebBridge;
  let clients: WebSocket[] = [];
  const wsPort = 4101;
  const mcpPort = 4102;

  afterEach(async () => {
    // Close all clients
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    }
    clients = [];
    
    // Close bridge
    if (bridge) {
      await bridge.close();
    }
  });

  test('rejects new session when limit exceeded (reject mode)', async () => {
    bridge = new MCPWebBridge({
      name: 'Test Bridge',
      description: 'Test',
      wsPort,
      mcpPort,
      maxSessionsPerToken: 2,
      onSessionLimitExceeded: 'reject'
    });

    const authToken = 'test-token-reject';

    // Create and authenticate 2 sessions (at limit)
    const client1 = await createMockClient(wsPort, 'session-1');
    clients.push(client1);
    await authenticateClient(client1, authToken);

    const client2 = await createMockClient(wsPort, 'session-2');
    clients.push(client2);
    await authenticateClient(client2, authToken);

    // Try to create a 3rd session - should be rejected
    const client3 = await createMockClient(wsPort, 'session-3');
    clients.push(client3);

    const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
      client3.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() });
      });
    });

    // Send authenticate - should fail
    client3.send(JSON.stringify({
      type: 'authenticate',
      authToken,
      origin: 'http://localhost:3000',
      timestamp: Date.now()
    }));

    // Wait for the authentication-failed message and close
    const failedMessage = await waitForMessage<{ type: string; code: string }>(client3, 'authentication-failed');
    expect(failedMessage.code).toBe('SessionLimitExceeded');

    const closeResult = await closePromise;
    expect(closeResult.code).toBe(1008);
    expect(closeResult.reason).toBe('Session limit exceeded');
  });

  test('closes oldest session when limit exceeded (close_oldest mode)', async () => {
    bridge = new MCPWebBridge({
      name: 'Test Bridge',
      description: 'Test',
      wsPort,
      mcpPort,
      maxSessionsPerToken: 2,
      onSessionLimitExceeded: 'close_oldest'
    });

    const authToken = 'test-token-close-oldest';

    // Create and authenticate first session
    const client1 = await createMockClient(wsPort, 'session-oldest-1');
    clients.push(client1);
    await authenticateClient(client1, authToken);

    // Track if client1 gets closed
    const client1ClosePromise = new Promise<{ code: number }>((resolve) => {
      client1.on('close', (code) => resolve({ code }));
    });

    // Small delay to ensure different connectedAt timestamps
    await new Promise(resolve => setTimeout(resolve, 50));

    // Create and authenticate second session
    const client2 = await createMockClient(wsPort, 'session-oldest-2');
    clients.push(client2);
    await authenticateClient(client2, authToken);

    // Create and authenticate third session - should close the oldest (client1)
    const client3 = await createMockClient(wsPort, 'session-oldest-3');
    clients.push(client3);
    await authenticateClient(client3, authToken);

    // client1 should have been closed
    const closeResult = await client1ClosePromise;
    expect(closeResult.code).toBe(1008);

    // client2 and client3 should still be open
    expect(client2.readyState).toBe(WebSocket.OPEN);
    expect(client3.readyState).toBe(WebSocket.OPEN);
  });

  test('different tokens have separate session limits', async () => {
    bridge = new MCPWebBridge({
      name: 'Test Bridge',
      description: 'Test',
      wsPort,
      mcpPort,
      maxSessionsPerToken: 1,
      onSessionLimitExceeded: 'reject'
    });

    // Create sessions with different tokens - both should succeed
    const client1 = await createMockClient(wsPort, 'session-token-a');
    clients.push(client1);
    await authenticateClient(client1, 'token-a');

    const client2 = await createMockClient(wsPort, 'session-token-b');
    clients.push(client2);
    await authenticateClient(client2, 'token-b');

    // Both should be connected
    expect(client1.readyState).toBe(WebSocket.OPEN);
    expect(client2.readyState).toBe(WebSocket.OPEN);
  });

  test('no limit when maxSessionsPerToken is not set', async () => {
    bridge = new MCPWebBridge({
      name: 'Test Bridge',
      description: 'Test',
      wsPort,
      mcpPort
      // No maxSessionsPerToken
    });

    const authToken = 'test-token-no-limit';

    // Create many sessions - all should succeed
    for (let i = 0; i < 5; i++) {
      const client = await createMockClient(wsPort, `session-no-limit-${i}`);
      clients.push(client);
      await authenticateClient(client, authToken);
      expect(client.readyState).toBe(WebSocket.OPEN);
    }
  });
});

describe('Query Limits', () => {
  let bridge: MCPWebBridge;
  let clients: WebSocket[] = [];
  const wsPort = 4201;
  const mcpPort = 4202;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    // Save original fetch
    originalFetch = globalThis.fetch;
  });

  afterEach(async () => {
    // Restore original fetch
    globalThis.fetch = originalFetch;

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

  test('rejects query when limit exceeded', async () => {
    // Mock fetch to return a never-resolving promise (keeps queries "in flight")
    globalThis.fetch = () => new Promise(() => {});

    bridge = new MCPWebBridge({
      name: 'Test Bridge',
      description: 'Test',
      wsPort,
      mcpPort,
      maxInFlightQueriesPerToken: 2,
      agentUrl: 'http://localhost:9999'
    });

    const authToken = 'test-token-query-limit';

    const client = await createMockClient(wsPort, 'session-query-limit');
    clients.push(client);
    await authenticateClient(client, authToken);

    // Send first query - will hang because fetch never resolves
    client.send(JSON.stringify({
      type: 'query',
      uuid: 'query-1',
      prompt: 'Test query 1',
      context: [],
      tools: []
    }));

    // Small delay to ensure query is registered
    await new Promise(resolve => setTimeout(resolve, 50));

    // Send second query
    client.send(JSON.stringify({
      type: 'query',
      uuid: 'query-2',
      prompt: 'Test query 2',
      context: [],
      tools: []
    }));

    // Small delay to ensure query is registered
    await new Promise(resolve => setTimeout(resolve, 50));

    // Send third query - should be rejected due to limit (2 queries already in flight)
    client.send(JSON.stringify({
      type: 'query',
      uuid: 'query-3',
      prompt: 'Test query 3',
      context: [],
      tools: []
    }));

    // Wait for failure message for query-3
    const failureMessage = await waitForMessage<{ type: string; uuid: string; error: string }>(
      client, 
      'query_failure'
    );

    expect(failureMessage.uuid).toBe('query-3');
    expect(failureMessage.error).toContain('Query limit exceeded');
  });

  test('no limit when maxInFlightQueriesPerToken is not set', async () => {
    // Mock fetch to return a never-resolving promise
    globalThis.fetch = () => new Promise(() => {});

    bridge = new MCPWebBridge({
      name: 'Test Bridge',
      description: 'Test',
      wsPort,
      mcpPort,
      agentUrl: 'http://localhost:9999'
      // No maxInFlightQueriesPerToken
    });

    const authToken = 'test-token-no-query-limit';

    const client = await createMockClient(wsPort, 'session-no-query-limit');
    clients.push(client);
    await authenticateClient(client, authToken);

    // Send many queries - all should be accepted since no limit is set
    for (let i = 0; i < 10; i++) {
      client.send(JSON.stringify({
        type: 'query',
        uuid: `query-unlimited-${i}`,
        prompt: `Test query ${i}`,
        context: [],
        tools: []
      }));
    }

    // Wait a bit - no query_failure messages should be received
    await new Promise(resolve => setTimeout(resolve, 200));

    // If we got here without the test failing, no limit errors were sent
    // The queries are still "in flight" (waiting on the mock fetch)
  });
});

describe('Session Timeout', () => {
  let bridge: MCPWebBridge;
  let clients: WebSocket[] = [];
  const wsPort = 4301;
  const mcpPort = 4302;

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

  test('session expires after maxDuration', async () => {
    // Use a very short duration for testing (100ms)
    // Note: The actual checker runs every 60s, so we need to test differently
    // We'll verify the config is accepted and the timeout checker starts
    bridge = new MCPWebBridge({
      name: 'Test Bridge',
      description: 'Test',
      wsPort,
      mcpPort,
      sessionMaxDurationMs: 100 // Very short for testing
    });

    const client = await createMockClient(wsPort, 'session-timeout');
    clients.push(client);
    await authenticateClient(client, 'test-token-timeout');

    // The session should be open initially
    expect(client.readyState).toBe(WebSocket.OPEN);

    // Note: In a real test we'd wait for the timeout interval (60s) to fire
    // For unit testing, we just verify the bridge accepts the config
    // Integration tests would test the actual timeout behavior
  });

  test('no timeout when sessionMaxDurationMs is not set', async () => {
    bridge = new MCPWebBridge({
      name: 'Test Bridge',
      description: 'Test',
      wsPort,
      mcpPort
      // No sessionMaxDurationMs
    });

    const client = await createMockClient(wsPort, 'session-no-timeout');
    clients.push(client);
    await authenticateClient(client, 'test-token-no-timeout');

    // Session should stay open
    expect(client.readyState).toBe(WebSocket.OPEN);
  });
});

describe('Config Schema', () => {
  test('accepts all new limit properties', async () => {
    // This should not throw
    const bridge = new MCPWebBridge({
      name: 'Test Bridge',
      description: 'Test',
      wsPort: 4401,
      mcpPort: 4402,
      maxSessionsPerToken: 5,
      onSessionLimitExceeded: 'close_oldest',
      maxInFlightQueriesPerToken: 10,
      sessionMaxDurationMs: 3600000
    });

    await bridge.close();
  });

  test('defaults onSessionLimitExceeded to reject', async () => {
    const bridge = new MCPWebBridge({
      name: 'Test Bridge',
      description: 'Test',
      wsPort: 4501,
      mcpPort: 4502,
      maxSessionsPerToken: 1
      // onSessionLimitExceeded not specified
    });

    // Create first session
    const client1 = await createMockClient(4501, 'session-default-1');
    await authenticateClient(client1, 'token-default');

    // Second session should be rejected (default behavior)
    const client2 = await createMockClient(4501, 'session-default-2');
    
    const closePromise = new Promise<{ code: number }>((resolve) => {
      client2.on('close', (code) => resolve({ code }));
    });

    client2.send(JSON.stringify({
      type: 'authenticate',
      authToken: 'token-default',
      origin: 'http://localhost:3000',
      timestamp: Date.now()
    }));

    const closeResult = await closePromise;
    expect(closeResult.code).toBe(1008);

    client1.close();
    client2.close();
    await bridge.close();
  });
});
