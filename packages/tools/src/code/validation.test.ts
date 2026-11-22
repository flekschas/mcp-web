import { describe, expect, test } from 'bun:test';
import type { ToolDefinitionZod } from '@mcp-web/types';
import { z } from 'zod';
import { FunctionExecutor } from './function-executor.js';
import { CodeTool } from './index.js';
import { combineTransactions, stateTransaction } from './transaction.js';
import type { CodeToolOptions } from './types.js';

/** A todo list whose `add_todo` records every title it receives. */
function setup(options: Partial<CodeToolOptions> = {}) {
  const added: string[] = [];
  const tools: ToolDefinitionZod[] = [
    {
      name: 'add_todo',
      description: 'Add a todo',
      inputSchema: z.object({
        title: z.string(),
        priority: z.enum(['low', 'high']).default('low'),
      }),
      handler: async ({ title, priority }) => {
        added.push(`${title}:${priority}`);
        return { id: String(added.length) };
      },
    },
    {
      name: 'list_todos',
      description: 'List todos',
      inputSchema: z.object({ done: z.boolean().optional() }),
      handler: async () => [...added],
    },
  ];
  const tool = new CodeTool({
    tools,
    executor: new FunctionExecutor(),
    ...options,
  });
  return { tool, added };
}

describe('CodeTool — invalid arguments, collected', () => {
  test('the program runs to the end and every invalid call is reported', async () => {
    const { tool, added } = setup();
    const out = await tool.handler({
      code: [
        'await add_todo({ title: 1 });',
        "await add_todo({ title: 'ok' });",
        "await add_todo({ title: 'x', priority: 'urgent' });",
        "'done'",
      ].join('\n'),
    });

    expect(out.result).toBeUndefined();
    expect(out.error).toContain('2 call(s) were invalid and skipped');
    expect(out.error).toContain('Call 1 to add_todo');
    expect(out.error).toContain('→ at title');
    expect(out.error).toContain('Call 3 to add_todo');
    expect(out.error).toContain('→ at priority');
    expect(added).toEqual(['ok:low']);
  });

  test('an invalid call returns undefined to the program', async () => {
    const { tool } = setup();
    const out = await tool.handler({
      code: [
        'const r = await add_todo({});',
        'if (r !== undefined) throw new Error("not skipped");',
      ].join('\n'),
    });

    expect(out.error).toStartWith('1 call(s) were invalid and skipped');
    expect(out.error).not.toContain('not skipped');
  });

  test('a later runtime error is reported after the invalid calls', async () => {
    const { tool } = setup();
    const out = await tool.handler({
      code: 'const r = await add_todo({}); r.id',
    });

    expect(out.error).toContain('Call 1 to add_todo');
    expect(out.error).toContain('The program then stopped with an error:');
  });

  test('a transaction rolls the valid calls back', async () => {
    const calls: string[] = [];
    const { tool } = setup({
      transaction: {
        begin: () => calls.push('begin'),
        commit: () => calls.push('commit'),
        rollback: () => calls.push('rollback'),
      },
    });
    await tool.handler({
      code: "await add_todo({ title: 'ok' }); await add_todo({});",
    });

    expect(calls).toEqual(['begin', 'rollback']);
  });

  test('the next run starts with a clean slate', async () => {
    const { tool } = setup();
    await tool.handler({ code: 'await add_todo({})' });
    const out = await tool.handler({ code: "await add_todo({ title: 'ok' })" });

    expect(out.error).toBeUndefined();
    expect(out.result).toEqual({ id: '1' });
  });
});

describe('CodeTool — invalid arguments, thrown', () => {
  test('the first invalid call stops the program', async () => {
    const { tool, added } = setup({ validationErrors: 'throw' });
    const out = await tool.handler({
      code: "await add_todo({}); await add_todo({ title: 'never' });",
    });

    expect(out.error).toContain('Invalid call. Call 1 to add_todo');
    expect(added).toEqual([]);
  });

  test('the program can catch it', async () => {
    const { tool } = setup({ validationErrors: 'throw' });
    const out = await tool.handler({
      code: 'try { await add_todo({}); } catch (e) { "caught" }',
    });

    expect(out.error).toBeUndefined();
  });
});

