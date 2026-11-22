import { describe, expect, test } from 'bun:test';
import { CodeTool, FunctionExecutor } from '@mcp-web/tools/code';
import { z } from 'zod';
import { MCPWeb } from './web.js';

const todos: string[] = [];
const addTodo = {
  name: 'add_todo',
  description: 'Add a todo',
  inputSchema: z.object({ title: z.string() }),
  handler: async ({ title }: { title: string }) => {
    todos.push(title);
    return todos.length;
  },
};

const build = () =>
  new MCPWeb({ name: 'test', description: 'Test app', autoConnect: false });

const codeTool = (
  options: Partial<ConstructorParameters<typeof CodeTool>[0]> = {},
) =>
  new CodeTool({
    tools: [addTodo],
    executor: new FunctionExecutor(),
    ...options,
  });

describe('MCPWeb.addCodeTool', () => {
  test('registers only the code tool, which calls the wrapped tools', async () => {
    const mcp = build();
    mcp.addCodeTool(codeTool());

    expect(mcp.getTools()).toEqual(['code']);
    const out = await mcp.tools
      .get('code')
      ?.handler({ code: "await add_todo({ title: 'milk' })" });
    expect(out).toEqual({ result: 1 });
  });

  test('also registers the lookup tool when signatures are looked up', () => {
    const mcp = build();
    mcp.addCodeTool(codeTool({ signatures: 'lookup' }));

    expect(mcp.getTools()).toEqual(['code', 'get_code_signature']);
  });

  test('returns a function that removes both tools', () => {
    const mcp = build();
    const code = codeTool({ signatures: 'lookup' });
    const remove = mcp.addCodeTool(code);
    remove();

    expect(mcp.getTools()).toEqual([]);
    mcp.addCodeTool(code);
    expect(mcp.getTools()).toEqual(['code', 'get_code_signature']);
  });

  test('a cleanup leaves tools registered again under the same names', () => {
    const mcp = build();
    const code = codeTool({ signatures: 'lookup' });
    const removeFirst = mcp.addCodeTool(code);
    removeFirst();
    mcp.addCodeTool(code);
    removeFirst();

    expect(mcp.getTools()).toEqual(['code', 'get_code_signature']);
  });

  test('refuses a pair whose two tools share a name', () => {
    const mcp = build();
    const tool = { ...addTodo, name: 'code', handler: () => {} };

    expect(() => mcp.addCodeTool({ ...tool, lookupTool: tool })).toThrow(
      'The code tool and its lookup tool are both named code.',
    );
    expect(mcp.getTools()).toEqual([]);
  });

  test('registers neither tool when the second is refused', () => {
    const mcp = build();
    const code = { ...addTodo, name: 'code', handler: () => {} };
    const lookupTool = {
      ...code,
      name: 'lookup',
      inputSchema: z.object({ n: z.number().transform((n) => n * 2) }),
    };

    expect(() => mcp.addCodeTool({ ...code, lookupTool })).toThrow(
      'Transforms cannot be represented',
    );
    expect(mcp.getTools()).toEqual([]);
  });

  test('refuses a name that is already registered', () => {
    const mcp = build();
    mcp.addTool({
      name: 'get_code_signature',
      description: 'Taken',
      handler: () => {},
    });

    expect(() => mcp.addCodeTool(codeTool({ signatures: 'lookup' }))).toThrow(
      'A tool named get_code_signature is already registered.',
    );
    expect(mcp.getTools()).toEqual(['get_code_signature']);
  });
});
