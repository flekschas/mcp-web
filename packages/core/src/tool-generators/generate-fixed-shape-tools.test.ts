import { expect, test } from 'bun:test';
import { z } from 'zod';
import { generateFixedShapeTools } from './generate-fixed-shape-tools.js';
import { analyzeSchemaShape } from './schema-analysis.js';
import { system } from './schema-helpers.js';

// ============================================================================
// Primitive Tools
// ============================================================================

test('generateFixedShapeTools() - generates get + set for string', () => {
  let state = 'initial';
  const schema = z.string();
  const shape = analyzeSchemaShape(schema);

  const tools = generateFixedShapeTools(
    {
      name: 'text',
      description: 'text value',
      get: () => state,
      set: (value) => {
        state = value as string;
      },
      schema,
    },
    shape
  );

  expect(tools).toHaveLength(2);
  expect(tools[0].name).toBe('get_text');
  expect(tools[1].name).toBe('set_text');
});

test('generateFixedShapeTools() - get returns current value', async () => {
  let state = 'hello';
  const schema = z.string();
  const shape = analyzeSchemaShape(schema);

  const tools = generateFixedShapeTools(
    {
      name: 'text',
      description: 'text value',
      get: () => state,
      set: (value) => {
        state = value as string;
      },
      schema,
    },
    shape
  );

  const getter = tools[0];
  const result = await getter.handler({});
  expect(result).toBe('hello');
});

test('generateFixedShapeTools() - set uses full replacement for primitives', async () => {
  let state = 'initial';
  const schema = z.string();
  const shape = analyzeSchemaShape(schema);

  const tools = generateFixedShapeTools(
    {
      name: 'text',
      description: 'text value',
      get: () => state,
      set: (value) => {
        state = value as string;
      },
      schema,
    },
    shape
  );

  const setter = tools[1];
  const result = await setter.handler({ value: 'updated' });

  expect(result).toEqual({ success: true, value: 'updated' });
  expect(state).toBe('updated');
});

test('generateFixedShapeTools() - set validates with schema', async () => {
  let state = 5;
  const schema = z.number().min(0).max(10);
  const shape = analyzeSchemaShape(schema);

  const tools = generateFixedShapeTools(
    {
      name: 'count',
      description: 'count value',
      get: () => state,
      set: (value) => {
        state = value as number;
      },
      schema,
    },
    shape
  );

  const setter = tools[1];

  // Valid value
  await setter.handler({ value: 7 });
  expect(state).toBe(7);

  // Invalid value (out of range) should throw
  try {
    await setter.handler({ value: 15 });
    expect(true).toBe(false); // Should not reach here
  } catch (error) {
    expect(error).toBeDefined();
  }
});

test('generateFixedShapeTools() - generates get + set for number', () => {
  let state = 42;
  const schema = z.number();
  const shape = analyzeSchemaShape(schema);

  const tools = generateFixedShapeTools(
    {
      name: 'count',
      description: 'count value',
      get: () => state,
      set: (value) => {
        state = value as number;
      },
      schema,
    },
    shape
  );

  expect(tools).toHaveLength(2);
  expect(tools[0].name).toBe('get_count');
  expect(tools[1].name).toBe('set_count');
});

test('generateFixedShapeTools() - generates get + set for boolean', () => {
  let state = true;
  const schema = z.boolean();
  const shape = analyzeSchemaShape(schema);

  const tools = generateFixedShapeTools(
    {
      name: 'active',
      description: 'active flag',
      get: () => state,
      set: (value) => {
        state = value as boolean;
      },
      schema,
    },
    shape
  );

  expect(tools).toHaveLength(2);
  expect(tools[0].name).toBe('get_active');
  expect(tools[1].name).toBe('set_active');
});

// ============================================================================
// Tuple Tools
// ============================================================================

test('generateFixedShapeTools() - generates get + set for tuple', () => {
  let state: [string, number, boolean] = ['hello', 42, true];
  const schema = z.tuple([z.string(), z.number(), z.boolean()]);
  const shape = analyzeSchemaShape(schema);

  const tools = generateFixedShapeTools(
    {
      name: 'coords',
      description: 'coordinates',
      get: () => state,
      set: (value) => {
        state = value as [string, number, boolean];
      },
      schema,
    },
    shape
  );

  expect(tools).toHaveLength(2);
  expect(tools[0].name).toBe('get_coords');
  expect(tools[1].name).toBe('set_coords');
});

test('generateFixedShapeTools() - set uses full replacement for tuples', async () => {
  let state: [number, number] = [10, 20];
  const schema = z.tuple([z.number(), z.number()]);
  const shape = analyzeSchemaShape(schema);

  const tools = generateFixedShapeTools(
    {
      name: 'coords',
      description: 'coordinates',
      get: () => state,
      set: (value) => {
        state = value as [number, number];
      },
      schema,
    },
    shape
  );

  const setter = tools[1];
  const result = await setter.handler({ value: [30, 40] });

  expect(result).toEqual({ success: true, value: [30, 40] });
  expect(state).toEqual([30, 40]);
});