describe('CodeTool — valid arguments', () => {
  test('handlers receive the parsed input, with defaults applied', async () => {
    const { tool, added } = setup();
    await tool.handler({ code: "await add_todo({ title: 'a' })" });

    expect(added).toEqual(['a:low']);
  });

  test('a call with no arguments is checked as an empty object', async () => {
    const { tool } = setup();
    const out = await tool.handler({ code: 'await list_todos()' });

    expect(out.error).toBeUndefined();
    expect(out.result).toEqual([]);
  });
});

describe('CodeTool — description of invalid arguments', () => {
  test('says invalid calls are collected by default', () => {
    expect(setup().tool.description).toContain(
      'A call with invalid arguments is skipped and returns undefined.',
    );
  });

  test('says invalid calls throw when configured to', () => {
    expect(setup({ validationErrors: 'throw' }).tool.description).toContain(
      'A call with invalid arguments throws an error.',
    );
  });
});

describe('CodeTool — hints', () => {
  const hints = {
    description: 'Titles are strings.',
    onError: (message: string) =>
      message.includes('title') ? 'Pass `title` as a string.' : undefined,
  };

  test('are appended to each matching invalid call', async () => {
    const { tool } = setup({ hints });
    const out = await tool.handler({
      code: "await add_todo({}); await add_todo({ title: 'x', priority: 1 })",
    });

    expect(out.error).toContain('→ at title\nHint: Pass `title` as a string.');
    expect(out.error?.match(/Hint:/g)).toHaveLength(1);
  });

  test('are appended to the error that stopped the program', async () => {
    const { tool } = setup({
      hints: { onError: (m) => (m.includes('r.id') ? 'Check r.' : undefined) },
    });
    const out = await tool.handler({ code: 'const r = undefined; r.id' });

    expect(out.error).toContain("(evaluating 'r.id')\nHint: Check r.");
  });

  test('are appended to syntax errors', async () => {
    const { tool } = setup({ hints: { onError: () => 'Use plain JS.' } });
    const out = await tool.handler({ code: 'const x: number = 1' });

    expect(out.error).toStartWith('Validation error:');
    expect(out.error).toContain(
      '\nHint: Use plain JS.\n\nNo tool call ran, so nothing changed.',
    );
  });

  test('are told which function an invalid call was to', async () => {
    const names: (string | undefined)[] = [];
    const onError = (_problem: string, name?: string) => {
      names.push(name);
      return undefined;
    };
    await setup({ hints: { onError } }).tool.handler({
      code: 'await add_todo({}); await add_todo({}); await list_todos(null)',
    });
    await setup({
      hints: { onError },
      validationErrors: 'throw',
    }).tool.handler({ code: 'await add_todo({})' });
    await setup({ hints: { onError } }).tool.handler({ code: 'null.x' });

    expect(names).toEqual(['add_todo', 'list_todos', 'add_todo', undefined]);
  });

  test('appear once when the invalid call throws', async () => {
    const { tool } = setup({ hints, validationErrors: 'throw' });
    const out = await tool.handler({ code: 'await add_todo({})' });

    expect(out.error?.match(/Hint:/g)).toHaveLength(1);
  });

  test('add a section to the description', () => {
    expect(setup({ hints }).tool.description).toContain(
      'Hints:\nTitles are strings.',
    );
  });
});

describe('CodeTool — what a failed run left applied', () => {
  test('says how many valid calls ran and that their changes stand', async () => {
    const { tool, added } = setup();
    const out = await tool.handler({
      code: "await add_todo({ title: 'milk' }); await add_todo({ title: 2 });",
    });

    expect(added).toEqual(['milk:low']);
    expect(out.error).toEndWith(
      '1 tool call(s) ran and what they changed stands. Send a complete ' +
        'program covering only the work that remains.',
    );
  });

  test('says nothing changed after a rollback', async () => {
    const { tool } = setup({
      transaction: { begin() {}, commit() {}, rollback() {} },
    });
    const out = await tool.handler({
      code: "await add_todo({ title: 'milk' }); await add_todo({ title: 2 });",
    });

    expect(out.error).toEndWith(
      'Its 1 tool call(s) were rolled back, so nothing changed.',
    );
  });

  test('says nothing changed when no call ran', async () => {
    const { tool } = setup();
    const out = await tool.handler({ code: 'await add_todo({})' });

    expect(out.error).toEndWith('No tool call ran, so nothing changed.');
  });
});

