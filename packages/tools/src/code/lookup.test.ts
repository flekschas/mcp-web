import { describe, expect, test } from 'bun:test';
import type { ToolDefinitionZod } from '@mcp-web/types';
import { z } from 'zod';
import { FunctionExecutor } from './function-executor.js';
import { CodeTool } from './index.js';
import { LOOKUP_LIMIT } from './lookup.js';

const TOOLS: ToolDefinitionZod[] = [
  {
    name: 'add_todo',
    description: 'Add a todo\nMore detail that the index leaves out.',
    inputSchema: z.object({ title: z.string() }),
    handler: async ({ title }) => ({ title }),
  },
  {
    name: 'list_todos',
    description: 'List todos',
    handler: async () => [],
  },
];

/** Looks names up through the tool's lookup tool. */
function lookUp(tool: CodeTool, names: string[]) {
  if (!tool.lookupTool) throw new Error('no lookup tool');
  return tool.lookupTool.handler({ names });
}

const build = () =>
  new CodeTool({
    tools: TOOLS,
    executor: new FunctionExecutor(),
    signatures: 'lookup',
  });

describe('CodeTool — signatures by lookup', () => {
  test('the description lists names and first lines, not signatures', () => {
    const { description } = build();

    expect(description).toContain('- add_todo: Add a todo\n');
    expect(description).toContain('- list_todos: List todos');
    expect(description).not.toContain('More detail');
    expect(description).not.toContain('async function');
    expect(description).toContain('get_code_signature({ names: [...] })');
  });

  test('returns a function named like an Object prototype key', () => {
    const tool = new CodeTool({
      tools: [
        { name: '__proto__', description: 'Odd', handler: async () => 1 },
      ],
      executor: new FunctionExecutor(),
      signatures: 'lookup',
    });
    const out = lookUp(tool, ['__proto__']);

    expect(Object.keys(out.signatures)).toEqual(['__proto__']);
  });

  test('a call before the lookup is an invalid call', async () => {
    const tool = build();
    const out = await tool.handler({ code: "await add_todo({ title: 'a' })" });

    expect(out.error).toContain('Call 1 to add_todo:');
    expect(out.error).toContain(
      'add_todo has not been looked up. Get its signature with the ' +
        'get_code_signature tool',
    );
  });

  test('a function not looked up never resolves to a JavaScript global', async () => {
    const tool = new CodeTool({
      tools: [
        { name: 'isNaN', description: 'App check', handler: () => 'app' },
      ],
      executor: new FunctionExecutor(),
      signatures: 'lookup',
    });
    const out = await tool.handler({ code: 'await isNaN()' });

    expect(out.error).toContain('isNaN has not been looked up');
  });

  test('two code tools get their own lookup tools', () => {
    const a = new CodeTool({
      tools: TOOLS,
      name: 'a',
      signatures: 'lookup',
      executor: new FunctionExecutor(),
    });
    const b = new CodeTool({
      tools: TOOLS,
      name: 'b',
      signatures: 'lookup',
      executor: new FunctionExecutor(),
    });

    expect(a.lookupTool?.name).toBe('get_a_signature');
    expect(b.lookupTool?.name).toBe('get_b_signature');
  });

  test('a defaulted field reads as optional', () => {
    const tool = new CodeTool({
      tools: [
        {
          name: 'step',
          description: 'Step',
          inputSchema: z.object({ n: z.number().default(3) }),
          handler: () => null,
        },
      ],
      executor: new FunctionExecutor(),
      signatures: 'lookup',
    });

    expect(lookUp(tool, ['step']).signatures.step).toContain('n?: number');
  });

  test('a lookup returns signatures and makes them callable', async () => {
    const tool = build();
    const lookup = lookUp(tool, ['add_todo']);

    expect(lookup.signatures.add_todo).toContain('title: string');
    expect(lookup.signatures.add_todo).toContain(
      'async function add_todo(params: AddTodoInput)',
    );
    const out = await tool.handler({ code: "await add_todo({ title: 'a' })" });
    expect(out.error).toBeUndefined();
    expect(out.result).toEqual({ title: 'a' });
  });

  test('a lookup reports unknown names', () => {
    const lookup = lookUp(build(), ['nope', 'add_todo']);

    expect(Object.keys(lookup.signatures)).toEqual(['add_todo']);
    expect(lookup.unknown).toEqual(['nope']);
  });

  test('a lookup rejects more names than the limit', () => {
    const names = Array.from({ length: LOOKUP_LIMIT + 1 }, (_, i) => `f${i}`);

    expect(build().lookupTool?.inputSchema.safeParse({ names }).success).toBe(
      false,
    );
  });

  test('there is no lookup tool when signatures are inline', () => {
    const tool = new CodeTool({
      tools: TOOLS,
      executor: new FunctionExecutor(),
    });

    expect(tool.lookupTool).toBeNull();
    expect(tool.description).toContain('async function add_todo');
  });
});
