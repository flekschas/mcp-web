import { expect, test } from 'bun:test';
import { MCPWebClient } from './client.ts';

// Store original fetch for tests that need to mock it
const originalFetch = globalThis.fetch;

test('MCPWebClient initializes with config', () => {
  const client = new MCPWebClient({
    serverUrl: 'http://localhost:3002',
  });

  expect(client).toBeDefined();
});

test('contextualize creates new client instance with query', () => {
  const client = new MCPWebClient({
    serverUrl: 'http://localhost:3002',
  });

  const query = {
    uuid: 'test-query-123',
    prompt: 'Test prompt',
    context: [],
  };

  const contextClient = client.contextualize(query);

  expect(contextClient).toBeDefined();
  expect(contextClient !== client).toBe(true);
});

test('callTool validates restrictTools', async () => {
  const client = new MCPWebClient({
    serverUrl: 'http://localhost:3002',
  });

  const query = {
    uuid: 'test-query',
    prompt: 'test',
    context: [],
    tools: [
      {
        name: 'allowed-tool',
        description: 'Allowed tool',
        handler: () => {},
      },
    ],
    restrictTools: true,
  };

  const contextClient = client.contextualize(query);

  // Should throw when calling a tool not in the allowed list
  await expect(async () => {
    await contextClient.callTool('forbidden-tool', {});
  }).toThrow('not allowed');
});

test('callTool allows tools when restrictTools is false', async () => {
  // Mock fetch to return success - Deno has native fetch!
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { data: 'success' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new MCPWebClient({
    serverUrl: 'http://localhost:3002',
  });

  const query = {
    uuid: 'test-query',
    prompt: 'test',
    context: [],
    tools: [
      {
        name: 'allowed-tool',
        description: 'Allowed tool',
        handler: () => {},
      },
    ],
    restrictTools: false, // Not restricting tools
  };

  const contextClient = client.contextualize(query);

  // Should succeed even with forbidden tool
  const result = await contextClient.callTool('any-tool', {});
  expect(result).toBeDefined();

  globalThis.fetch = originalFetch;
});

test('callTool includes query context in request', async () => {
  let capturedBody: unknown;

  // Mock fetch and capture the request body
  globalThis.fetch = async (input: Request | URL | string, init?: RequestInit) => {
    // Capture the body from init if it's a string
    if (init && typeof init.body === 'string') {
      capturedBody = JSON.parse(init.body);
    } else if (input instanceof Request) {
      // If input is a Request object, clone and read it
      capturedBody = await input.clone().json();
    }

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { data: 'success' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new MCPWebClient({
    serverUrl: 'http://localhost:3002',
  });

  const query = {
    uuid: 'test-query-123',
    prompt: 'test',
    context: [],
  };

  const contextClient = client.contextualize(query);
  await contextClient.callTool('test_tool', { arg: 'value' });

  // Verify _queryContext was included in request body
  expect(capturedBody).toBeDefined();
  const requestBody = capturedBody as Record<string, unknown>;
  expect(requestBody.params).toBeDefined();
  const params = requestBody.params as Record<string, unknown>;
  expect(params._queryContext).toBeDefined();
  const queryContext = params._queryContext as Record<string, unknown>;
  expect(queryContext.queryId).toBe('test-query-123');

  globalThis.fetch = originalFetch;
});

test('listTools returns query tools when available', async () => {
  const client = new MCPWebClient({
    serverUrl: 'http://localhost:3002',
  });

  const query = {
    uuid: 'test-query',
    prompt: 'test',
    context: [],
    tools: [
      {
        name: 'tool1',
        description: 'Tool 1',
        handler: () => {},
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'tool2',
        description: 'Tool 2',
        handler: () => {},
      },
    ],
  };

  const contextClient = client.contextualize(query);
  const result = await contextClient.listTools();

  expect(result.tools.length).toBe(2);
  expect(result.tools[0].name).toBe('tool1');
  expect(result.tools[1].name).toBe('tool2');
});

test('complete marks query as completed and prevents further calls', async () => {
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({}), { status: 200 });
  };

  const client = new MCPWebClient({
    serverUrl: 'http://localhost:3002',
  });

  const query = {
    uuid: 'test-query',
    prompt: 'test',
    context: [],
  };

  const contextClient = client.contextualize(query);

  // Complete the query
  await contextClient.complete('Done!');

  // Should throw when trying to call tools after completion
  await expect(async () => {
    await contextClient.callTool('test_tool', {});
  }).toThrow('Cannot call tools on a completed query');

  // Should throw when trying to complete again
  await expect(async () => {
    await contextClient.complete('Done again!');
  }).toThrow('already completed');

  globalThis.fetch = originalFetch;
});

test('sendProgress throws on non-contextualized client', async () => {
  const client = new MCPWebClient({
    serverUrl: 'http://localhost:3002',
  });

  await expect(async () => {
    await client.sendProgress('test');
  }).toThrow('can only be called on a contextualized client');
});

test('complete throws on non-contextualized client', async () => {
  const client = new MCPWebClient({
    serverUrl: 'http://localhost:3002',
  });

  await expect(async () => {
    await client.complete('test');
  }).toThrow('can only be called on a contextualized client');
});

test('fail marks query as failed and prevents further operations', async () => {
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({}), { status: 200 });
  };

  const client = new MCPWebClient({
    serverUrl: 'http://localhost:3002',
  });

  const query = {
    uuid: 'test-query',
    prompt: 'test',
    context: [],
  };

  const contextClient = client.contextualize(query);

  // Fail the query
  await contextClient.fail('Something went wrong');

  // Should throw when trying to call tools after failure
  await expect(async () => {
    await contextClient.callTool('test_tool', {});
  }).toThrow('Cannot call tools on a completed query');

  globalThis.fetch = originalFetch;
});
