import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { z } from 'zod';
import { createTool } from './create-tool.js';
import { MCPWeb } from './web.js';

interface ModelContextTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; consequentialHint?: boolean };
  execute: (
    input: Record<string, unknown>,
    options: { signal: AbortSignal },
  ) => unknown;
}

/** Behaves like Chrome's `document.modelContext` in the ways MCPWeb relies on. */
class FakeModelContext {
  tools = new Map<string, ModelContextTool>();

  async registerTool(
    tool: ModelContextTool,
    options: { signal?: AbortSignal } = {},
  ) {
    const { signal } = options;
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (!/^[A-Za-z0-9_.-]{1,128}$/.test(tool.name)) {
      throw new DOMException('Invalid tool name', 'InvalidStateError');
    }
    if (this.tools.has(tool.name)) {
      throw new DOMException('Duplicate tool name', 'InvalidStateError');
    }
    this.tools.set(tool.name, tool);
    signal?.addEventListener('abort', () => this.tools.delete(tool.name));
  }

  call(name: string, input: Record<string, unknown> = {}) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`No tool ${name}`);
    return tool.execute(input, { signal: new AbortController().signal });
  }
}

const globals = globalThis as { document?: unknown; WebSocket?: unknown };
let modelContext: FakeModelContext;
let originalDocument: unknown;

beforeEach(() => {
  originalDocument = globals.document;
  modelContext = new FakeModelContext();
  globals.document = { modelContext, addEventListener: () => {} };
});

afterEach(() => {
  globals.document = originalDocument;
});

const createMCPWeb = (
  config: Partial<ConstructorParameters<typeof MCPWeb>[0]> = {},
) =>
  new MCPWeb({
    name: 'test',
    description: 'Test app',
    autoConnect: false,
    ...config,
  });

