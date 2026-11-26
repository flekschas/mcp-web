import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCPWebClient, type MCPWebClientConfig } from '@mcp-web/client';
import { MCPWeb } from '@mcp-web/core';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import type { MCPWebConfig } from '@mcp-web/types';
import { RESOURCE_MIME_TYPE, isCreatedApp } from '@mcp-web/types';
import type { ComponentType } from 'react';
import { z } from 'zod';
import { killProcess } from '../helpers/kill-process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BRIDGE_PORT = 3007;

// Mock component for testing - in real usage this would be a React component
const MockComponent: ComponentType<Record<string, unknown>> = () => null;

const mcpWebConfig = {
  name: 'test-apps',
  description: 'Test MCP Apps',
  bridgeUrl: `localhost:${BRIDGE_PORT}`,
  persistAuthToken: false,
  autoConnect: false,
} satisfies MCPWebConfig;

const mcpWebClientConfig: MCPWebClientConfig = {
  serverUrl: `http://${mcpWebConfig.bridgeUrl}`,
};

let bridgeProcess: ReturnType<typeof spawn> | undefined;

const spawnBridge = () =>
  spawn('bun', [join(__dirname, '../helpers/start-bridge.ts')], {
    env: {
      ...process.env,
      PORT: BRIDGE_PORT.toString(),
    },
    stdio: ['ignore', 'ignore', 'pipe'],
    detached: false,
  });

