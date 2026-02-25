import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { id } from './zod-schema-to-tools/index.js';
import { zodSchemasToTools } from './zod-schemas-to-tools.js';

describe('zodSchemasToTools', () => {
  test('generates tools from an array schema', () => {
    const ItemSchema = z.object({
      id: id(z.string()),
      value: z.string(),
    });

    let state = [{ id: '1', value: 'test' }];

    const tools = zodSchemasToTools({
      name: 'items',
      description: 'List of items',
      schema: z.array(ItemSchema),
      get: () => state,
      set: (v) => {
        state = v;
      },
    });

    expect(tools.length).toBeGreaterThan(0);

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('get_items');
    expect(toolNames).toContain('add_items');
    expect(toolNames).toContain('set_items');
    expect(toolNames).toContain('delete_items');
  });

  test('generates tools from a record schema', () => {
    const ProjectSchema = z.object({
      title: z.string(),
    });

    let state: Record<string, { title: string }> = {};

    const tools = zodSchemasToTools({
      name: 'projects',
      description: 'Project map',
      schema: z.record(z.string(), ProjectSchema),
      get: () => state,
      set: (v) => {
        state = v;
      },
    });

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('get_projects');
    expect(toolNames).toContain('set_projects');
    expect(toolNames).toContain('delete_projects');
  });

  test('generates tools from a mixed object schema', () => {
    const AppSchema = z.object({
      theme: z.enum(['light', 'dark']),
      items: z.array(
        z.object({
          id: id(z.string()),
          value: z.string(),
        }),
      ),
    });

    let state = { theme: 'light' as const, items: [] as Array<{ id: string; value: string }> };

    const tools = zodSchemasToTools({
      name: 'app',
      description: 'App state',
      schema: AppSchema,
      get: () => state,
      set: (v) => {
        state = v;
      },
    });

    const toolNames = tools.map((t) => t.name);
    // Should have root get/set plus collection tools for items
    expect(toolNames).toContain('get_app');
    expect(toolNames).toContain('set_app');
    expect(toolNames).toContain('get_app_items');
  });

  test('uses default name when not provided', () => {
    let state = 'hello';

    const tools = zodSchemasToTools({
      schema: z.string(),
      get: () => state,
      set: (v) => {
        state = v;
      },
    });

    expect(tools.length).toBeGreaterThan(0);
    const toolNames = tools.map((t) => t.name);
    expect(toolNames.some((n) => n.startsWith('get_'))).toBe(true);
  });

  test('all generated tools have handlers', () => {
    const tools = zodSchemasToTools({
      name: 'counter',
      description: 'A counter',
      schema: z.number(),
      get: () => 0,
      set: () => {},
    });

    for (const tool of tools) {
      expect(typeof tool.handler).toBe('function');
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
    }
  });
});
