/**
 * Query-flow tests for the Cloudflare adapter.
 *
 * Agent callbacks land on `/query/:uuid/*` carrying only a uuid, so the router
 * cannot derive a room from an auth token the way it does for MCP requests.
 * These tests cover that path: the Durable Object records the uuid in the query
 * index when the query starts, and the router reads it back to route the
 * agent's progress and completion callbacks to the same object.
 */

import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test';
import type { MCPWebClient, MCPWebClientConfig } from '@mcp-web/client';
import { MCPWeb } from '@mcp-web/core';
import { deriveRoomId, type Query, type Tool } from '@mcp-web/types';
import { z } from 'zod';
import { startWorker } from '../helpers/cloudflare/start-worker';
import { MockAgentServer } from '../helpers/mock-agent';

const PORT = 3892;
const AGENT_PORT = 3893;
const BRIDGE_URL = `localhost:${PORT}`;

let worker: Awaited<ReturnType<typeof startWorker>> | undefined;
let mcpWeb: MCPWeb | undefined;
let agent: MockAgentServer | undefined;

const webConfig = {
  name: 'test',
  description: 'Cloudflare query test',
  bridgeUrl: BRIDGE_URL,
  persistAuthToken: false,
  autoConnect: false,
  agentUrl: `localhost:${AGENT_PORT}`,
};

const clientConfig: MCPWebClientConfig = {
  serverUrl: `http://${BRIDGE_URL}`,
};

beforeAll(async () => {
  worker = await startWorker({
    port: PORT,
    vars: { AGENT_URL: `http://localhost:${AGENT_PORT}` },
  });
}, 120_000);

afterEach(async () => {
  mcpWeb?.disconnect();
  mcpWeb = undefined;
  if (agent) {
    await agent.stop();
    agent = undefined;
  }
});

afterAll(async () => {
  await worker?.stop();
}, 30_000);

test('agent progress and completion callbacks route back to the session', async () => {
  const queryHandler = async (client: MCPWebClient) => {
    await client.sendProgress('Working on it');
    await client.complete('All done');
  };

  agent = new MockAgentServer(clientConfig, queryHandler, AGENT_PORT);

  mcpWeb = new MCPWeb({ ...webConfig, authToken: 'cf-query-token' });
  await mcpWeb.connect();

  const response = mcpWeb.query({ prompt: 'Do the thing' });
  const events: string[] = [];

  for await (const event of response.stream) {
    events.push(event.type);
    if (event.type === 'query_complete' || event.type === 'query_failure')
      break;
  }

  expect(events).toEqual([
    'query_accepted',
    'query_progress',
    'query_complete',
  ]);
});

test('an agent can call session tools while handling a query', async () => {
  const queryHandler = async (client: MCPWebClient) => {
    const tools = await client.listTools();
    const echo = tools.tools.find((tool) => tool.name === 'echo');
    if (!echo) throw new Error('echo tool missing from contextualized list');

    const result = await client.callTool('echo', { value: 'hello' });
    const text =
      result.content[0]?.type === 'text' ? result.content[0].text : '';
    await client.complete(text);
  };

  agent = new MockAgentServer(clientConfig, queryHandler, AGENT_PORT);

  mcpWeb = new MCPWeb({ ...webConfig, authToken: 'cf-query-tools-token' });
  mcpWeb.addTool({
    name: 'echo',
    description: 'Echoes its input',
    inputSchema: z.object({ value: z.string() }),
    outputSchema: z.string(),
    handler: ({ value }) => value,
  });
  await mcpWeb.connect();

  const response = mcpWeb.query({ prompt: 'Echo hello' });
  let completion: string | undefined;

  for await (const event of response.stream) {
    if (event.type === 'query_complete') {
      completion = (event as { message?: string }).message;
      break;
    }
    if (event.type === 'query_failure') {
      throw new Error(`Query failed: ${JSON.stringify(event)}`);
    }
  }

  expect(completion).toBe('hello');
});

test('a callback for an unknown query is rejected', async () => {
  const response = await fetch(
    `http://${BRIDGE_URL}/query/00000000-0000-4000-8000-000000000000/progress`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'orphan' }),
    },
  );

  expect(response.status).toBe(404);
});

test('the tool schema a query sees matches the registered tool', async () => {
  let listed: Tool | undefined;
  let queried: Query | undefined;

  agent = new MockAgentServer(
    clientConfig,
    async (client, query) => {
      queried = query;
      listed = (await client.listTools()).tools.find(
        (tool) => tool.name === 'greet',
      );
      await client.complete('inspected');
    },
    AGENT_PORT,
  );

  mcpWeb = new MCPWeb({ ...webConfig, authToken: 'cf-query-schema-token' });
  mcpWeb.addTool({
    name: 'greet',
    description: 'Greets someone',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.string(),
    handler: ({ name }) => `hi ${name}`,
  });
  await mcpWeb.connect();

  const response = mcpWeb.query({ prompt: 'Inspect tools' });

  for await (const event of response.stream) {
    if (event.type === 'query_complete') break;
    if (event.type === 'query_failure')
      throw new Error(`Query failed: ${JSON.stringify(event)}`);
  }

  expect(queried?.prompt).toBe('Inspect tools');
  expect(listed?.description).toBe('Greets someone');
  // The bridge adds `session_id` to every exposed tool, so this checks the
  // registered schema survived rather than the exact property set.
  expect(listed?.inputSchema?.properties).toHaveProperty('name', {
    type: 'string',
  });
  expect(listed?.inputSchema?.required).toContain('name');
});

/** Opens a raw authenticated socket, so the test can choose its own query id. */
async function authenticatedSocket(authToken: string): Promise<WebSocket> {
  const room = await deriveRoomId(authToken);
  const socket = new WebSocket(
    `ws://${BRIDGE_URL}/?session=${crypto.randomUUID()}&room=${room}`,
  );

  await new Promise((resolve) => socket.addEventListener('open', resolve));
  const authenticated = nextMessage(socket, 'authenticated');

  socket.send(
    JSON.stringify({
      type: 'authenticate',
      authToken,
      origin: `http://${BRIDGE_URL}`,
      pageTitle: 'Test',
      userAgent: 'test',
      timestamp: Date.now(),
    }),
  );
  await authenticated;

  return socket;
}

function nextMessage(
  socket: WebSocket,
  type: string,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for ${type}`)),
      5_000,
    );
    const handler = (event: MessageEvent) => {
      const message = JSON.parse(String(event.data));
      if (message.type !== type) return;
      clearTimeout(timer);
      socket.removeEventListener('message', handler);
      resolve(message);
    };
    socket.addEventListener('message', handler);
  });
}

test('a query id already routed to another room is refused', async () => {
  agent = new MockAgentServer(
    clientConfig,
    async (client) => {
      await client.complete('done');
    },
    AGENT_PORT,
  );

  const uuid = '11111111-2222-4333-8444-555555555555';
  const query = (prompt: string) =>
    JSON.stringify({ type: 'query', uuid, prompt, context: [], tools: [] });

  const owner = await authenticatedSocket('cf-conflict-owner');
  const accepted = nextMessage(owner, 'query_accepted');
  owner.send(query('first'));
  await accepted;

  // A different token means a different object, so only the index can tell
  // that this uuid is already spoken for.
  const other = await authenticatedSocket('cf-conflict-other');
  const failure = nextMessage(other, 'query_failure');
  other.send(query('second'));

  expect((await failure).error).toContain('already in use');

  owner.close();
  other.close();
}, 20_000);