describe('CodeTool — reporting many invalid calls', () => {
  test('groups identical problems from one function', async () => {
    const { tool } = setup();
    const out = await tool.handler({
      code: 'for (let i = 0; i < 100; i++) await add_todo({ title: i });',
    });

    expect(out.error).toStartWith('100 call(s) were invalid and skipped');
    expect(out.error).toContain('Calls 1–100 to add_todo:');
    expect(out.error?.match(/→ at title/g)).toHaveLength(1);
  });

  test('lists the first ten groups with problems and the rest by position', async () => {
    const tool = new CodeTool({
      executor: new FunctionExecutor(),
      tools: [
        {
          name: 'add_rows',
          description: 'Add rows',
          inputSchema: z.object({
            rows: z.array(z.object({ id: z.string() })),
          }),
          handler: async () => undefined,
        },
      ],
    });
    // The bad row moves each call, so no two problems are the same.
    const out = await tool.handler({
      code:
        'for (let i = 0; i < 30; i++) {\n' +
        '  const rows = Array.from({ length: 30 }, () => ({ id: "x" }));\n' +
        '  rows[i] = {};\n' +
        '  await add_rows({ rows });\n' +
        '}',
    });

    expect(out.error).toStartWith('30 call(s) were invalid and skipped');
    expect(out.error?.match(/^Call \d+ to add_rows:\n/gm)).toHaveLength(10);
    expect(out.error).toContain('Calls 11–30 to add_rows: problems not shown.');
  });
});

describe('CodeTool — argument edge cases', () => {
  test('an explicit null is checked as null, not as no arguments', async () => {
    const { tool } = setup();
    const out = await tool.handler({ code: 'await list_todos(null)' });

    expect(out.error).toContain('Call 1 to list_todos');
  });

  test('a throwing hint callback leaves the original error', async () => {
    const { tool } = setup({
      hints: {
        onError: () => {
          throw new Error('hint broke');
        },
      },
    });
    const out = await tool.handler({ code: 'const x: number = 1' });

    expect(out.error).toStartWith('Validation error:');
    expect(out.error).not.toContain('hint broke');
  });

  test('the hint callback sees a runtime error as the same text either way', async () => {
    const seen: string[] = [];
    const { tool } = setup({
      hints: {
        onError: (m) => {
          seen.push(m);
          return undefined;
        },
      },
    });
    await tool.handler({ code: 'null.x' });
    await tool.handler({ code: 'await add_todo({}); null.x' });

    const runtime = seen.filter((m) => !m.startsWith('Call'));
    expect(runtime).toHaveLength(2);
    expect(runtime[0]).toBe(runtime[1]);
  });
});

describe('CodeTool — overlapping executions', () => {
  test("run one at a time, so one cannot clear the other's invalid calls", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls: string[] = [];
    const tool = new CodeTool({
      executor: new FunctionExecutor(),
      transaction: {
        begin: () => calls.push('begin'),
        commit: () => calls.push('commit'),
        rollback: () => calls.push('rollback'),
      },
      tools: [
        {
          name: 'add_todo',
          description: 'Add a todo',
          inputSchema: z.object({ title: z.string() }),
          handler: async () => 'ok',
        },
        {
          name: 'wait',
          description: 'Wait',
          handler: () => {
            waiting();
            return gate;
          },
        },
      ],
    });

    let waiting: () => void = () => {};
    const firstIsWaiting = new Promise<void>((resolve) => {
      waiting = resolve;
    });
    const first = tool.handler({
      code: "await add_todo({ title: 'a' }); await add_todo({}); await wait();",
    });
    // The second run arrives while the first is inside a call, which is when
    // it could reset the first's invalid calls if they shared a run.
    await firstIsWaiting;
    const second = tool.handler({ code: 'const x: number = 1' });
    release();

    expect((await first).error).toContain('Call 2 to add_todo');
    expect((await second).error).toStartWith('Validation error:');
    expect(calls).toEqual(['begin', 'rollback']);
  });
  test('a run that times out says how long it waited for an earlier one', async () => {
    const tool = new CodeTool({
      executor: new FunctionExecutor(),
      timeout: 200,
      tools: [
        {
          name: 'sleep',
          description: 'Wait',
          inputSchema: z.object({ ms: z.number() }),
          handler: ({ ms }) =>
            new Promise((resolve) => setTimeout(resolve, ms)),
        },
      ],
    });

    const first = tool.handler({ code: 'await sleep({ ms: 120 })' });
    const second = tool.handler({ code: 'await sleep({ ms: 120 })' });

    expect((await first).error).toBeUndefined();
    expect((await second).error).toMatch(
      /^Execution timed out after 200ms, \d+ms of which it waited for an earlier execution of this tool to finish/,
    );
  });
});

