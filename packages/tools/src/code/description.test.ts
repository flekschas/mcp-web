import { describe, expect, test } from 'bun:test';
import ts from 'typescript';
import { z } from 'zod';
import { generateCodeToolDescription } from './description.js';

// ---------------------------------------------------------------------------
// Helpers for TypeScript validity tests
// ---------------------------------------------------------------------------

/** Extract the TS code block between "Available:" and "Write plain JavaScript" */
function extractTypeScriptBlock(description: string): string {
  const marker = 'Available functions:\n';
  const start = description.indexOf(marker);
  if (start === -1) throw new Error('Missing "Available:" marker');
  const end = description.indexOf('\nWrite plain JavaScript');
  if (end === -1) throw new Error('Missing closing marker');
  return description.slice(start + marker.length, end).trim();
}

/** Convert `async function …` (no body) to `declare function …;` */
function toAmbientDeclarations(code: string): string {
  return code
    .split('\n')
    .map((line) =>
      line.startsWith('async function ')
        ? `declare function ${line.slice('async function '.length)};`
        : line,
    )
    .join('\n');
}

/** Run the TypeScript compiler on in-memory code, return error messages. */
function getTypeScriptErrors(code: string): string[] {
  const fileName = '/virtual/test.ts';
  const options: ts.CompilerOptions = {
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2020,
    types: [], // don't include @types/* from node_modules
    skipLibCheck: true,
  };

  const host = ts.createCompilerHost(options);
  const realGetSourceFile = host.getSourceFile.bind(host);

  host.getSourceFile = (name, languageVersionOrOptions, onError, create) =>
    name === fileName
      ? ts.createSourceFile(name, code, ts.ScriptTarget.ES2020, true)
      : realGetSourceFile(name, languageVersionOrOptions, onError, create);
  host.fileExists = (name) =>
    name === fileName || ts.sys.fileExists(name);
  host.readFile = (name) =>
    name === fileName ? code : ts.sys.readFile(name);

  const program = ts.createProgram([fileName], options, host);
  return [
    ...program.getSyntacticDiagnostics(),
    ...program.getSemanticDiagnostics(),
  ]
    .filter((d) => d.category === ts.DiagnosticCategory.Error)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

/** Generate a description and assert its TS code block compiles cleanly. */
function assertValidTypeScript(
  tools: Parameters<typeof generateCodeToolDescription>[0],
) {
  const description = generateCodeToolDescription(tools);
  const tsBlock = extractTypeScriptBlock(description);
  const declarations = toAmbientDeclarations(tsBlock);
  const errors = getTypeScriptErrors(declarations);
  if (errors.length > 0) {
    throw new Error(
      `Generated TypeScript has errors:\n${errors.join('\n')}\n\nCode:\n${declarations}`,
    );
  }
}

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

    expect(description).toContain('Execute code');
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

    expect(description).toContain("'light'");
    expect(description).toContain("'dark'");
    expect(description).toContain("'system'");
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

    expect(description).toContain('id:');
    expect(description).toContain('name?:');
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

    expect(description).toContain('Execute code');
    expect(description).toContain('Top-level await');
    expect(description).toContain('last expression is the result');
    expect(description).toContain('plain JavaScript');
  });

  test('extracts complex types into named aliases', () => {
    const tools = [
      {
        name: 'add_todo',
        description: 'Add a todo',
        handler: () => ({ success: true }),
        inputSchema: z.object({
          value: z.string(),
          priority: z.number(),
          tags: z.array(z.string()),
        }),
      },
    ];

    const description = generateCodeToolDescription(tools);

    expect(description).toContain('type AddTodoInput');
    expect(description).toContain('params: AddTodoInput');
  });

  test('includes @param descriptions from .describe()', () => {
    const tools = [
      {
        name: 'search',
        description: 'Search items',
        handler: () => [],
        inputSchema: z.object({
          query: z.string().describe('The search query string'),
          limit: z.number().describe('Max results to return'),
        }),
      },
    ];

    const description = generateCodeToolDescription(tools);

    expect(description).toContain('@param params.query');
    expect(description).toContain('The search query string');
    expect(description).toContain('@param params.limit');
    expect(description).toContain('Max results to return');
  });
});

// ---------------------------------------------------------------------------
// TypeScript validity – ensure generated code compiles
// ---------------------------------------------------------------------------

