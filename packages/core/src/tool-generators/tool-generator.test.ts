import { test, expect } from 'bun:test';
import { z } from 'zod';
import type { MCPWeb } from '../web.js';
import { id, system } from './schema-helpers.js';
import { generateToolsForSchema } from './tool-generator.js';

// Mock MCPWeb instance
const mockMCPWeb = {} as MCPWeb;

// ============================================================================
// Array Tools - Index-Based
// ============================================================================

test('generateToolsForSchema() - array generates 4 tools: get, add, set, delete', () => {
  let state: string[] = ['a', 'b', 'c'];
  const schema = z.array(z.string());

  const result = generateToolsForSchema(
    {
      name: 'tags',
      description: 'tags',
      get: () => state,
      set: (value) => {
        state = value as string[];
      },
      schema,
    },
    mockMCPWeb
  );

  expect(result.tools).toHaveLength(4);
  expect(result.tools.map((t) => t.name)).toEqual([
    'get_tags',
    'add_tags',
    'set_tags',
    'delete_tags',
  ]);
});

test('generateToolsForSchema() - array get without index returns full array', async () => {
  let state = ['a', 'b', 'c'];
  const schema = z.array(z.string());

  const result = generateToolsForSchema(
    {
      name: 'tags',
      description: 'tags',
      get: () => state,
      set: (value) => {
        state = value as string[];
      },
      schema,
    },
    mockMCPWeb
  );

  const getter = result.tools[0];
  const value = await getter.handler({});
  expect(value).toEqual(['a', 'b', 'c']);
});

test('generateToolsForSchema() - array get with index returns item at index', async () => {
  let state = ['a', 'b', 'c'];
  const schema = z.array(z.string());

  const result = generateToolsForSchema(
    {
      name: 'tags',
      description: 'tags',
      get: () => state,
      set: (value) => {
        state = value as string[];
      },
      schema,
    },
    mockMCPWeb
  );

  const getter = result.tools[0];
  expect(await getter.handler({ index: 0 })).toBe('a');
  expect(await getter.handler({ index: 1 })).toBe('b');
  expect(await getter.handler({ index: 2 })).toBe('c');
});

test('generateToolsForSchema() - array add without index appends to end', async () => {
  let state = ['a', 'b'];
  const schema = z.array(z.string());

  const result = generateToolsForSchema(
    {
      name: 'tags',
      description: 'tags',
      get: () => state,
      set: (value) => {
        state = value as string[];
      },
      schema,
    },
    mockMCPWeb
  );

  const adder = result.tools[1];
  await adder.handler({ value: 'c' });
  expect(state).toEqual(['a', 'b', 'c']);
});

test('generateToolsForSchema() - array add with index inserts at position', async () => {
  let state = ['a', 'c'];
  const schema = z.array(z.string());

  const result = generateToolsForSchema(
    {
      name: 'tags',
      description: 'tags',
      get: () => state,
      set: (value) => {
        state = value as string[];
      },
      schema,
    },
    mockMCPWeb
  );

  const adder = result.tools[1];
  await adder.handler({ value: 'b', index: 1 });
  expect(state).toEqual(['a', 'b', 'c']);
});

test('generateToolsForSchema() - array set uses partial update with deep merge', async () => {
  type Item = { id: string; name: string; count: number };
  let state: Item[] = [
    { id: 'a', name: 'Item A', count: 10 },
    { id: 'b', name: 'Item B', count: 20 },
  ];
  const schema = z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      count: z.number(),
    })
  );

  const result = generateToolsForSchema(
    {
      name: 'items',
      description: 'items',
      get: () => state,
      set: (value) => {
        state = value as Item[];
      },
      schema,
    },
    mockMCPWeb
  );

  const setter = result.tools[2];
  await setter.handler({ index: 0, value: { count: 15 } });

  expect(state[0]).toEqual({ id: 'a', name: 'Item A', count: 15 });
  expect(state[1]).toEqual({ id: 'b', name: 'Item B', count: 20 });
});

test('generateToolsForSchema() - array delete by index removes item', async () => {
  let state = ['a', 'b', 'c'];
  const schema = z.array(z.string());

  const result = generateToolsForSchema(
    {
      name: 'tags',
      description: 'tags',
      get: () => state,
      set: (value) => {
        state = value as string[];
      },
      schema,
    },
    mockMCPWeb
  );

  const deleter = result.tools[3];
  await deleter.handler({ index: 1 });
  expect(state).toEqual(['a', 'c']);
});

