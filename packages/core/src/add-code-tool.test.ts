import { describe, expect, test } from 'bun:test';
import {
  CodeTool,
  createCodeMode,
  FunctionExecutor,
} from '@mcp-web/tools/code';
import { z } from 'zod';
import { createStateTools } from './create-state-tools.js';
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
      'Two of the tools to register are named code.',
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

/** A `FunctionExecutor` that counts how often it was torn down. */
const countingExecutor = () => {
  const executor = new FunctionExecutor();
  const counter = { destroyed: 0 };
  executor.destroy = () => {
    counter.destroyed++;
  };
  return { executor, counter };
};

describe('MCPWeb.addCodeTool teardown', () => {
  test('tears the sandbox down once, on the first cleanup', () => {
    const mcp = build();
    const { executor, counter } = countingExecutor();
    const remove = mcp.addCodeTool(codeTool({ executor }));

    remove();
    remove();
    expect(counter.destroyed).toBe(1);
  });
});

describe('MCPWeb.addStateTools with codeMode', () => {
  const AppSchema = z.object({
    todos: z.array(z.string()),
    showCompleted: z.boolean(),
  });

  const stateConfig = () => {
    const store = { app: { todos: [] as string[], showCompleted: true } };
    return {
      store,
      config: {
        name: 'app',
        description: 'Todo app',
        get: () => store.app,
        set: (value: typeof store.app) => {
          store.app = value;
        },
        schema: AppSchema,
        expand: true as const,
        codeMode: createCodeMode({ executor: () => new FunctionExecutor() }),
      },
    };
  };

  test('registers the getter and the code tool, and returns both', () => {
    const mcp = build();
    const [getter, code, cleanup] = mcp.addStateTools(stateConfig().config);

    expect(mcp.getTools()).toEqual(['code_app', 'get_app']);
    expect(getter.name).toBe('get_app');
    expect(code.name).toBe('code_app');
    expect(code.description).toContain('async function add_app_todos');
    expect(code.description).toContain(
      'Read the current state with the `get_app` tool before changing it.',
    );

    cleanup();
    expect(mcp.getTools()).toEqual([]);
  });

  test('keeps a custom name and adds custom hints after the read-first hint', () => {
    const mcp = build();
    const { config } = stateConfig();
    const [, code] = mcp.addStateTools({
      ...config,
      codeMode: createCodeMode({
        name: 'run',
        executor: () => new FunctionExecutor(),
        hints: { description: 'Keep todos short.' },
      }),
    });

    expect(code.name).toBe('run');
    expect(code.description).toContain(
      'Read the current state with the `get_app` tool before changing it.\nKeep todos short.',
    );
  });

  test('refuses a code tool named like the getter, registering nothing', () => {
    const mcp = build();
    const { config } = stateConfig();

    expect(() =>
      mcp.addStateTools({
        ...config,
        codeMode: createCodeMode({
          name: 'get_app',
          executor: () => new FunctionExecutor(),
        }),
      }),
    ).toThrow('Two of the tools to register are named get_app.');
    expect(mcp.getTools()).toEqual([]);
  });

  test('refuses a getter whose name is already registered', () => {
    const mcp = build();
    mcp.addTool({ name: 'get_app', description: 'Taken', handler: () => {} });

    expect(() => mcp.addStateTools(stateConfig().config)).toThrow(
      'A tool named get_app is already registered.',
    );
    expect(mcp.getTools()).toEqual(['get_app']);
  });

  test('an old cleanup leaves tools registered again alone', () => {
    const mcp = build();
    const { config } = stateConfig();
    const [, , cleanupFirst] = mcp.addStateTools(config);
    cleanupFirst();
    mcp.addStateTools(config);
    cleanupFirst();

    expect(mcp.getTools()).toEqual(['code_app', 'get_app']);
  });

  test('cleanup tears the sandbox down', () => {
    const mcp = build();
    const { executor, counter } = countingExecutor();
    const [, , cleanup] = mcp.addStateTools({
      ...stateConfig().config,
      codeMode: createCodeMode({ executor: () => executor }),
    });

    cleanup();
    expect(counter.destroyed).toBe(1);
  });

  test('refuses a schema that generates no tools', () => {
    const mcp = build();

    expect(() =>
      mcp.addStateTools({
        name: 'when',
        description: 'A date',
        get: () => new Date(),
        set: () => {},
        schema: z.date(),
        expand: true,
        codeMode: createCodeMode({ executor: () => new FunctionExecutor() }),
      }),
    ).toThrow('The schema of when generated no tools');
  });

  test('gives each code tool its own executor', () => {
    const mcp = build();
    let made = 0;
    const codeMode = createCodeMode({
      executor: () => {
        made++;
        return new FunctionExecutor();
      },
    });
    mcp.addStateTools({ ...stateConfig().config, codeMode });
    mcp.addStateTools({ ...stateConfig().config, name: 'other', codeMode });

    expect(made).toBe(2);
  });

  test('cleanup works before the default sandbox was ever used', () => {
    const mcp = build();
    const [, , cleanup] = mcp.addStateTools({
      ...stateConfig().config,
      codeMode: createCodeMode(),
    });

    expect(() => cleanup()).not.toThrow();
    expect(mcp.getTools()).toEqual([]);
  });

  test('freezes the config, so its code mode matches the created tools', () => {
    const created = createStateTools({
      ...stateConfig().config,
      codeMode: undefined,
    });

    expect(() => {
      (created.config as { codeMode?: unknown }).codeMode = createCodeMode();
    }).toThrow();
    expect(created.codeMode).toBe(false);
  });

  test('accepts tools from createStateTools', () => {
    const mcp = build();
    mcp.addStateTools(createStateTools(stateConfig().config));

    expect(mcp.getTools()).toEqual(['code_app', 'get_app']);
  });

  test('rolls back the state when a program fails', async () => {
    const mcp = build();
    const { store, config } = stateConfig();
    mcp.addStateTools(config);
    const run = (code: string) => mcp.tools.get('code_app')?.handler({ code });

    await run("await add_app_todos({ value: 'milk' })");
    const out = await run(
      "await add_app_todos({ value: 'eggs' }); throw new Error('stop');",
    );

    expect(out).toHaveProperty('error');
    expect(store.app.todos).toEqual(['milk']);
  });
});