describe('TypeScript validity of generated code', () => {
  test('validator catches actual TypeScript errors (sanity check)', () => {
    const errors = getTypeScriptErrors(
      'declare function bad(x: NonExistentType): void;',
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  test('simple tool without schemas', () => {
    assertValidTypeScript([
      { name: 'ping', description: 'Ping', handler: () => 'pong' },
    ]);
  });

  test('tool with object input schema', () => {
    assertValidTypeScript([
      {
        name: 'add_item',
        description: 'Add an item',
        handler: () => ({ success: true }),
        inputSchema: z.object({
          title: z.string(),
          count: z.number(),
          active: z.boolean(),
        }),
      },
    ]);
  });

  test('tool with output schema', () => {
    assertValidTypeScript([
      {
        name: 'get_items',
        description: 'Get all items',
        handler: () => [],
        outputSchema: z.array(
          z.object({ id: z.string(), value: z.string() }),
        ),
      },
    ]);
  });

  test('tool with both input and output schemas', () => {
    assertValidTypeScript([
      {
        name: 'search',
        description: 'Search for items',
        handler: () => [],
        inputSchema: z.object({
          query: z.string(),
          limit: z.number().optional(),
        }),
        outputSchema: z.array(
          z.object({ id: z.string(), score: z.number() }),
        ),
      },
    ]);
  });

  test('tool with enum types', () => {
    assertValidTypeScript([
      {
        name: 'set_theme',
        description: 'Set the theme',
        handler: () => undefined,
        inputSchema: z.object({
          theme: z.enum(['light', 'dark', 'system']),
        }),
      },
    ]);
  });

  test('tool with optional fields', () => {
    assertValidTypeScript([
      {
        name: 'update_item',
        description: 'Update an item',
        handler: () => ({ success: true }),
        inputSchema: z.object({
          id: z.string(),
          name: z.string().optional(),
          tags: z.array(z.string()).optional(),
        }),
      },
    ]);
  });

  test('tool with nested objects', () => {
    assertValidTypeScript([
      {
        name: 'create_user',
        description: 'Create a user',
        handler: () => ({ success: true }),
        inputSchema: z.object({
          name: z.string(),
          address: z.object({
            street: z.string(),
            city: z.string(),
            zip: z.string(),
          }),
        }),
      },
    ]);
  });

  test('multiple tools generate valid TypeScript together', () => {
    assertValidTypeScript([
      {
        name: 'get_todos',
        description: 'Get all todos',
        handler: () => [],
        outputSchema: z.array(
          z.object({
            id: z.string(),
            text: z.string(),
            done: z.boolean(),
          }),
        ),
      },
      {
        name: 'add_todo',
        description: 'Add a new todo',
        handler: () => ({ success: true }),
        inputSchema: z.object({
          text: z.string(),
          priority: z.number(),
        }),
      },
      {
        name: 'delete_todo',
        description: 'Delete a todo by ID',
        handler: () => ({ success: true }),
        inputSchema: z.object({ id: z.string() }),
      },
    ]);
  });

  test('tool with array of objects input', () => {
    assertValidTypeScript([
      {
        name: 'bulk_add',
        description: 'Add multiple items',
        handler: () => ({ count: 0 }),
        inputSchema: z.object({
          items: z.array(
            z.object({ name: z.string(), value: z.number() }),
          ),
        }),
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// JSDoc well-formedness
// ---------------------------------------------------------------------------

describe('JSDoc generation', () => {
  test('includes tool description in JSDoc', () => {
    const desc = generateCodeToolDescription([
      {
        name: 'my_tool',
        description: 'Does something useful for the user',
        handler: () => undefined,
      },
    ]);
    const tsBlock = extractTypeScriptBlock(desc);

    expect(tsBlock).toContain('/**');
    expect(tsBlock).toContain(' * Does something useful for the user');
    expect(tsBlock).toContain(' */');
  });

  test('includes @param tags from .describe() metadata', () => {
    const desc = generateCodeToolDescription([
      {
        name: 'search',
        description: 'Search items',
        handler: () => [],
        inputSchema: z.object({
          query: z.string().describe('The search query string'),
          limit: z.number().describe('Maximum number of results'),
        }),
      },
    ]);
    const tsBlock = extractTypeScriptBlock(desc);

    expect(tsBlock).toContain(
      '@param params.query - The search query string',
    );
    expect(tsBlock).toContain(
      '@param params.limit - Maximum number of results',
    );
  });

  test('JSDoc blocks are well-formed (open and close correctly)', () => {
    const desc = generateCodeToolDescription([
      {
        name: 'test_tool',
        description: 'A test tool',
        handler: () => undefined,
        inputSchema: z.object({
          x: z.string().describe('The X value'),
        }),
      },
    ]);
    const tsBlock = extractTypeScriptBlock(desc);

    const jsdocBlocks = tsBlock.match(/\/\*\*[\s\S]*?\*\//g);
    expect(jsdocBlocks).not.toBeNull();
    expect(jsdocBlocks!.length).toBeGreaterThan(0);

    for (const block of jsdocBlocks!) {
      expect(block.startsWith('/**')).toBe(true);
      expect(block.endsWith('*/')).toBe(true);

      const lines = block.split('\n');
      for (let i = 1; i < lines.length - 1; i++) {
        expect(lines[i]!.trimStart().startsWith('*')).toBe(true);
      }
    }
  });

  test('omits JSDoc when tool has no description', () => {
    const desc = generateCodeToolDescription([
      { name: 'no_desc', description: '', handler: () => undefined },
    ]);
    const tsBlock = extractTypeScriptBlock(desc);
    expect(tsBlock).not.toContain('/**');
  });
});
