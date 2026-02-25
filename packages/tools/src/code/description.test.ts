import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { generateCodeToolDescription } from './description.js';

describe('generateCodeToolDescription', () => {
  test('generates description with function signatures', () => {
    const tools = [
      {
        name: 'get_todos',
        description: 'Get all todos',
        handler: () => [],
        outputSchema: z.array(
          z.object({ id: z.string(), value: z.string() }),
        ),
      },
    ];

    const description = generateCodeToolDescription(tools);

    expect(description).toContain('Execute JavaScript code');
    expect(description).toContain('async function get_todos');
    expect(description).toContain('Get all todos');
  });

  test('handles tools with input schemas', () => {
    const tools = [
      {
        name: 'add_todo',
        description: 'Add a todo',
        handler: () => ({ success: true }),
        inputSchema: z.object({
          value: z.string(),
          priority: z.number(),
        }),
      },
    ];

    const description = generateCodeToolDescription(tools);

    expect(description).toContain('async function add_todo');
    expect(description).toContain('params:');
    expect(description).toContain('value');
    expect(description).toContain('string');
    expect(description).toContain('priority');
    expect(description).toContain('number');
  });

  test('handles tools without input schemas', () => {
    const tools = [
      {
        name: 'get_state',
        description: 'Get current state',
        handler: () => ({}),
      },
    ];

    const description = generateCodeToolDescription(tools);

    expect(description).toContain('async function get_state()');
  });

  test('handles enum types', () => {
    const tools = [
      {
        name: 'set_theme',
        description: 'Set app theme',
        handler: () => ({ success: true }),
        inputSchema: z.object({
          theme: z.enum(['light', 'dark', 'system']),
        }),
      },
    ];

    const description = generateCodeToolDescription(tools);

    expect(description).toContain('light');
    expect(description).toContain('dark');
    expect(description).toContain('system');
  });

  test('handles optional fields', () => {
    const tools = [
      {
        name: 'update_item',
        description: 'Update an item',
        handler: () => ({ success: true }),
        inputSchema: z.object({
          id: z.string(),
          name: z.string().optional(),
        }),
      },
    ];

    const description = generateCodeToolDescription(tools);

    expect(description).toContain('id');
    expect(description).toContain('name?');
  });

  test('handles array output schemas', () => {
    const tools = [
      {
        name: 'list_items',
        description: 'List all items',
        handler: () => [],
        outputSchema: z.array(z.string()),
      },
    ];

    const description = generateCodeToolDescription(tools);

    expect(description).toContain('Promise<string[]>');
  });

  test('multiple tools are all included', () => {
    const tools = [
      {
        name: 'get_todos',
        description: 'Get todos',
        handler: () => [],
      },
      {
        name: 'add_todo',
        description: 'Add a todo',
        handler: () => ({ success: true }),
        inputSchema: z.object({ value: z.string() }),
      },
      {
        name: 'delete_todo',
        description: 'Delete a todo',
        handler: () => ({ success: true }),
        inputSchema: z.object({ id: z.string() }),
      },
    ];

    const description = generateCodeToolDescription(tools);

    expect(description).toContain('get_todos');
    expect(description).toContain('add_todo');
    expect(description).toContain('delete_todo');
  });

  test('includes preamble and closing instructions', () => {
    const tools = [
      {
        name: 'noop',
        description: 'No-op',
        handler: () => undefined,
      },
    ];

    const description = generateCodeToolDescription(tools);

    expect(description).toContain('sandboxed environment');
    expect(description).toContain('Top-level await');
    expect(description).toContain('last expression');
  });
});