describe('CodeTool — queued executions', () => {
  test('a caller whose budget runs out while waiting is answered on time', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let marks = 0;
    const tool = new CodeTool({
      executor: new FunctionExecutor(),
      tools: [
        { name: 'wait', description: 'Wait', handler: () => gate },
        {
          name: 'mark',
          description: 'Mark',
          handler: async () => {
            marks++;
          },
        },
      ],
    });

    const first = tool.handler({ code: 'await wait()' });
    const started = performance.now();
    const second = await tool.handler(
      { code: 'await mark()' },
      { timeoutMs: 20 },
    );

    expect(performance.now() - started).toBeLessThan(500);
    expect(second.error).toContain('while waiting for an earlier execution');
    expect(tool.runLog).toEqual([{ input: 'full', failed: true }]);

    release();
    expect((await first).error).toBeUndefined();
    await tool.handler({ code: '1' });
    expect(marks).toBe(0);
    expect(tool.runLog).toHaveLength(3);
  });

  test('a caller with no budget left is answered and recorded', async () => {
    const { tool } = setup();
    const out = await tool.handler({ code: '1' }, { timeoutMs: 0 });

    expect(out.error).toContain('No time remained');
    expect(tool.runLog).toEqual([{ input: 'full', failed: true }]);
  });
});

describe('CodeTool — committing', () => {
  const recorder = (overrides: Partial<Record<string, () => void>> = {}) => {
    const calls: string[] = [];
    return {
      calls,
      transaction: {
        begin: () => calls.push('begin'),
        commit: overrides.commit ?? (() => calls.push('commit')),
        rollback: overrides.rollback ?? (() => calls.push('rollback')),
      },
    };
  };

  test('a commit that throws part-way reports the outcome as unknown', async () => {
    let counter = 0;
    const tool = new CodeTool({
      executor: new FunctionExecutor(),
      patch: { enabled: true },
      // The counter's snapshot is released before the second commit throws,
      // so a rollback could no longer restore it.
      transaction: combineTransactions(
        stateTransaction(
          () => counter,
          (value) => {
            counter = value;
          },
        ),
        {
          begin() {},
          commit() {
            throw new Error('disk full');
          },
          rollback() {},
        },
      ),
      tools: [
        {
          name: 'increment',
          description: 'Increment',
          handler: async () => {
            counter++;
          },
        },
      ],
    });
    const out = await tool.handler({ code: 'await increment()' });

    expect(out.error).toBe(
      'Committing the changes failed (disk full), so what the program ' +
        'changed is unknown.',
    );
    expect(counter).toBe(1);
    expect(tool.runLog).toEqual([{ input: 'full', failed: true }]);

    const edited = await tool.handler({
      code: [{ op: 'replace', lines: [1, 1], value: 'await increment()' }],
    });
    expect(edited.error).toContain('Cannot edit');
    expect(counter).toBe(1);
  });

  test('a snapshot that fails is reported and nothing runs', async () => {
    let ran = false;
    const tool = new CodeTool({
      executor: new FunctionExecutor(),
      transaction: stateTransaction(
        () => ({ onChange: () => {} }),
        () => {},
      ),
      tools: [
        {
          name: 'mark',
          description: 'Mark',
          handler: async () => {
            ran = true;
          },
        },
      ],
    });
    const out = await tool.handler({ code: 'await mark()' });

    expect(out.error).toStartWith('Taking a snapshot failed (');
    expect(out.error).toEndWith('), so nothing was run.');
    expect(ran).toBe(false);
    expect(tool.runLog).toEqual([{ input: 'full', failed: true }]);
  });

  test('a program does not start once a slow snapshot used up the budget', async () => {
    const calls: string[] = [];
    let ran = false;
    const tool = new CodeTool({
      executor: new FunctionExecutor(),
      transaction: {
        begin: () => {
          const until = performance.now() + 40;
          while (performance.now() < until) {}
          calls.push('begin');
        },
        commit: () => calls.push('commit'),
        rollback: () => calls.push('rollback'),
      },
      tools: [
        {
          name: 'mark',
          description: 'Mark',
          handler: async () => {
            ran = true;
          },
        },
      ],
    });
    const out = await tool.handler({ code: 'await mark()' }, { timeoutMs: 5 });

    expect(out.error).toContain('before the program started');
    expect(ran).toBe(false);
    expect(calls).toEqual(['begin', 'commit']);
  });

  test('waits for a call the program did not await before committing', async () => {
    const { calls, transaction } = recorder();
    const tool = new CodeTool({
      executor: new FunctionExecutor(),
      transaction,
      tools: [
        {
          name: 'save',
          description: 'Save',
          handler: async () => {
            await new Promise((resolve) => setTimeout(resolve, 20));
            calls.push('saved');
          },
        },
      ],
    });
    const out = await tool.handler({ code: 'save(); 1' });

    expect(out.result).toBe(1);
    expect(calls).toEqual(['begin', 'saved', 'commit']);
  });

  test('a rollback that throws is reported and retried before the next run', async () => {
    let failRollback = true;
    const { calls, transaction } = recorder({
      rollback: () => {
        if (failRollback) throw new Error('store locked');
        calls.push('rollback');
      },
    });
    const { tool } = setup({ transaction });
    const out = await tool.handler({ code: 'await add_todo({}); null.x' });

    expect(out.error).toContain(
      'Rolling back failed (store locked), so what the program changed is unknown.',
    );

    failRollback = false;
    const next = await tool.handler({ code: '1' });
    expect(next.result).toBe(1);
    expect(calls).toEqual(['begin', 'rollback', 'begin', 'commit']);
  });

  test('an error without a message still fails the run', async () => {
    const { calls, transaction } = recorder();
    const { tool } = setup({ transaction });
    const out = await tool.handler({
      code: "await add_todo({ title: 'a' }); throw new Error()",
    });

    expect(out.error).toStartWith('Error');
    expect(calls).toEqual(['begin', 'rollback']);
  });
});

