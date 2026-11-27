import { expect, test } from 'bun:test';
import type { MCPWebConfig } from '@mcp-web/types';
import type { AssetsBinding } from './adapters/cloudflare-types.js';
import { readAsset } from './adapters/read-asset.js';
import { MCPWebBridge } from './core.js';
import type { HttpResponse, WebSocketConnection } from './runtime/types.js';

function createBridge(
  config: Partial<MCPWebConfig>,
  files: Record<string, string> = {},
) {
  const bridge = new MCPWebBridge(
    { name: 'Todo', description: 'A todo list', ...config },
    undefined,
    { readStaticFile: async (path) => files[path] },
  );
  const handlers = bridge.getHandlers();

  const sentToTab: string[] = [];

  /** Connects a browser session and starts a query that may use no tools. */
  const startRestrictedQuery = () => {
    const ws: WebSocketConnection = {
      send: (data) => void sentToTab.push(data),
      close: () => {},
      readyState: 'OPEN',
      onMessage: () => {},
      offMessage: () => {},
    };
    const send = (message: Record<string, unknown>) =>
      handlers.onWebSocketMessage('tab', ws, JSON.stringify(message));
    send({
      type: 'authenticate',
      sessionId: 'tab',
      authToken: 'token',
      origin: 'http://localhost',
      timestamp: Date.now(),
    });
    send({
      type: 'register-tool',
      tool: { name: 'open_app', description: 'Mine', inputSchema: {} },
    });
    send({
      type: 'register-resource',
      resource: {
        uri: 'ui://mcp-web/page.html',
        name: 'Mine',
        mimeType: 'text/html',
      },
    });
    send({
      type: 'query',
      uuid: 'query',
      prompt: 'Hi',
      context: [],
      tools: [],
      restrictTools: true,
    });
  };

  const request = async (method: string, params?: Record<string, unknown>) => {
    const response = (await handlers.onHttpRequest({
      method: 'POST',
      url: 'http://localhost/mcp',
      headers: {
        get: (name: string) =>
          ({ authorization: 'Bearer token', accept: 'application/json' })[
            name.toLowerCase()
          ] ?? null,
      },
      text: async () =>
        JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })) as HttpResponse;
    return JSON.parse(response.body) as {
      result?: Record<string, unknown>;
      error?: { message: string };
    };
  };
  return Object.assign(request, { startRestrictedQuery, sentToTab });
}

test('with mcpApp, the bridge opens the app without a browser session', async () => {
  const request = createBridge(
    { mcpApp: { page: 'admin.html' } },
    { 'mcp-web-apps/admin.html': '<html><head></head>view</html>' },
  );

  const { result: toolList } = await request('tools/list');
  const tools = toolList?.tools as Array<{ name: string; _meta?: unknown }>;
  const openApp = tools.find((tool) => tool.name === 'open_app');
  expect(openApp?._meta).toEqual({
    ui: { resourceUri: 'ui://mcp-web/page.html' },
  });
  // The tool that tells AI no tab is connected is still there.
  expect(tools.map((tool) => tool.name)).toContain('get_connection_status');

  const { result: call } = await request('tools/call', { name: 'open_app' });
  expect(call?.isError).toBeUndefined();

  const { result: resourceList } = await request('resources/list');
  expect(resourceList?.resources).toContainEqual(
    expect.objectContaining({ uri: 'ui://mcp-web/page.html' }),
  );

  const { result: read } = await request('resources/read', {
    uri: 'ui://mcp-web/page.html',
  });
  expect(read?.contents).toEqual([
    {
      uri: 'ui://mcp-web/page.html',
      mimeType: 'text/html;profile=mcp-app',
      // Only the served copy is marked as a view.
      text: '<html><head><meta name="mcp-web-view"></head>view</html>',
    },
  ]);
});

test('a missing view tells how to build it', async () => {
  const request = createBridge({ mcpApp: true });
  const { error } = await request('resources/read', {
    uri: 'ui://mcp-web/page.html',
  });
  expect(error?.message).toContain('mcp-web-apps/index.html was not found');
});

test('without mcpApp, the bridge offers no open_app tool', async () => {
  const request = createBridge({});
  const { result } = await request('tools/list');
  const tools = result?.tools as Array<{ name: string }>;
  expect(tools.map((tool) => tool.name)).not.toContain('open_app');
});

test('the view gets its domains, and its mark after a leading comment', async () => {
  const request = createBridge(
    {
      mcpApp: {
        page: 'index.html',
        csp: { connectDomains: ['https://api.example.com'] },
      },
    },
    {
      'mcp-web-apps/index.html':
        '<!doctype html><!-- <head> --><html><head lang="en"></head></html>',
    },
  );
  const { result } = await request('resources/read', {
    uri: 'ui://mcp-web/page.html',
  });
  expect(result?.contents).toEqual([
    expect.objectContaining({
      text: '<!doctype html><!-- <head> --><html><head lang="en"><meta name="mcp-web-view"></head></html>',
      _meta: { ui: { csp: { connectDomains: ['https://api.example.com'] } } },
    }),
  ]);
});

test('a query cannot open the app, and a tab cannot take its names', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response('{}')) as unknown as typeof fetch;
  try {
    const request = createBridge({
      mcpApp: true,
      agentUrl: 'http://agent.local',
    });
    request.startRestrictedQuery();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const { result: list } = await request('tools/list', {
      _meta: { queryId: 'query' },
    });
    const tools = list?.tools as Array<{ name: string }>;
    expect(tools.map((tool) => tool.name)).not.toContain('open_app');

    const { result: call } = await request('tools/call', {
      name: 'open_app',
      _meta: { queryId: 'query' },
    });
    expect(call?.isError).toBe(true);

    // The tab can't take the names of the bridge's own tool and view.
    expect(request.sentToTab).toContainEqual(
      expect.stringContaining('ToolNameReserved'),
    );
    const { result: resources } = await request('resources/list');
    expect(resources?.resources).toBeArray();
    expect(resources?.resources).not.toContainEqual(
      expect.objectContaining({ name: 'Mine' }),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('on Cloudflare, a page served for a missing file is not a view', async () => {
  const files: Record<string, string> = {
    '/index.html': 'the site',
    '/mcp-web-apps/index.html': 'the view',
  };
  // Like `not_found_handling: 'single-page-application'`.
  const assets = {
    fetch: async (request: Request) =>
      new Response(
        files[new URL(request.url).pathname] ?? files['/index.html'],
      ),
  } as unknown as AssetsBinding;

  const read = readAsset(assets);
  expect(await read('mcp-web-apps/index.html')).toBe('the view');
  expect(await read('mcp-web-apps/admin.html')).toBeUndefined();
});
