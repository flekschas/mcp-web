import { afterEach, expect, test } from 'bun:test';
import { type ChildProcess, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCPWeb } from '@mcp-web/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { killProcess } from '../helpers/kill-process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_CLI = join(__dirname, '../../packages/client/dist/standalone.js');

let bridgeProcess: ChildProcess | undefined;
let host: Client | undefined;
let mcpWeb: MCPWeb | undefined;

afterEach(async () => {
  mcpWeb?.disconnect();
  await host?.close();
  if (bridgeProcess) await killProcess(bridgeProcess);
  mcpWeb = undefined;
  host = undefined;
  bridgeProcess = undefined;
});

async function startBridge(port: number) {
  bridgeProcess = spawn(
    'bun',
    ['run', join(__dirname, '../helpers/start-bridge.ts')],
    {
      env: { ...process.env, PORT: port.toString() },
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  );
  await new Promise<void>((resolve) => {
    bridgeProcess?.stderr?.on('data', (data) => {
      if (data.toString().includes('[Bridge] Ready')) resolve();
    });
  });
}

/** Runs the stdio client CLI the way an MCP host like Claude Desktop does. */
async function connectHost(serverUrl: string, authToken: string) {
  const client = new Client({ name: 'test-host', version: '1.0.0' });
  let unseenCount = 0;
  let notify: (() => void) | undefined;
  client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
    if (notify) notify();
    else unseenCount++;
  });
  const resourceListChanged = new Promise<void>((resolve) => {
    client.setNotificationHandler(ResourceListChangedNotificationSchema, () =>
      resolve(),
    );
  });
  await client.connect(
    new StdioClientTransport({
      command: 'node',
      args: [CLIENT_CLI],
      env: {
        ...(process.env as Record<string, string>),
        MCP_SERVER_URL: serverUrl,
        AUTH_TOKEN: authToken,
      },
      stderr: 'ignore',
    }),
  );
  host = client;

  /**
   * Resolves `true` on the next list_changed notification, including one that
   * arrived since the previous call.
   */
  const nextListChanged = (timeoutMs = 5000) =>
    new Promise<boolean>((resolve) => {
      if (unseenCount > 0) {
        unseenCount--;
        resolve(true);
        return;
      }
      const timer = setTimeout(() => {
        notify = undefined;
        resolve(false);
      }, timeoutMs);
      notify = () => {
        notify = undefined;
        clearTimeout(timer);
        resolve(true);
      };
    });

  return { client, nextListChanged, resourceListChanged };
}

async function connectFrontend(port: number, authToken: string) {
  mcpWeb = new MCPWeb({
    name: 'test',
    description: 'Test',
    bridgeUrl: `localhost:${port}`,
    authToken,
    persistAuthToken: false,
    autoConnect: false,
  });
  await mcpWeb.connect();
  return mcpWeb;
}

function addTool(frontend: MCPWeb, name: string) {
  frontend.addTool({
    name,
    description: `Tool ${name}`,
    handler: () => ({ ok: true }),
  });
}

test('stdio client forwards tools/list_changed when a frontend adds a tool', async () => {
  const port = 3061;
  const authToken = 'list-changed-token';
  await startBridge(port);
  const { client, nextListChanged, resourceListChanged } = await connectHost(
    `http://localhost:${port}`,
    authToken,
  );

  // The client notifies about tools and resources once its bridge stream
  // opens, so a change made before that is not missed.
  expect(await nextListChanged()).toBe(true);
  await resourceListChanged;

  const frontend = await connectFrontend(port, authToken);
  const notified = nextListChanged();
  addTool(frontend, 'added_later');
  expect(await notified).toBe(true);

  const { tools } = await client.listTools();
  expect(tools.map((tool) => tool.name)).toContain('added_later');
});

test('stdio client picks up tools once the bridge starts after it', async () => {
  const port = 3062;
  const authToken = 'late-bridge-token';
  const { client, nextListChanged } = await connectHost(
    `ws://localhost:${port}`,
    authToken,
  );

  // Connecting to the late bridge counts as a tool change.
  const notified = nextListChanged(10_000);
  await startBridge(port);
  expect(await notified).toBe(true);

  const frontendNotified = nextListChanged();
  const frontend = await connectFrontend(port, authToken);
  addTool(frontend, 'late_tool');
  expect(await frontendNotified).toBe(true);

  const { tools } = await client.listTools();
  expect(tools.map((tool) => tool.name)).toContain('late_tool');
}, 20_000);

test('stdio client exits when the host closes stdin', async () => {
  const port = 3063;
  await startBridge(port);
  const child = spawn('node', [CLIENT_CLI], {
    env: {
      ...process.env,
      MCP_SERVER_URL: `http://localhost:${port}`,
      AUTH_TOKEN: 'exit-token',
    },
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  const exited = new Promise<void>((resolve) =>
    child.once('exit', () => resolve()),
  );

  try {
    const send = (message: object) =>
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
    const streamOpened = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('The bridge stream did not open within 5s')),
        5000,
      );
      child.stdout.on('data', (data: Buffer) => {
        if (data.toString().includes('notifications/tools/list_changed')) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.once('exit', () => {
        clearTimeout(timer);
        reject(new Error('The client exited before the stream opened'));
      });
    });
    send({
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'test-host', version: '1.0.0' },
      },
    });
    send({ method: 'notifications/initialized' });
    // A repeated notification must not start a second stream that outlives
    // stdin.
    send({ method: 'notifications/initialized' });
    await streamOpened;

    child.stdin.end();
    const didExit = await Promise.race([
      exited.then(() => true),
      Bun.sleep(2000).then(() => false),
    ]);
    expect(didExit).toBe(true);
  } finally {
    if (child.exitCode === null) await killProcess(child);
  }
}, 10_000);