describe('CodeTool — input schemas', () => {
  test("applies a transform in a tool's input schema once", async () => {
    const received: unknown[] = [];
    const tool = new CodeTool({
      executor: new FunctionExecutor(),
      tools: [
        {
          name: 'double',
          description: 'Double',
          inputSchema: z.object({ n: z.number().transform((n) => n * 2) }),
          handler: async (input) => {
            received.push(input);
          },
        },
      ],
    });
    await tool.handler({ code: 'await double({ n: 3 })' });

    expect(received).toEqual([{ n: 6 }]);
  });

  test('names a function whose schema needs async checks', async () => {
    const tool = new CodeTool({
      executor: new FunctionExecutor(),
      tools: [
        {
          name: 'add_user',
          description: 'Add a user',
          inputSchema: z.object({
            name: z.string().refine(async () => true),
          }),
          handler: async () => undefined,
        },
      ],
    });
    const out = await tool.handler({ code: "await add_user({ name: 'a' })" });

    expect(out.error).toContain(
      'The input schema of add_user has async checks',
    );
  });
});

describe('CodeTool — editing after a timeout', () => {
  test('offers no edit while a call is still running, and accepts one once it settles', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls: string[] = [];
    const tool = new CodeTool({
      executor: new FunctionExecutor(),
      timeout: 30,
      patch: { enabled: true },
      transaction: {
        begin: () => calls.push('begin'),
        commit: () => calls.push('commit'),
        rollback: () => calls.push('rollback'),
      },
      tools: [{ name: 'slow', description: 'Slow', handler: () => gate }],
    });

    const timedOut = await tool.handler({ code: 'await slow()' });
    expect(timedOut.error).toContain('timed out');
    expect(timedOut.error).not.toContain('edit against these line numbers');

    release();
    await gate;
    const edited = await tool.handler({
      code: [{ op: 'replace', lines: [1, 1], value: '2' }],
    });

    expect(edited.result).toBe(2);
    expect(calls).toEqual(['begin', 'rollback', 'begin', 'commit']);
  });
});
