import { afterAll, beforeAll, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCPWebClient } from '@mcp-web/client';
import { MCPWeb } from '@mcp-web/core';
import type { ElicitationRequest, MCPWebConfig } from '@mcp-web/types';
import { z } from 'zod';
import { killProcess } from '../helpers/kill-process';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BRIDGE_PORT = 3061;

const mcpWebConfig = {
  name: 'test',
  description: 'Test',
  bridgeUrl: `localhost:${BRIDGE_PORT}`,
  persistAuthToken: false,
  autoConnect: false,
} satisfies MCPWebConfig;

let bridgeProcess: ReturnType<typeof spawn> | undefined;

beforeAll(async () => {
  bridgeProcess = spawn(
    'bun',
    ['run', join(__dirname, '../helpers/start-bridge.ts')],
    {
      env: { ...process.env, PORT: BRIDGE_PORT.toString() },
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  );
  await new Promise<void>((resolve) => {
    bridgeProcess?.stderr?.on('data', (data) => {
      if (data.toString().includes('[Bridge] Ready')) resolve();
    });
  });
});

afterAll(async () => {
  if (bridgeProcess) await killProcess(bridgeProcess);
});

/** Connects a page with a greeting tool that asks for the language. */
async function connectPage(authToken: string) {
  const mcpWeb = new MCPWeb({ ...mcpWebConfig, authToken });
  mcpWeb.addTool({
    name: 'get_greeting',
    description: 'Greet the user in their language',
    outputSchema: z.object({ greeting: z.string() }),
    handler: async (_input, { elicit }) => {
      const language = await elicit('Which language?', ['English', 'German']);
      if (!language) return { greeting: '…' };
      return { greeting: language === 'German' ? 'Hallo!' : 'Hello!' };
    },
  });
  await mcpWeb.connect();
  const client = new MCPWebClient({
    serverUrl: `http://${mcpWebConfig.bridgeUrl}`,
    authToken,
  });
  return { mcpWeb, client };
}

const textOf = (result: unknown) =>
  (result as { content: { text: string }[] }).content[0].text;

test('the page answers a question in the middle of a tool call', async () => {
  const { mcpWeb, client } = await connectPage('elicitation-answer');
  const requests: ElicitationRequest[] = [];
  mcpWeb.onElicit((request) => {
    requests.push(request);
    return { action: 'accept', content: { choice: 'German' } };
  });

  const result = await client.callTool('get_greeting', {});

  expect(JSON.parse(textOf(result))).toEqual({ greeting: 'Hallo!' });
  expect(requests).toEqual([
    {
      message: 'Which language?',
      requestedSchema: {
        type: 'object',
        properties: { choice: { type: 'string', enum: ['English', 'German'] } },
        required: ['choice'],
      },
    },
  ]);
  mcpWeb.disconnect();
});

test('the latest handler answers, and a declined question is undefined', async () => {
  const { mcpWeb, client } = await connectPage('elicitation-decline');
  mcpWeb.onElicit(() => ({ action: 'accept', content: { choice: 'German' } }));
  const removeHandler = mcpWeb.onElicit(() => ({ action: 'decline' }));

  expect(JSON.parse(textOf(await client.callTool('get_greeting', {})))).toEqual(
    {
      greeting: '…',
    },
  );

  removeHandler();
  expect(JSON.parse(textOf(await client.callTool('get_greeting', {})))).toEqual(
    {
      greeting: 'Hallo!',
    },
  );
  mcpWeb.disconnect();
});

test('the tool call fails when the page has no way to ask', async () => {
  const { mcpWeb, client } = await connectPage('elicitation-no-handler');

  const result = await client.callTool('get_greeting', {});

  expect(textOf(result)).toContain('there is no way to ask the user');
  mcpWeb.disconnect();
});

test('a question closes when the client stops waiting, and a late yes changes nothing', async () => {
  const authToken = 'elicitation-client-timeout';
  const mcpWeb = new MCPWeb({ ...mcpWebConfig, authToken });
  let saved = false;
  let finished = () => {};
  const handlerDone = new Promise<void>((resolve) => {
    finished = resolve;
  });
  mcpWeb.addTool({
    name: 'save_note',
    description: 'Save a note after asking the user',
    handler: async (_input, { elicit }) => {
      try {
        if (await elicit('Save the note?')) saved = true;
      } finally {
        finished();
      }
    },
  });
  // The user says yes only after the question closed.
  mcpWeb.onElicit(
    (_request, { signal }) =>
      new Promise((resolve) => {
        signal.addEventListener('abort', () =>
          resolve({ action: 'accept', content: {} }),
        );
      }),
  );
  await mcpWeb.connect();
  const client = new MCPWebClient({
    serverUrl: `http://${mcpWebConfig.bridgeUrl}`,
    authToken,
    timeout: 300,
  });

  const result = await client.callTool('save_note', {});

  expect(textOf(result)).toContain('Request timeout');
  await handlerDone;
  expect(saved).toBe(false);
  mcpWeb.disconnect();
});
