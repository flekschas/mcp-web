import { describe, expect, test } from 'bun:test';
import type { ComponentType } from 'react';
import { z } from 'zod';
import { createApp, isCreatedApp } from '../src/create-app';

// Mock components for testing
const MockComponent: ComponentType<{ value: number }> = () => null;
const MockResultComponent: ComponentType<{ result: string }> = () => null;
const MockInputComponent: ComponentType<{
  greeting: string;
  doubled: number;
}> = () => null;
const MockEmptyComponent: ComponentType<Record<string, unknown>> = () => null;
const MockOutputComponent: ComponentType<{ output: string }> = () => null;
const MockAsyncComponent: ComponentType<{ async: boolean }> = () => null;

describe('createApp', () => {
  test('creates a valid app definition', () => {
    const app = createApp({
      name: 'test_app',
      description: 'A test app',
      component: MockComponent,
      handler: () => ({ value: 42 }),
    });

    expect(app.__brand).toBe('CreatedApp');
    expect(app.definition.name).toBe('test_app');
    expect(app.definition.description).toBe('A test app');
    expect(typeof app.definition.handler).toBe('function');
    expect(app.definition.component).toBe(MockComponent);
  });

  test('preserves handler functionality', async () => {
    const app = createApp({
      name: 'handler_test',
      description: 'Test handler',
      component: MockResultComponent,
      handler: () => ({ result: 'success' }),
    });

    const result = await app.definition.handler();
    expect(result).toEqual({ result: 'success' });
  });

  test('handler receives input when inputSchema is defined', async () => {
    const InputSchema = z.object({
      name: z.string(),
      count: z.number(),
    });

    const app = createApp({
      name: 'input_test',
      description: 'Test input',
      component: MockInputComponent,
      inputSchema: InputSchema,
      handler: ({ name, count }) => ({
        greeting: `Hello ${name}`,
        doubled: count * 2,
      }),
    });

    const result = await app.definition.handler({ name: 'World', count: 21 });
    expect(result).toEqual({
      greeting: 'Hello World',
      doubled: 42,
    });
  });

  test('preserves optional url and resourceUri', () => {
    const app = createApp({
      name: 'custom_urls',
      description: 'Custom URLs',
      component: MockEmptyComponent,
      handler: () => ({}),
      url: '/custom/app.html',
      resourceUri: 'ui://custom/app',
    });

    expect(app.definition.url).toBe('/custom/app.html');
    expect(app.definition.resourceUri).toBe('ui://custom/app');
  });

  test('preserves inputSchema and propsSchema', () => {
    const InputSchema = z.object({ input: z.string() });
    const PropsSchema = z.object({ output: z.string() });

    const app = createApp({
      name: 'schema_test',
      description: 'Schema test',
      component: MockOutputComponent,
      inputSchema: InputSchema,
      propsSchema: PropsSchema,
      handler: ({ input }) => ({ output: input.toUpperCase() }),
    });

    expect(app.definition.inputSchema).toBe(InputSchema);
    expect(app.definition.propsSchema).toBe(PropsSchema);
  });

  test('throws error for invalid app definition - missing name', () => {
    expect(() => {
      createApp({
        name: '',
        description: 'Test',
        component: MockEmptyComponent,
        handler: () => ({}),
      });
    }).toThrow('Invalid app definition');
  });

  test('throws error for invalid app definition - missing description', () => {
    expect(() => {
      createApp({
        name: 'test',
        description: '',
        component: MockEmptyComponent,
        handler: () => ({}),
      });
    }).toThrow('Invalid app definition');
  });

  test('async handler works correctly', async () => {
    const app = createApp({
      name: 'async_test',
      description: 'Async handler test',
      component: MockAsyncComponent,
      handler: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { async: true };
      },
    });

    const result = await app.definition.handler();
    expect(result).toEqual({ async: true });
  });
});

describe('isCreatedApp', () => {
  test('returns true for CreatedApp', () => {
    const app = createApp({
      name: 'test',
      description: 'test',
      component: MockEmptyComponent,
      handler: () => ({}),
    });

    expect(isCreatedApp(app)).toBe(true);
  });

  test('returns false for null', () => {
    expect(isCreatedApp(null)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isCreatedApp(undefined)).toBe(false);
  });

  test('returns false for plain object', () => {
    expect(isCreatedApp({})).toBe(false);
  });

  test('returns false for object with wrong brand', () => {
    expect(isCreatedApp({ __brand: 'NotCreatedApp' })).toBe(false);
  });

  test('returns false for app definition without brand', () => {
    expect(
      isCreatedApp({
        name: 'test',
        description: 'test',
        handler: () => ({}),
      })
    ).toBe(false);
  });

  test('returns false for primitives', () => {
    expect(isCreatedApp('string')).toBe(false);
    expect(isCreatedApp(123)).toBe(false);
    expect(isCreatedApp(true)).toBe(false);
  });
});