// ============================================================================
// Fixed Object Tools
// ============================================================================

test('generateFixedShapeTools() - generates get + set for fixed-shape object', () => {
  let state = { name: 'Alice', age: 30 };
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });
  const shape = analyzeSchemaShape(schema);

  const tools = generateFixedShapeTools(
    {
      name: 'user',
      description: 'user data',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    shape
  );

  expect(tools).toHaveLength(2);
  expect(tools[0].name).toBe('get_user');
  expect(tools[1].name).toBe('set_user');
});

test('generateFixedShapeTools() - set uses partial update with deep merge', async () => {
  let state = {
    name: 'Alice',
    age: 30,
    settings: { theme: 'dark', notifications: true },
  };
  const schema = z.object({
    name: z.string(),
    age: z.number(),
    settings: z.object({
      theme: z.string(),
      notifications: z.boolean(),
    }),
  });
  const shape = analyzeSchemaShape(schema);

  const tools = generateFixedShapeTools(
    {
      name: 'user',
      description: 'user data',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    shape
  );

  const setter = tools[1];

  // Partial update - only change age
  await setter.handler({ age: 31 });
  expect(state.age).toBe(31);
  expect(state.name).toBe('Alice'); // Unchanged
  expect(state.settings).toEqual({ theme: 'dark', notifications: true }); // Unchanged

  // Partial update - nested object
  await setter.handler({ settings: { theme: 'light' } });
  expect(state.settings.theme).toBe('light');
  expect(state.settings.notifications).toBe(true); // Preserved via deep merge
});

test('generateFixedShapeTools() - set excludes system fields from input schema', () => {
  let state = { id: 'abc', name: 'Alice', created_at: 123456 };
  const schema = z.object({
    id: system(z.string().default(() => crypto.randomUUID())),
    name: z.string(),
    created_at: system(z.number().default(() => Date.now())),
  });
  const shape = analyzeSchemaShape(schema);

  const tools = generateFixedShapeTools(
    {
      name: 'user',
      description: 'user data',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    shape
  );

  const setter = tools[1];
  const inputSchema = setter.inputSchema as z.ZodObject<z.ZodRawShape>;

  // System fields should not be in input schema
  expect('id' in inputSchema.shape).toBe(false);
  expect('created_at' in inputSchema.shape).toBe(false);
  expect('name' in inputSchema.shape).toBe(true);
});

test('generateFixedShapeTools() - set makes all fields optional', () => {
  let state = { name: 'Alice', age: 30, email: 'alice@example.com' };
  const schema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string(),
  });
  const shape = analyzeSchemaShape(schema);

  const tools = generateFixedShapeTools(
    {
      name: 'user',
      description: 'user data',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    shape
  );

  const setter = tools[1];
  const inputSchema = setter.inputSchema as z.ZodObject<z.ZodRawShape>;

  // All fields should be optional
  const emptyResult = inputSchema.safeParse({});
  expect(emptyResult.success).toBe(true);

  const partialResult = inputSchema.safeParse({ name: 'Bob' });
  expect(partialResult.success).toBe(true);
});

test('generateFixedShapeTools() - deep merge preserves unspecified fields', async () => {
  let state = {
    user: {
      name: 'Alice',
      email: 'alice@example.com',
      profile: {
        bio: 'Hello',
        avatar: 'avatar.png',
      },
    },
  };
  const schema = z.object({
    user: z.object({
      name: z.string(),
      email: z.string(),
      profile: z.object({
        bio: z.string(),
        avatar: z.string(),
      }),
    }),
  });
  const shape = analyzeSchemaShape(schema);

  const tools = generateFixedShapeTools(
    {
      name: 'data',
      description: 'data',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    shape
  );

  const setter = tools[1];

  // Update only deeply nested field
  await setter.handler({
    user: { profile: { bio: 'Updated bio' } },
  });

  expect(state.user.name).toBe('Alice'); // Preserved
  expect(state.user.email).toBe('alice@example.com'); // Preserved
  expect(state.user.profile.bio).toBe('Updated bio'); // Updated
  expect(state.user.profile.avatar).toBe('avatar.png'); // Preserved
});

test('generateFixedShapeTools() - set returns success response with value', async () => {
  let state = { name: 'Alice', age: 30 };
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });
  const shape = analyzeSchemaShape(schema);

  const tools = generateFixedShapeTools(
    {
      name: 'user',
      description: 'user data',
      get: () => state,
      set: (value) => {
        state = value as typeof state;
      },
      schema,
    },
    shape
  );

  const setter = tools[1];
  const result = await setter.handler({ age: 31 });

  expect(result).toHaveProperty('success', true);
  expect(result).toHaveProperty('value');
  expect((result as { value: typeof state }).value).toEqual({
    name: 'Alice',
    age: 31,
  });
});