test('generateToolsForSchema() - array delete with all:true clears array', async () => {
  let state = ['a', 'b', 'c'];
  const schema = z.array(z.string());

  const result = generateToolsForSchema(
    {
      name: 'tags',
      description: 'tags',
      get: () => state,
      set: (value) => {
        state = value as string[];
      },
      schema,
    },
    mockMCPWeb
  );

  const deleter = result.tools[3];
  await deleter.handler({ all: true });
  expect(state).toEqual([]);
});

test('generateToolsForSchema() - array index out of bounds throws error', async () => {
  let state = ['a', 'b'];
  const schema = z.array(z.string());

  const result = generateToolsForSchema(
    {
      name: 'tags',
      description: 'tags',
      get: () => state,
      set: (value) => {
        state = value as string[];
      },
      schema,
    },
    mockMCPWeb
  );

  const setter = result.tools[2];

  try {
    await setter.handler({ index: 5, value: 'x' });
    expect(true).toBe(false); // Should not reach here
  } catch (error) {
    const message = (error as Error).message;
    expect(message).toContain('out of bounds');
    expect(message).toContain('5');
    expect(message).toContain('2'); // Array length
  }
});

// ============================================================================
// Array Tools - ID-Based
// ============================================================================

test('generateToolsForSchema() - ID-based array generates 4 tools', () => {
  type Item = { id: string; name: string };
  let state: Item[] = [];
  const schema = z.array(
    z.object({
      id: id(system(z.string().default(() => crypto.randomUUID()))),
      name: z.string(),
    })
  );

  const result = generateToolsForSchema(
    {
      name: 'items',
      description: 'items',
      get: () => state,
      set: (value) => {
        state = value as Item[];
      },
      schema,
    },
    mockMCPWeb
  );

  expect(result.tools).toHaveLength(4);
  expect(result.tools.map((t) => t.name)).toEqual([
    'get_items',
    'add_items',
    'set_items',
    'delete_items',
  ]);
});

test('generateToolsForSchema() - ID-based get by ID returns matching item', async () => {
  type Item = { id: string; name: string };
  let state: Item[] = [
    { id: 'abc', name: 'Item A' },
    { id: 'def', name: 'Item B' },
  ];
  const schema = z.array(
    z.object({
      id: id(z.string()),
      name: z.string(),
    })
  );

  const result = generateToolsForSchema(
    {
      name: 'items',
      description: 'items',
      get: () => state,
      set: (value) => {
        state = value as Item[];
      },
      schema,
    },
    mockMCPWeb
  );

  const getter = result.tools[0];
  const item = await getter.handler({ id: 'abc' });
  expect(item).toEqual({ id: 'abc', name: 'Item A' });
});

test('generateToolsForSchema() - ID-based add has no index parameter', () => {
  type Item = { id: string; name: string };
  let state: Item[] = [];
  const schema = z.array(
    z.object({
      id: id(system(z.string().default(() => crypto.randomUUID()))),
      name: z.string(),
    })
  );

  const result = generateToolsForSchema(
    {
      name: 'items',
      description: 'items',
      get: () => state,
      set: (value) => {
        state = value as Item[];
      },
      schema,
    },
    mockMCPWeb
  );

  const adder = result.tools[1];
  const inputSchema = adder.inputSchema as z.ZodObject<z.ZodRawShape>;

  expect('value' in inputSchema.shape).toBe(true);
  expect('index' in inputSchema.shape).toBe(false);
});

test('generateToolsForSchema() - ID-based set finds and updates item', async () => {
  type Item = { id: string; name: string; count: number };
  let state: Item[] = [
    { id: 'abc', name: 'Item A', count: 10 },
    { id: 'def', name: 'Item B', count: 20 },
  ];
  const schema = z.array(
    z.object({
      id: id(z.string()),
      name: z.string(),
      count: z.number(),
    })
  );

  const result = generateToolsForSchema(
    {
      name: 'items',
      description: 'items',
      get: () => state,
      set: (value) => {
        state = value as Item[];
      },
      schema,
    },
    mockMCPWeb
  );

  const setter = result.tools[2];
  await setter.handler({ id: 'abc', value: { count: 15 } });

  expect(state[0]).toEqual({ id: 'abc', name: 'Item A', count: 15 });
  expect(state[1]).toEqual({ id: 'def', name: 'Item B', count: 20 });
});