beforeAll(async () => {
  bridgeProcess = spawnBridge();

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

describe('MCP Apps', () => {
  test('addApp registers both a tool and resource', async () => {
    const authToken = 'app-test-token-1';
    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
      autoConnect: false,
    });

    mcpWeb.addApp({
      name: 'show_stats',
      description: 'Display statistics',
      component: MockComponent,
      handler: () => ({
        total: 100,
        completed: 75,
      }),
    });

    // Check that tool was registered
    expect(mcpWeb.tools.has('show_stats')).toBe(true);

    // Check that tool has _meta.ui.resourceUri (ext-apps spec)
    const tool = mcpWeb.tools.get('show_stats');
    expect(tool?._meta).toEqual({
      ui: { resourceUri: 'ui://show_stats/app.html' },
    });

    // Check that resource was registered with ext-apps mimeType
    expect(mcpWeb.resources.has('ui://show_stats/app.html')).toBe(true);
    const resource = mcpWeb.resources.get('ui://show_stats/app.html');
    expect(resource?.mimeType).toBe(RESOURCE_MIME_TYPE);

    mcpWeb.disconnect();
  });

  test('addApp with custom URL uses provided URL', async () => {
    const authToken = 'app-test-token-2';
    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
      autoConnect: false,
    });

    mcpWeb.addApp({
      name: 'custom_app',
      description: 'App with custom URL',
      component: MockComponent,
      handler: () => ({ data: 'test' }),
      url: '/custom/path/app.html',
      resourceUri: 'ui://custom/resource.html',
    });

    // Check that resource was registered with custom URI
    expect(mcpWeb.resources.has('ui://custom/resource.html')).toBe(true);

    mcpWeb.disconnect();
  });

  test('addApp tool handler returns props with _meta.ui', async () => {
    const authToken = 'app-test-token-3';
    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
      autoConnect: false,
    });

    mcpWeb.addApp({
      name: 'meta_test',
      description: 'Test meta UI',
      component: MockComponent,
      handler: () => ({
        value: 42,
      }),
    });

    // Get the registered tool and call its handler
    const tool = mcpWeb.tools.get('meta_test');
    expect(tool).toBeDefined();

    const result = await tool!.handler();
    expect(result).toEqual({
      value: 42,
      _meta: {
        ui: {
          resourceUri: 'ui://meta_test/app.html',
        },
      },
    });

    mcpWeb.disconnect();
  });

  test('addApp with input schema passes input to handler', async () => {
    const authToken = 'app-test-token-4';
    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
      autoConnect: false,
    });

    const InputSchema = z.object({
      chartType: z.enum(['bar', 'line', 'pie']),
    });

    mcpWeb.addApp({
      name: 'chart_app',
      description: 'Display chart',
      component: MockComponent,
      inputSchema: InputSchema,
      handler: ({ chartType }) => ({
        type: chartType,
        data: [1, 2, 3],
      }),
    });

    const tool = mcpWeb.tools.get('chart_app');
    expect(tool).toBeDefined();

    const result = await tool!.handler({ chartType: 'bar' });
    expect(result).toEqual({
      type: 'bar',
      data: [1, 2, 3],
      _meta: {
        ui: {
          resourceUri: 'ui://chart_app/app.html',
        },
      },
    });

    mcpWeb.disconnect();
  });

  test('removeApp removes both tool and resource', async () => {
    const authToken = 'app-test-token-5';
    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
      autoConnect: false,
    });

    mcpWeb.addApp({
      name: 'removable_app',
      description: 'App to be removed',
      component: MockComponent,
      handler: () => ({}),
    });

    expect(mcpWeb.tools.has('removable_app')).toBe(true);
    expect(mcpWeb.resources.has('ui://removable_app/app.html')).toBe(true);

    mcpWeb.removeApp('removable_app');

    expect(mcpWeb.tools.has('removable_app')).toBe(false);
    expect(mcpWeb.resources.has('ui://removable_app/app.html')).toBe(false);

    mcpWeb.disconnect();
  });

  test('a rejected addApp keeps the app it would replace', async () => {
    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken: 'app-test-token-rejected',
      autoConnect: false,
    });

    mcpWeb.addApp({
      name: 'replaced_app',
      description: 'App to replace',
      component: MockComponent,
      handler: () => ({}),
      resourceUri: 'ui://old/app.html',
    });
    expect(() =>
      mcpWeb.addApp({
        name: 'replaced_app',
        description: 'App with a broken props schema',
        component: MockComponent,
        handler: () => ({}),
        resourceUri: 'ui://new/app.html',
        propsSchema: { type: 'object', $ref: 'missing.json' },
      }),
    ).toThrow();

    const meta = { ui: { resourceUri: 'ui://old/app.html' } };
    expect(mcpWeb.apps.get('replaced_app')?.resolvedResourceUri).toBe(
      'ui://old/app.html',
    );
    expect(mcpWeb.tools.get('replaced_app')?._meta).toEqual(meta);
    expect(mcpWeb.resources.has('ui://new/app.html')).toBe(false);

    mcpWeb.removeApp('replaced_app');
    expect(mcpWeb.tools.has('replaced_app')).toBe(false);
    expect(mcpWeb.resources.has('ui://old/app.html')).toBe(false);

    mcpWeb.disconnect();
  });

  test('apps getter returns all registered apps', async () => {
    const authToken = 'app-test-token-6';
    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
      autoConnect: false,
    });

    mcpWeb.addApp({
      name: 'app_one',
      description: 'First app',
      component: MockComponent,
      handler: () => ({ id: 1 }),
    });

    mcpWeb.addApp({
      name: 'app_two',
      description: 'Second app',
      component: MockComponent,
      handler: () => ({ id: 2 }),
    });

    expect(mcpWeb.apps.size).toBe(2);
    expect(mcpWeb.apps.has('app_one')).toBe(true);
    expect(mcpWeb.apps.has('app_two')).toBe(true);

    mcpWeb.disconnect();
  });

  test('app tool is callable via MCP client', async () => {
    const authToken = 'app-test-token-7';
    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
      autoConnect: false,
    });

    mcpWeb.addApp({
      name: 'client_test_app',
      description: 'App testable via client',
      component: MockComponent,
      handler: () => ({
        message: 'Hello from app',
        timestamp: 12345,
      }),
    });

    await mcpWeb.connect();

    // Wait for tools to register
    await new Promise((resolve) => setTimeout(resolve, 100));

    const client = new MCPWebClient({
      ...mcpWebClientConfig,
      authToken,
    });

    // List tools to verify app tool is registered with _meta.ui
    const tools = await client.listTools();
    const appTool = tools.tools.find((t) => t.name === 'client_test_app');
    expect(appTool).toBeDefined();
    expect(appTool?.description).toBe('App testable via client');
    // Verify _meta.ui.resourceUri is in the tool description (ext-apps spec)
    expect((appTool as Record<string, unknown>)?._meta).toEqual({
      ui: { resourceUri: 'ui://client_test_app/app.html' },
    });

    // Call the app tool
    const result = await client.callTool('client_test_app', {});
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    // Verify _meta.ui is at the top level of CallToolResult (not inside JSON text)
    expect(result._meta).toBeDefined();
    expect((result._meta as Record<string, unknown>).ui).toEqual({
      resourceUri: 'ui://client_test_app/app.html',
    });

    // Verify the text content contains the props WITHOUT _meta
    const textContent = result.content[0] as { type: 'text'; text: string };
    const parsed = JSON.parse(textContent.text);
    expect(parsed.message).toBe('Hello from app');
    expect(parsed.timestamp).toBe(12345);
    expect(parsed._meta).toBeUndefined();

    mcpWeb.disconnect();
  });

  test('app tool returns props parsed by a Zod props schema', async () => {
    const authToken = 'app-test-token-structured';
    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
      autoConnect: false,
    });

    mcpWeb.addApp({
      name: 'structured_app',
      description: 'App with a props schema',
      component: MockComponent,
      propsSchema: z.object({
        message: z.string(),
        count: z.number().default(1),
        point: z.tuple([z.number(), z.number()]),
      }),
      handler: () => ({ message: 'Hello', point: [1, 2], extra: true }),
    });

    await mcpWeb.connect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const client = new MCPWebClient({ ...mcpWebClientConfig, authToken });
    const result = await client.callTool('structured_app', {});

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({
      message: 'Hello',
      count: 1,
      point: [1, 2],
    });
    expect(result._meta).toEqual({
      ui: { resourceUri: 'ui://structured_app/app.html' },
    });

    // The MCP SDK client checks the result against the listed schema
    const { tools } = await client.listTools();
    const outputSchema = tools.find(
      (tool) => tool.name === 'structured_app',
    )?.outputSchema;
    const check = new AjvJsonSchemaValidator().getValidator(
      outputSchema as Parameters<AjvJsonSchemaValidator['getValidator']>[0],
    )(result.structuredContent);
    expect(check.errorMessage).toBeUndefined();

    mcpWeb.disconnect();
  });

  test('addApp accepts an input schema with a Zod props schema', async () => {
    const authToken = 'app-test-token-input-props';
    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
      autoConnect: false,
    });
    const propsSchema = z.object({ title: z.string() });

    mcpWeb.addApp({
      name: 'zod_input_app',
      description: 'App with a Zod input schema',
      component: MockComponent,
      inputSchema: z.object({ title: z.string() }),
      propsSchema,
      handler: ({ title }) => ({ title }),
    });
    mcpWeb.addApp({
      name: 'json_input_app',
      description: 'App with a JSON Schema input schema',
      component: MockComponent,
      inputSchema: {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
      },
      propsSchema,
      handler: (input) => input as { title: string },
    });

    await mcpWeb.connect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const client = new MCPWebClient({ ...mcpWebClientConfig, authToken });
    for (const name of ['zod_input_app', 'json_input_app']) {
      const result = await client.callTool(name, { title: 'Hello' });
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({ title: 'Hello' });
    }

    mcpWeb.disconnect();
  });
});

