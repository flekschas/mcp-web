import { afterAll, beforeAll, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCPWebClient, type MCPWebClientConfig, type TextContent } from '@mcp-web/client';
import { MCPWeb } from '@mcp-web/core';
import {
  type MCPWebConfig,
  SessionNameAlreadyInUseErrorCode,
} from '@mcp-web/types';
import { z } from 'zod';
import { killProcess } from '../helpers/kill-process';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Single port for both WebSocket and HTTP (new architecture)
const BRIDGE_PORT = 3001;

const mcpWebConfig = {
  name: 'test',
  description: 'Test',
  bridgeUrl: `localhost:${BRIDGE_PORT}`,
  persistAuthToken: false,
  autoConnect: false,
} satisfies MCPWebConfig;

const mcpWebClientConfig: MCPWebClientConfig = {
  serverUrl: `http://${mcpWebConfig.bridgeUrl}`,
};

let bridgeProcess: ReturnType<typeof spawn> | undefined;

// Start bridge as separate process using Bun
const spawnBridge = () => spawn(
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

beforeAll(async () => {
  bridgeProcess = spawnBridge();

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

// ============================================================================
// Session Naming — Integration Tests
// ============================================================================

test('Named sessions appear with session_name in list_sessions', async () => {
  const authToken = 'session-naming-list-test';

  const mcpWeb1 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    sessionName: 'Game 1',
  });

  mcpWeb1.addTool({
    name: 'move_piece_1',
    description: 'Move a checker piece',
    inputSchema: z.object({ from: z.string(), to: z.string() }),
    outputSchema: z.object({ moved: z.string() }),
    handler: ({ from, to }) => ({ moved: `${from} -> ${to}` }),
  });

  await mcpWeb1.connect();

  const mcpWeb2 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    sessionName: 'Game 2',
  });

  mcpWeb2.addTool({
    name: 'move_piece_2',
    description: 'Move a checker piece',
    inputSchema: z.object({ from: z.string(), to: z.string() }),
    outputSchema: z.object({ moved: z.string() }),
    handler: ({ from, to }) => ({ moved: `${from} -> ${to}` }),
  });

  await mcpWeb2.connect();

  // Give tools time to register
  await new Promise(resolve => setTimeout(resolve, 100));

  const client = new MCPWebClient({
    ...mcpWebClientConfig,
    authToken,
  });

  // Call list_sessions to verify names are included
  const listResult = await client.callTool('list_sessions');
  const sessions = JSON.parse((listResult.content[0] as TextContent).text).sessions;

  expect(sessions).toHaveLength(2);

  const session1 = sessions.find((s: { session_name: string }) => s.session_name === 'Game 1');
  const session2 = sessions.find((s: { session_name: string }) => s.session_name === 'Game 2');

  expect(session1).toBeDefined();
  expect(session1.session_id).toBe(mcpWeb1.sessionId);
  expect(session1.available_tools).toContain('move_piece_1');

  expect(session2).toBeDefined();
  expect(session2.session_id).toBe(mcpWeb2.sessionId);
  expect(session2.available_tools).toContain('move_piece_2');

  mcpWeb1.disconnect();
  mcpWeb2.disconnect();
});

test('Duplicate session name under same token is rejected by connect()', async () => {
  const authToken = 'session-naming-dup-test';

  const mcpWeb1 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    sessionName: 'Game 1',
  });

  await mcpWeb1.connect();
  expect(mcpWeb1.connected).toBe(true);

  // Second MCPWeb with same name under same token should fail
  const mcpWeb2 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    sessionName: 'Game 1',
  });

  let connectError: Error | null = null;
  try {
    await mcpWeb2.connect();
  } catch (error) {
    connectError = error as Error;
  }

  expect(connectError).not.toBeNull();
  expect(connectError!.message).toContain('Game 1');
  expect(mcpWeb2.connected).toBe(false);

  // First session should still be connected
  expect(mcpWeb1.connected).toBe(true);

  mcpWeb1.disconnect();
  mcpWeb2.disconnect();
});

test('Same session name under different tokens works', async () => {
  const mcpWeb1 = new MCPWeb({
    ...mcpWebConfig,
    authToken: 'session-naming-cross-token-a',
    sessionName: 'Game 1',
  });

  await mcpWeb1.connect();
  expect(mcpWeb1.connected).toBe(true);

  const mcpWeb2 = new MCPWeb({
    ...mcpWebConfig,
    authToken: 'session-naming-cross-token-b',
    sessionName: 'Game 1',
  });

  await mcpWeb2.connect();
  expect(mcpWeb2.connected).toBe(true);

  mcpWeb1.disconnect();
  mcpWeb2.disconnect();
});

test('Auth failure does not trigger reconnect loop', async () => {
  const authToken = 'session-naming-no-reconnect-test';

  // First instance claims the name
  const mcpWeb1 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    sessionName: 'Sole Game',
  });
  await mcpWeb1.connect();

  // Second instance with same name should fail and NOT reconnect
  const mcpWeb2 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    sessionName: 'Sole Game',
  });

  let connectError: Error | null = null;
  try {
    await mcpWeb2.connect();
  } catch (error) {
    connectError = error as Error;
  }

  expect(connectError).not.toBeNull();

  // Wait a bit to ensure no reconnect attempt happens
  // (If reconnect was triggered, mcpWeb2.connected would become true after reconnect,
  // but since the name is still taken, it would fail again — creating a loop)
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Should still be disconnected — no reconnect loop
  expect(mcpWeb2.connected).toBe(false);

  mcpWeb1.disconnect();
  mcpWeb2.disconnect();
});

test('Session name can be reused after original session disconnects', async () => {
  const authToken = 'session-naming-reuse-test';

  const mcpWeb1 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    sessionName: 'Reusable Game',
  });

  await mcpWeb1.connect();
  expect(mcpWeb1.connected).toBe(true);

  // Disconnect first instance
  mcpWeb1.disconnect();

  // Wait for bridge to process the disconnect
  await new Promise(resolve => setTimeout(resolve, 200));

  // New instance should be able to use the same name
  const mcpWeb2 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
    sessionName: 'Reusable Game',
  });

  await mcpWeb2.connect();
  expect(mcpWeb2.connected).toBe(true);

  mcpWeb2.disconnect();
});

test('Session IDs are unique across MCPWeb instances (no localStorage collision)', async () => {
  const authToken = 'session-naming-unique-ids-test';

  const mcpWeb1 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
  });

  const mcpWeb2 = new MCPWeb({
    ...mcpWebConfig,
    authToken,
  });

  // Session IDs should always be unique UUIDs
  expect(mcpWeb1.sessionId).not.toBe(mcpWeb2.sessionId);

  // Both should be valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  expect(mcpWeb1.sessionId).toMatch(uuidRegex);
  expect(mcpWeb2.sessionId).toMatch(uuidRegex);
});