test('generateToolsForSchema() - ID-based delete removes matching item', async () => {
  type Item = { id: string; name: string };
  let state: Item[] = [
    { id: 'abc', name: 'Item A' },
    { id: 'def', name: 'Item B' },
    { id: 'ghi', name: 'Item C' },
  ];
  const schema = z.array(
    z.object({
      id: id(z.string()),
      name: z.string(),
    })
  );

  const result = generateToolsForSchema(
    {
      name: 'items',
      description: 'items',
      get: () => state,
      set: (value) => {
        state = value as Item[];
      },
      schema,
    },
    mockMCPWeb
  );

  const deleter = result.tools[3];
  await deleter.handler({ id: 'def' });

  expect(state).toHaveLength(2);
  expect(state[0].id).toBe('abc');
  expect(state[1].id).toBe('ghi');
});

test('generateToolsForSchema() - ID not found throws error', async () => {
  type Item = { id: string; name: string };
  let state: Item[] = [{ id: 'abc', name: 'Item A' }];
  const schema = z.array(
    z.object({
      id: id(z.string()),
      name: z.string(),
    })
  );

  const result = generateToolsForSchema(
    {
      name: 'items',
      description: 'items',
      get: () => state,
      set: (value) => {
        state = value as Item[];
      },
      schema,
    },
    mockMCPWeb
  );

  const setter = result.tools[2];

  try {
    await setter.handler({ id: 'nonexistent', value: { name: 'Updated' } });
    expect(true).toBe(false); // Should not reach here
  } catch (error) {
    const message = (error as Error).message;
    expect(message).toContain('not found');
    expect(message).toContain('nonexistent');
  }
});

test('generateToolsForSchema() - ID-based add returns complete object with system fields', async () => {
  type Item = { id: string; name: string; created_at: number };
  let state: Item[] = [];
  const schema = z.array(
    z.object({
      id: id(system(z.string().default(() => 'generated-id'))),
      name: z.string(),
      created_at: system(z.number().default(() => 12345)),
    })
  );

  const result = generateToolsForSchema(
    {
      name: 'items',
      description: 'items',
      get: () => state,
      set: (value) => {
        state = value as Item[];
      },
      schema,
    },
    mockMCPWeb
  );

  const adder = result.tools[1];
  const response = (await adder.handler({ value: { name: 'Test' } })) as {
    success: boolean;
    value: Item;
  };

  expect(response.success).toBe(true);
  expect(response.value.id).toBe('generated-id');
  expect(response.value.name).toBe('Test');
  expect(response.value.created_at).toBe(12345);
});

test('generateToolsForSchema() - ID-based system fields excluded from input schemas', () => {
  type Item = { id: string; name: string; created_at: number };
  let state: Item[] = [];
  const schema = z.array(
    z.object({
      id: id(system(z.string().default(() => crypto.randomUUID()))),
      name: z.string(),
      created_at: system(z.number().default(() => Date.now())),
    })
  );

  const result = generateToolsForSchema(
    {
      name: 'items',
      description: 'items',
      get: () => state,
      set: (value) => {
        state = value as Item[];
      },
      schema,
    },
    mockMCPWeb
  );

  const adder = result.tools[1];
  const addInputSchema = adder.inputSchema as z.ZodObject<z.ZodRawShape>;
  const valueSchema = addInputSchema.shape.value as z.ZodObject<z.ZodRawShape>;

  expect('id' in valueSchema.shape).toBe(false);
  expect('created_at' in valueSchema.shape).toBe(false);
  expect('name' in valueSchema.shape).toBe(true);
});

// ============================================================================
// Record Tools
// ============================================================================