describe('CreatedApp', () => {
  test('isCreatedApp returns true for CreatedApp objects', () => {
    const createdApp = {
      __brand: 'CreatedApp' as const,
      definition: {
        name: 'test',
        description: 'test',
        component: MockComponent,
        handler: () => ({}),
      },
      config: {
        name: 'test',
        description: 'test',
        component: MockComponent,
        handler: () => ({}),
      },
    };

    expect(isCreatedApp(createdApp)).toBe(true);
  });

  test('isCreatedApp returns false for non-CreatedApp objects', () => {
    expect(isCreatedApp(null)).toBe(false);
    expect(isCreatedApp(undefined)).toBe(false);
    expect(isCreatedApp({})).toBe(false);
    expect(isCreatedApp({ __brand: 'SomethingElse' })).toBe(false);
    expect(
      isCreatedApp({
        name: 'test',
        description: 'test',
        handler: () => ({}),
      })
    ).toBe(false);
  });

  test('addApp accepts CreatedApp objects', async () => {
    const authToken = 'created-app-token-1';
    const mcpWeb = new MCPWeb({
      ...mcpWebConfig,
      authToken,
      autoConnect: false,
    });

    const createdApp = {
      __brand: 'CreatedApp' as const,
      definition: {
        name: 'created_app_test',
        description: 'Created app test',
        component: MockComponent,
        handler: () => ({ created: true }),
      },
      config: {
        name: 'created_app_test',
        description: 'Created app test',
        component: MockComponent,
        handler: () => ({ created: true }),
      },
    };

    mcpWeb.addApp(createdApp);

    expect(mcpWeb.tools.has('created_app_test')).toBe(true);
    expect(mcpWeb.resources.has('ui://created_app_test/app.html')).toBe(true);

    mcpWeb.disconnect();
  });
});
