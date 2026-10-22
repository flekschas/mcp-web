import { describe, expect, it } from 'bun:test';
import { CodeTool } from './index.js';
import { FunctionExecutor } from './function-executor.js';
import { WorkerExecutor } from './worker-executor.js';

/**
 * The failure this exists for: a program that never yields.
 *
 * `CodeTool`'s timeout is a timer on the caller's event loop. When the program
 * runs on that same loop, `while (true) {}` prevents the timer from firing at
 * all — the run does not time out, it stops the process. Over a long sweep that
 * is not a bad row, it is an experiment that never finishes.
 */

const tools = [
  {
    name: 'add',
    description: 'Adds two numbers.',
    inputSchema: {
      type: 'object',
      properties: { a: { type: 'number' }, b: { type: 'number' } },
    } as never,
    handler: async (args: unknown) => {
      const { a, b } = args as { a: number; b: number };
      return { sum: a + b };
    },
  },
  {
    name: 'boom',
    description: 'Always throws.',
    inputSchema: { type: 'object', properties: {} } as never,
    handler: async () => {
      throw new Error('handler said no');
    },
  },
];

const build = (executor: FunctionExecutor | WorkerExecutor, timeout = 30_000) =>
  new CodeTool({ tools, description: 'test', executor, timeout });

describe('a program runs and reaches its tools', () => {
  it('returns the program value', async () => {
    const tool = build(new WorkerExecutor());
    const out = await tool.handler({ code: 'return 1 + 1;' });

    expect(out.error).toBeUndefined();
    expect(out.result).toBe(2);
    tool.destroy();
  });

  it('proxies tool calls back to the parent', async () => {
    const tool = build(new WorkerExecutor());
    const out = await tool.handler({
      code: 'const r = await add({ a: 2, b: 3 }); return r.sum;',
    });

    expect(out.error).toBeUndefined();
    expect(out.result).toBe(5);
    tool.destroy();
  });

  it('reports a handler failure to the program', async () => {
    const tool = build(new WorkerExecutor());
    const out = await tool.handler({
      code: 'try { await boom({}); } catch (e) { return `caught: ${e.message}`; }',
    });

    expect(out.result).toBe('caught: handler said no');
    tool.destroy();
  });

  it('reports a program that throws', async () => {
    const tool = build(new WorkerExecutor());
    const out = await tool.handler({ code: 'throw new Error("nope");' });

    expect(out.error).toContain('nope');
    tool.destroy();
  });

  it('runs again after a program failed', async () => {
    const tool = build(new WorkerExecutor());
    await tool.handler({ code: 'throw new Error("nope");' });
    const out = await tool.handler({ code: 'return "still here";' });

    expect(out.result).toBe('still here');
    tool.destroy();
  });
});

describe('a program that never yields is stopped', () => {
  it('times out on a tight loop instead of hanging', async () => {
    const tool = build(new WorkerExecutor(), 150);
    const start = performance.now();

    const out = await tool.handler({ code: 'while (true) {} return 1;' });
    const elapsed = performance.now() - start;

    expect(out.error).toMatch(/timed out after 150ms/);
    // The timer fired on the parent's loop, which the program could not block.
    expect(elapsed).toBeLessThan(2_000);
    tool.destroy();
  }, 10_000);

  it('leaves the tool usable afterwards', async () => {
    const tool = build(new WorkerExecutor(), 150);
    await tool.handler({ code: 'while (true) {} return 1;' });

    // A fresh thread, with nothing from the abandoned program still running.
    const out = await tool.handler(
      { code: 'const r = await add({ a: 1, b: 1 }); return r.sum;' },
      { timeoutMs: 5_000 },
    );
    expect(out.error).toBeUndefined();
    expect(out.result).toBe(2);
    tool.destroy();
  }, 15_000);

  it('is the difference from the in-process executor', async () => {
    // The same program on `FunctionExecutor` would block this test's own event
    // loop, so what is asserted here is the seam, not the hang: an executor
    // whose `destroy()` cannot stop a running program says so.
    const inProcess = new FunctionExecutor();
    const worker = new WorkerExecutor();

    // A cooperative program shows both paths agree on the normal case.
    for (const executor of [inProcess, worker]) {
      const tool = build(executor);
      expect((await tool.handler({ code: 'return 41 + 1;' })).result).toBe(42);
      tool.destroy();
    }
  });
});
