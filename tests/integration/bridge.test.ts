import { afterAll, beforeAll, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCPWebClient, type MCPWebClientConfig } from '@mcp-web/client';
import {
  type MCPWebConfig,
  MissingAuthenticationErrorCode,
} from '@mcp-web/types';
import { MCPWeb } from '@mcp-web/web';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mcpWebConfig = {
  name: 'test',
  description: 'Test ',
  host: 'localhost',
  wsPort: 3001,
  mcpPort: 3002,
  persistAuthToken: false,
  autoConnect: false,
} satisfies MCPWebConfig;

const mcpWebClientConfig: MCPWebClientConfig = {
  serverUrl: `http://${mcpWebConfig.host}:${mcpWebConfig.mcpPort}`,
};

let bridgeProcess: ReturnType<typeof spawn> | undefined;

// Start bridge as separate process using Bun
const spawnBridge = () => spawn(
  'bun',
  ['run', join(__dirname, '../helpers/start-bridge.ts')],
  {
    env: {
      ...process.env,
      WS_PORT: mcpWebConfig.wsPort.toString(),
      MCP_PORT: mcpWebConfig.mcpPort.toString(),
    },
    stdio: ['ignore', 'ignore', 'pipe'], // Suppress stdout, only show stderr for errors
    detached: false, // Keep bridge attached to test process
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
    bridgeProcess.kill();
  }
});

test('MCPWebBridge accepts multiple sessions', async () => {
  const mcpWeb1 = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  await mcpWeb1.connect();

  const mcpWeb2 = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  await mcpWeb2.connect();

  mcpWeb2.disconnect();

  expect(mcpWeb1.isConnected()).toBe(true);
  expect(mcpWeb2.isConnected()).toBe(false);

  mcpWeb1.disconnect();
});

test('MCPWebBridge rejects non-contextualized MCP requests', async () => {
  // Create a root client without authToken
  const client = new MCPWebClient(mcpWebClientConfig);

  expect(client.listTools()).rejects.toThrow(MissingAuthenticationErrorCode);
  expect(client.callTool('tool', {})).rejects.toThrow(MissingAuthenticationErrorCode);
  expect(client.listResources()).rejects.toThrow(MissingAuthenticationErrorCode);
  expect(client.listPrompts()).rejects.toThrow(MissingAuthenticationErrorCode);
});