/** Lets `registerTool` rejections reach their handlers. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test('registers tools with WebMCP by default', async () => {
  const mcp = createMCPWeb();
  mcp.addTool({
    name: 'add',
    description: 'Adds two numbers',
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    annotations: { title: 'Add', readOnlyHint: true },
    handler: ({ a, b }) => a + b,
  });

  const tool = modelContext.tools.get('add');
  expect(tool?.title).toBe('Add');
  expect(tool?.description).toBe('Adds two numbers');
  expect(tool?.inputSchema).toMatchObject({
    type: 'object',
    properties: { a: { type: 'number' }, b: { type: 'number' } },
  });
  expect(tool?.annotations).toEqual({
    readOnlyHint: true,
    consequentialHint: false,
  });
  expect(await modelContext.call('add', { a: 2, b: 40 })).toEqual({
    content: [{ type: 'text', text: '42' }],
  });
});

test('marks destructive tools as consequential', () => {
  const mcp = createMCPWeb();
  mcp.addTool({
    name: 'clear',
    description: 'Deletes everything',
    annotations: { destructiveHint: true },
    handler: () => {},
  });
  mcp.addTool({
    name: 'peek',
    description: 'Contradictory hints',
    annotations: { destructiveHint: true, readOnlyHint: true },
    handler: () => {},
  });

  expect(modelContext.tools.get('clear')?.annotations).toEqual({
    readOnlyHint: false,
    consequentialHint: true,
  });
  expect(modelContext.tools.get('peek')?.annotations).toEqual({
    readOnlyHint: true,
    consequentialHint: false,
  });
});

test('returns failures as error results', async () => {
  const mcp = createMCPWeb();
  mcp.addTool({
    name: 'fail',
    description: 'Always fails',
    handler: () => {
      throw new Error('Something broke');
    },
  });
  mcp.addTool({
    name: 'double',
    description: 'Doubles a number',
    inputSchema: z.object({ n: z.number() }),
    handler: ({ n }) => n * 2,
  });

  const failed = (await modelContext.call('fail')) as {
    content: { text: string }[];
    isError?: boolean;
  };
  expect(failed.isError).toBe(true);
  expect(failed.content[0].text).toContain('Something broke');

  const invalid = (await modelContext.call('double', { n: 'two' })) as {
    isError?: boolean;
  };
  expect(invalid.isError).toBe(true);
});

test('returns an unserializable result as an error result', async () => {
  const mcp = createMCPWeb();
  mcp.addTool({
    name: 'count',
    description: 'Counts',
    handler: () => ({ count: 1n }),
  });

  const result = (await modelContext.call('count')) as { isError?: boolean };
  expect(result.isError).toBe(true);
});

test('leaves `_meta` out of results', async () => {
  const mcp = createMCPWeb();
  mcp.addTool({
    name: 'summary',
    description: 'Summarizes',
    handler: () => ({ summary: 'Ready', _meta: { records: [1, 2] } }),
  });
  mcp.addTool({
    name: 'fail',
    description: 'Fails',
    handler: () => ({ error: 'failure', _meta: { records: [1, 2] } }),
  });

  expect(await modelContext.call('summary')).toEqual({
    content: [
      { type: 'text', text: JSON.stringify({ summary: 'Ready' }, null, 2) },
    ],
  });
  expect(await modelContext.call('fail')).toEqual({
    content: [
      { type: 'text', text: JSON.stringify({ error: 'failure' }, null, 2) },
    ],
    isError: true,
  });
});

test('returns a result with a throwing getter as an error result', async () => {
  const mcp = createMCPWeb();
  mcp.addTool({
    name: 'broken',
    description: 'Returns a broken object',
    handler: () => ({
      _meta: {},
      get value() {
        throw new Error('Broken getter');
      },
    }),
  });

  const result = (await modelContext.call('broken')) as {
    content: { text: string }[];
    isError?: boolean;
  };
  expect(result.isError).toBe(true);
  expect(result.content[0].text).toContain('Broken getter');
});

test('removing or replacing a tool updates its WebMCP registration', async () => {
  const mcp = createMCPWeb();
  mcp.addTool({ name: 'tool', description: 'First', handler: () => 'first' });
  mcp.addTool({ name: 'tool', description: 'Second', handler: () => 'second' });
  await settle();

  expect(modelContext.tools.get('tool')?.description).toBe('Second');
  expect(await modelContext.call('tool')).toEqual({
    content: [{ type: 'text', text: 'second' }],
  });

  mcp.removeTool('tool');
  expect(modelContext.tools.has('tool')).toBe(false);
});

test('removing a code tool group unregisters its tools', () => {
  const mcp = createMCPWeb();
  const remove = mcp.addCodeTool({
    name: 'code',
    description: 'Runs code',
    handler: () => null,
    lookupTool: { name: 'lookup', description: 'Looks up', handler: () => [] },
  });
  expect([...modelContext.tools.keys()]).toEqual(['code', 'lookup']);

  remove();
  expect(modelContext.tools.size).toBe(0);
});

test('warns about a tool that WebMCP rejects and keeps it for the bridge', async () => {
  const warn = spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const mcp = createMCPWeb();
    const errors: unknown[] = [];
    mcp.addTool(
      { name: 'not valid', description: 'Bad name', handler: () => {} },
      { onRegistrationError: (error) => errors.push(error) },
    );
    await settle();

    expect(warn).toHaveBeenCalledWith(
      "WebMCP rejected the tool 'not valid': Invalid tool name",
    );
    expect(errors).toEqual([]);
    expect(mcp.tools.has('not valid')).toBe(true);
  } finally {
    warn.mockRestore();
  }
});

test('a registerTool that throws or returns nothing does not break addTool', () => {
  const warn = spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const mcp = createMCPWeb();
    modelContext.registerTool = () => {
      throw new Error('Not supported');
    };
    mcp.addTool({ name: 'a', description: 'A', handler: () => {} });
    modelContext.registerTool = (() => undefined) as never;
    mcp.addTool({ name: 'b', description: 'B', handler: () => {} });

    expect(mcp.getTools()).toEqual(['a', 'b']);
  } finally {
    warn.mockRestore();
  }
});

test('stops registering when the document does not allow WebMCP', async () => {
  const warn = spyOn(console, 'warn').mockImplementation(() => {});
  try {
    let calls = 0;
    modelContext.registerTool = async () => {
      calls++;
      throw new DOMException('Disallowed by policy', 'NotAllowedError');
    };
    const mcp = createMCPWeb();
    mcp.addTool({ name: 'a', description: 'A', handler: () => {} });
    await settle();
    mcp.addTool({ name: 'b', description: 'B', handler: () => {} });
    await settle();

    expect(calls).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
  } finally {
    warn.mockRestore();
  }
});

test('leaves out app tools and app-only tools', async () => {
  const mcp = createMCPWeb();
  mcp.addTool({
    name: 'widget_action',
    description: 'Public at first',
    handler: () => {},
  });
  expect(modelContext.tools.has('widget_action')).toBe(true);

  mcp.addTool({
    name: 'widget_action',
    description: 'Only for the app',
    handler: () => {},
    _meta: { ui: { visibility: ['app'] } },
  });
  mcp.addTool({
    name: 'shared_action',
    description: 'For the model and the app',
    handler: () => {},
    _meta: { ui: { visibility: ['model', 'app'] } },
  });
  mcp.addTool({
    name: 'show_chart',
    description: 'Shows a chart in an app',
    handler: () => ({}),
    _meta: { ui: { resourceUri: 'ui://show_chart' } },
  });
  await settle();

  expect([...modelContext.tools.keys()]).toEqual(['shared_action']);
});

test('a private tool leaves the public tool of another instance alone', async () => {
  const publicMCP = createMCPWeb();
  publicMCP.addTool({
    name: 'tool',
    description: 'Public',
    handler: () => 'public',
  });
  const appMCP = createMCPWeb();
  appMCP.addTool({
    name: 'tool',
    description: 'Only for the app',
    handler: () => 'app',
    _meta: { ui: { visibility: ['app'] } },
  });
  await settle();

  expect(await modelContext.call('tool')).toEqual({
    content: [{ type: 'text', text: 'public' }],
  });
});

test('an instance from another copy of the module replaces tools', async () => {
  const { MCPWeb: OtherMCPWeb } = await import('./web.js?other-copy');
  expect(OtherMCPWeb).not.toBe(MCPWeb);
  const config = { name: 'test', description: 'Test app', autoConnect: false };

  const oldMCP = new MCPWeb(config);
  oldMCP.addTool({ name: 'tool', description: 'Old', handler: () => 'old' });
  oldMCP.addTool({ name: 'hidden', description: 'Old', handler: () => 'old' });
  const newMCP = new OtherMCPWeb(config);
  newMCP.addTool({ name: 'tool', description: 'New', handler: () => 'new' });
  newMCP.addTool({
    name: 'hidden',
    description: 'Now only for the app',
    handler: () => 'new',
    _meta: { ui: { visibility: ['app'] } },
  });
  await settle();

  expect(await modelContext.call('tool')).toEqual({
    content: [{ type: 'text', text: 'new' }],
  });
  // An app-only tool doesn't remove another instance's public tool.
  expect(modelContext.tools.has('hidden')).toBe(true);
});

test('a new instance replaces the tools of an older one', async () => {
  const oldMCP = createMCPWeb();
  oldMCP.addTool({ name: 'tool', description: 'Old', handler: () => 'old' });
  const newMCP = createMCPWeb();
  newMCP.addTool({ name: 'tool', description: 'New', handler: () => 'new' });
  await settle();

  oldMCP.removeTool('tool');
  expect(await modelContext.call('tool')).toEqual({
    content: [{ type: 'text', text: 'new' }],
  });
});

test('state getters are read-only', () => {
  const mcp = createMCPWeb();
  let todos: string[] = [];
  mcp.addStateTools({
    name: 'todos',
    description: 'Todo items',
    get: () => todos,
    set: (value) => {
      todos = value;
    },
    schema: z.array(z.string()),
  });

  expect(modelContext.tools.get('get_todos')?.annotations?.readOnlyHint).toBe(
    true,
  );
  expect(modelContext.tools.get('set_todos')?.annotations?.readOnlyHint).toBe(
    false,
  );
});

test('generated delete tools are consequential', () => {
  const mcp = createMCPWeb();
  let todos: { id: string; title: string }[] = [];
  mcp.addStateTools({
    name: 'todos',
    description: 'Todo items',
    get: () => todos,
    set: (value) => {
      todos = value;
    },
    schema: z.array(z.object({ id: z.string(), title: z.string() })),
    expand: true,
  });

  expect(modelContext.tools.get('delete_todos')?.annotations).toEqual({
    readOnlyHint: false,
    consequentialHint: true,
  });
  expect(
    modelContext.tools.get('set_todos')?.annotations?.consequentialHint,
  ).toBe(false);
});

test('createTool keeps annotations', () => {
  const mcp = createMCPWeb();
  mcp.addTool(
    createTool({
      name: 'peek',
      description: 'Peeks',
      annotations: { readOnlyHint: true },
      handler: () => {},
    }),
  );

  expect(modelContext.tools.get('peek')?.annotations?.readOnlyHint).toBe(true);
});

test('disableWebMCP keeps tools out of WebMCP', () => {
  const mcp = createMCPWeb({ disableWebMCP: true });
  mcp.addTool({ name: 'tool', description: 'A tool', handler: () => {} });

  expect(modelContext.tools.size).toBe(0);
});

test('onlyWebMCP never opens a bridge connection', async () => {
  const webSocket = globals.WebSocket;
  let sockets = 0;
  globals.WebSocket = class {
    constructor() {
      sockets++;
    }
  };
  try {
    const mcp = createMCPWeb({ onlyWebMCP: true, autoConnect: true });
    mcp.addTool({ name: 'tool', description: 'A tool', handler: () => 'hi' });

    expect(await mcp.connect()).toBe(false);
    expect(sockets).toBe(0);
    expect(await modelContext.call('tool')).toEqual({
      content: [{ type: 'text', text: 'hi' }],
    });
  } finally {
    globals.WebSocket = webSocket;
  }
});

test('onlyWebMCP warns when the browser has no WebMCP', () => {
  const warn = spyOn(console, 'warn').mockImplementation(() => {});
  globals.document = { addEventListener: () => {} };
  try {
    createMCPWeb({ onlyWebMCP: true });
    expect(warn).toHaveBeenCalledTimes(1);
  } finally {
    warn.mockRestore();
  }
});

test('onlyWebMCP and persistAuthToken: false do not touch localStorage', () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );
  let reads = 0;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      reads++;
      throw new DOMException('Denied', 'SecurityError');
    },
  });
  try {
    createMCPWeb({ onlyWebMCP: true });
    createMCPWeb({ persistAuthToken: false });
    expect(reads).toBe(0);
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, 'localStorage', descriptor);
    } else {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  }
});

test('disableWebMCP and onlyWebMCP cannot be combined', () => {
  expect(() => createMCPWeb({ disableWebMCP: true, onlyWebMCP: true })).toThrow(
    'disableWebMCP and onlyWebMCP cannot both be set.',
  );
});