test('generateToolsForSchema() - record generates 3 tools: get, set, delete', () => {
  let state: Record<string, { name: string }> = {};
  const schema = z.record(z.string(), z.object({ name: z.string() }));

  const result = generateToolsForSchema(
    {
      name: 'projects',
      description: 'projects',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    mockMCPWeb
  );

  expect(result.tools).toHaveLength(3);
  expect(result.tools.map((t) => t.name)).toEqual([
    'get_projects',
    'set_projects',
    'delete_projects',
  ]);
});

test('generateToolsForSchema() - record get by key returns value', async () => {
  let state = {
    proj1: { name: 'Project 1' },
    proj2: { name: 'Project 2' },
  };
  const schema = z.record(z.string(), z.object({ name: z.string() }));

  const result = generateToolsForSchema(
    {
      name: 'projects',
      description: 'projects',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    mockMCPWeb
  );

  const getter = result.tools[0];
  const value = await getter.handler({ key: 'proj1' });
  expect(value).toEqual({ name: 'Project 1' });
});

test('generateToolsForSchema() - record get without key returns full record', async () => {
  let state = {
    proj1: { name: 'Project 1' },
    proj2: { name: 'Project 2' },
  };
  const schema = z.record(z.string(), z.object({ name: z.string() }));

  const result = generateToolsForSchema(
    {
      name: 'projects',
      description: 'projects',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    mockMCPWeb
  );

  const getter = result.tools[0];
  const value = await getter.handler({});
  expect(value).toEqual(state);
});

test('generateToolsForSchema() - record set is upsert (adds or updates)', async () => {
  let state: Record<string, { name: string }> = {
    proj1: { name: 'Project 1' },
  };
  const schema = z.record(z.string(), z.object({ name: z.string() }));

  const result = generateToolsForSchema(
    {
      name: 'projects',
      description: 'projects',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    mockMCPWeb
  );

  const setter = result.tools[1];

  // Add new entry
  await setter.handler({ key: 'proj2', value: { name: 'Project 2' } });
  expect(state.proj2).toEqual({ name: 'Project 2' });

  // Update existing entry
  await setter.handler({ key: 'proj1', value: { name: 'Updated Project 1' } });
  expect(state.proj1).toEqual({ name: 'Updated Project 1' });
});

test('generateToolsForSchema() - record set with existing key uses deep merge for objects', async () => {
  let state: Record<string, { name: string; count: number }> = {
    proj1: { name: 'Project 1', count: 10 },
  };
  const schema = z.record(
    z.string(),
    z.object({ name: z.string(), count: z.number() })
  );

  const result = generateToolsForSchema(
    {
      name: 'projects',
      description: 'projects',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    mockMCPWeb
  );

  const setter = result.tools[1];
  await setter.handler({ key: 'proj1', value: { count: 20 } });

  expect(state.proj1).toEqual({ name: 'Project 1', count: 20 });
});

test('generateToolsForSchema() - record delete by key removes entry', async () => {
  let state = {
    proj1: { name: 'Project 1' },
    proj2: { name: 'Project 2' },
  };
  const schema = z.record(z.string(), z.object({ name: z.string() }));

  const result = generateToolsForSchema(
    {
      name: 'projects',
      description: 'projects',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    mockMCPWeb
  );

  const deleter = result.tools[2];
  await deleter.handler({ key: 'proj1' });

  expect('proj1' in state).toBe(false);
  expect('proj2' in state).toBe(true);
});

test('generateToolsForSchema() - record delete with all:true clears record', async () => {
  let state = {
    proj1: { name: 'Project 1' },
    proj2: { name: 'Project 2' },
  };
  const schema = z.record(z.string(), z.object({ name: z.string() }));

  const result = generateToolsForSchema(
    {
      name: 'projects',
      description: 'projects',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    mockMCPWeb
  );

  const deleter = result.tools[2];
  await deleter.handler({ all: true });

  expect(Object.keys(state)).toHaveLength(0);
});

// ============================================================================
// Mixed Object Tools
// ============================================================================

test('generateToolsForSchema() - mixed object generates root get/set + collection tools', () => {
  let state = {
    name: 'App',
    version: 1,
    todos: [] as string[],
    projects: {} as Record<string, { name: string }>,
  };
  const schema = z.object({
    name: z.string(),
    version: z.number(),
    todos: z.array(z.string()),
    projects: z.record(z.string(), z.object({ name: z.string() })),
  });

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'app',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    mockMCPWeb
  );

  // Root get + root set + todos (4 tools) + projects (3 tools) = 9 tools
  expect(result.tools).toHaveLength(9);

  const toolNames = result.tools.map((t) => t.name);
  expect(toolNames).toContain('get_app');
  expect(toolNames).toContain('set_app');
  expect(toolNames).toContain('get_app_todos');
  expect(toolNames).toContain('add_app_todos');
  expect(toolNames).toContain('set_app_todos');
  expect(toolNames).toContain('delete_app_todos');
  expect(toolNames).toContain('get_app_projects');
  expect(toolNames).toContain('set_app_projects');
  expect(toolNames).toContain('delete_app_projects');
});

test('generateToolsForSchema() - mixed object root get returns full state', async () => {
  let state = {
    name: 'App',
    todos: ['a', 'b'],
  };
  const schema = z.object({
    name: z.string(),
    todos: z.array(z.string()),
  });

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'app',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    mockMCPWeb
  );

  const getter = result.tools[0];
  const value = await getter.handler({});
  expect(value).toEqual({ name: 'App', todos: ['a', 'b'] });
});

test('generateToolsForSchema() - mixed object root get with excludeCollections returns only fixed props', async () => {
  let state = {
    name: 'App',
    version: 1,
    todos: ['a', 'b'],
  };
  const schema = z.object({
    name: z.string(),
    version: z.number(),
    todos: z.array(z.string()),
  });

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'app',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    mockMCPWeb
  );

  const getter = result.tools[0];
  const value = await getter.handler({ excludeCollections: true });
  expect(value).toEqual({ name: 'App', version: 1 });
});

test('generateToolsForSchema() - mixed object root set updates only fixed props', async () => {
  let state = {
    name: 'App',
    version: 1,
    todos: ['a', 'b'],
  };
  const schema = z.object({
    name: z.string(),
    version: z.number(),
    todos: z.array(z.string()),
  });

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'app',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    mockMCPWeb
  );

  const setter = result.tools[1];
  await setter.handler({ version: 2 });

  expect(state.version).toBe(2);
  expect(state.name).toBe('App');
  expect(state.todos).toEqual(['a', 'b']); // Unchanged
});

test('generateToolsForSchema() - mixed object generates separate tools for each collection', () => {
  let state = {
    name: 'App',
    todos: [] as string[],
    projects: {} as Record<string, { name: string }>,
  };
  const schema = z.object({
    name: z.string(),
    todos: z.array(z.string()),
    projects: z.record(z.string(), z.object({ name: z.string() })),
  });

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'app',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    mockMCPWeb
  );

  const toolNames = result.tools.map((t) => t.name);

  // Todos array tools
  expect(toolNames).toContain('get_app_todos');
  expect(toolNames).toContain('add_app_todos');
  expect(toolNames).toContain('set_app_todos');
  expect(toolNames).toContain('delete_app_todos');

  // Projects record tools
  expect(toolNames).toContain('get_app_projects');
  expect(toolNames).toContain('set_app_projects');
  expect(toolNames).toContain('delete_app_projects');
});

test('generateToolsForSchema() - object with only dynamic props generates no tools (edge case)', () => {
  let state = {
    todos: [] as string[],
    projects: {} as Record<string, { name: string }>,
  };
  const schema = z.object({
    todos: z.array(z.string()),
    projects: z.record(z.string(), z.object({ name: z.string() })),
  });

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'app',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    mockMCPWeb
  );

  // Object with only dynamic props is type:'dynamic' and subtype:'object'
  // This case is not handled in the tool generator, so no tools are generated
  // (This is an edge case - normally you'd want mixed object behavior)
  expect(result.tools).toHaveLength(0);
});

// ============================================================================
// Warnings
// ============================================================================

test('generateToolsForSchema() - warns about optional fields', () => {
  let state = { name: 'Test', email: undefined as string | undefined };
  const schema = z.object({
    name: z.string(),
    email: z.string().optional(),
  });

  const result = generateToolsForSchema(
    {
      name: 'user',
      description: 'user',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    mockMCPWeb
  );

  expect(result.warnings).toHaveLength(1);
  expect(result.warnings[0]).toContain('optional()');
  expect(result.warnings[0]).toContain('email');
  expect(result.warnings[0]).toContain('nullable()');
});
