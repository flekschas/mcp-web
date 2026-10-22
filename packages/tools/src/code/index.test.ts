import type { ToolDefinitionZod } from '@mcp-web/types';
import { afterEach, describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { CodeTool } from './index.js';
import type { PatchOp } from './patch.js';

const TOOLS: ToolDefinitionZod[] = [
  {
    name: 'add_todo',
    description: 'Add a todo',
    inputSchema: z.object({ title: z.string() }),
    outputSchema: z.object({ id: z.string() }),
    handler: async () => ({ id: '1' }),
  },
];

/**
 * Stands in for the sandboxed iframe, which cannot run under bun test.
 *
 * The message plumbing is faithful — the tool sees a `ready` signal, posts
 * `execute` to `contentWindow`, and gets an `execution_result` back on a
 * `message` event whose `source` is that same window.
 */
function installSandbox(): {
  /** Programs handed to the sandbox, post-transform, in order. */
  executed: string[];
  /** Execution id of the most recent `execute` message. */
  lastExecutionId: string | null;
  /** Iframes the tool has built. Grows when one is torn down and replaced. */
  iframeCount: number;
  /** `function_result` replies the parent sent back, in order. */
  results: Array<{ callId: string; result?: unknown; error?: string }>;
  /** Makes a proxied call as the running program would. */
  call: (name: string, args?: unknown, executionId?: string) => void;
  /**
   * Decides what each execution returns. Defaults to a plain result; `null`
   * means the sandbox never answers, so the tool's timeout fires.
   */
  onExecute: (code: string) => { result?: unknown; error?: string } | null;
  restore: () => void;
} {
  const listeners = new Set<(event: MessageEvent) => void>();
  const contentWindow = {
    postMessage: (
      msg:
        | { type: 'execute'; id: string; code: string }
        | {
            type: 'function_result';
            callId: string;
            result?: unknown;
            error?: string;
          },
    ) => {
      if (msg.type === 'function_result') {
        harness.results.push({
          callId: msg.callId,
          result: msg.result,
          error: msg.error,
        });
        return;
      }
      if (msg.type !== 'execute') return;
      harness.executed.push(msg.code);
      harness.lastExecutionId = msg.id;
      const outcome = harness.onExecute(msg.code);
      if (outcome === null) return;
      queueMicrotask(() =>
        dispatch({ type: 'execution_result', id: msg.id, ...outcome }),
      );
    },
  };

  const dispatch = (data: unknown, source: unknown = contentWindow) => {
    const event = { source, data } as unknown as MessageEvent;
    for (const listener of [...listeners]) listener(event);
  };

  const iframe = {
    sandbox: { add: () => {} },
    style: {} as Record<string, string>,
    srcdoc: '',
    contentWindow,
    remove: () => {},
  };

  let callCounter = 0;

  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;

  Object.defineProperty(globalThis, 'window', {
    value: {
      addEventListener: (type: string, fn: (e: MessageEvent) => void) => {
        if (type === 'message') listeners.add(fn);
      },
      removeEventListener: (_type: string, fn: (e: MessageEvent) => void) => {
        listeners.delete(fn);
      },
    },
    configurable: true,
    writable: true,
  });

  Object.defineProperty(globalThis, 'document', {
    value: {
      createElement: () => {
        harness.iframeCount++;
        return iframe;
      },
      body: {
        appendChild: () => {
          // The iframe signals readiness once it is in the document. Deferred
          // by a microtask because the tool only stores the element — and so
          // only starts matching `event.source` — after appendChild returns.
          queueMicrotask(() => dispatch({ type: 'ready' }));
        },
      },
    },
    configurable: true,
    writable: true,
  });

  const harness = {
    executed: [] as string[],
    lastExecutionId: null as string | null,
    iframeCount: 0,
    results: [] as Array<{ callId: string; result?: unknown; error?: string }>,
    call: (name: string, args: unknown = {}, executionId?: string) => {
      callCounter += 1;
      dispatch({
        type: 'function_call',
        id: executionId ?? harness.lastExecutionId,
        callId: `call-${callCounter}`,
        name,
        args,
      });
    },
    onExecute: (_code: string) =>
      ({ result: 'ok' }) as { result?: unknown; error?: string } | null,
    restore: () => {
      Object.defineProperty(globalThis, 'window', {
        value: previousWindow,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'document', {
        value: previousDocument,
        configurable: true,
        writable: true,
      });
    },
  };

  return harness;
}

let sandbox: ReturnType<typeof installSandbox> | null = null;

afterEach(() => {
  sandbox?.restore();
  sandbox = null;
});

function createTool(patchEnabled: boolean): CodeTool {
  return new CodeTool({ tools: TOOLS, patch: { enabled: patchEnabled } });
}

/** Runs the tool the way the MCP layer would. */
function run(tool: CodeTool, code: string | PatchOp[]) {
  return tool.handler({ code });
}

/** `Array#at(-1)`, which the ES2020 lib target does not provide. */
function last<T>(items: readonly T[]): T | undefined {
  return items[items.length - 1];
}

describe('CodeTool — input schema', () => {
  test('advertises a plain string when patching is off', () => {
    const schema = z.toJSONSchema(createTool(false).inputSchema) as {
      properties: { code: Record<string, unknown> };
    };
    expect(schema.properties.code.type).toBe('string');
    expect(schema.properties.code.anyOf).toBeUndefined();
  });

  test('advertises string-or-edits when patching is on', () => {
    const schema = z.toJSONSchema(createTool(true).inputSchema) as {
      properties: { code: { anyOf: Array<Record<string, unknown>> } };
    };
    const branches = schema.properties.code.anyOf;
    expect(branches).toHaveLength(2);
    expect(branches[0].type).toBe('string');
    expect(branches[1].type).toBe('array');
    expect(JSON.stringify(branches[1])).toContain('insert');
  });

  test('line numbers carry no safe-integer bound', () => {
    // `.int()` would emit `maximum: 9007199254740991` twice — tokens spent on
    // a limit no line number approaches.
    const schema = JSON.stringify(z.toJSONSchema(createTool(true).inputSchema));
    expect(schema).not.toContain('maximum');
    expect(schema).toContain('"type":"integer"');
    expect(schema).toContain('"minimum":1');
  });

  test('line numbers are still integer-checked at runtime', () => {
    const schema = createTool(true).inputSchema;
    expect(
      schema.safeParse({ code: [{ op: 'delete', lines: [1.5, 2] }] }).success,
    ).toBe(false);
  });

  test('the schema still parses both shapes', () => {
    const schema = createTool(true).inputSchema;
    expect(schema.safeParse({ code: 'const a = 1' }).success).toBe(true);
    expect(
      schema.safeParse({ code: [{ op: 'delete', lines: [1, 1] }] }).success,
    ).toBe(true);
  });
});

describe('CodeTool — description', () => {
  test('omits patch usage when patching is off', () => {
    expect(createTool(false).description).not.toContain('Fixing a failed');
  });

  test('includes patch usage when patching is on', () => {
    const description = createTool(true).description;
    expect(description).toContain('Fixing a failed program');
    expect(description).toContain('"op": "replace"');
    // The instructions must name the real precondition, not just "after a
    // failed run" — a patch after a run that called anything is always refused.
    expect(description).toContain(
      'Only possible after a run that failed *before* calling any function',
    );
  });

  test('an explicit description overrides both', () => {
    const tool = new CodeTool({
      tools: TOOLS,
      description: 'custom',
      patch: { enabled: true },
    });
    expect(tool.description).toBe('custom');
  });
});

describe('CodeTool — numbered source on failure', () => {
  test('a validation failure echoes the program with line numbers', async () => {
    const tool = createTool(true);
    const { error } = await run(tool, 'const a = 1\nconst b = {');

    expect(error).toContain('Validation error');
    expect(error).toContain('1 | const a = 1');
    expect(error).toContain('2 | const b = {');
  });

  test('no echo when patching is off', async () => {
    const tool = createTool(false);
    const { error } = await run(tool, 'const a = 1\nconst b = {');

    expect(error).toContain('Validation error');
    expect(error).not.toContain('1 | ');
  });

  test('the echo is the program as written, not the transformed one', async () => {
    sandbox = installSandbox();
    sandbox.onExecute = () => ({ error: 'ReferenceError: boom' });

    const tool = createTool(true);
    const { error } = await run(tool, 'const a = 1\na + b');

    // The sandbox runs a rewritten last expression …
    expect(sandbox.executed[0]).toContain('return (a + b)');
    // … but the model is shown, and patches against, what it wrote.
    expect(error).toContain('2 | a + b');
    expect(error).not.toContain('return (a + b)');
  });

  test('echoed numbers are the ones a patch resolves against', async () => {
    const program = ['const a = 1', 'const b = {', 'const c = 3'].join('\n');
    const tool = createTool(true);
    const { error } = await run(tool, program);

    expect(error).toContain('2 | const b = {');

    const { error: second } = await run(tool, [
      { op: 'replace', lines: [2, 2], value: 'const b = }' },
    ]);
    // The same anchor still points at line 2 of the program that was echoed.
    expect(second).toContain('2 | const b = }');
    expect(second).toContain('1 | const a = 1');
    expect(second).toContain('3 | const c = 3');
  });
});

describe('CodeTool — patch gating', () => {
  test('edits before any run are rejected', async () => {
    const tool = createTool(true);
    const { error } = await run(tool, [
      { op: 'replace', lines: [1, 1], value: 'x' },
    ]);
    expect(error).toContain('no program has been run yet');
  });

  test('edits after a successful run are rejected', async () => {
    sandbox = installSandbox();
    const tool = createTool(true);

    const first = await run(tool, 'const a = 1');
    expect(first.error).toBeUndefined();
    expect(first.result).toBe('ok');

    const { error } = await run(tool, [
      { op: 'replace', lines: [1, 1], value: 'const a = 2' },
    ]);
    expect(error).toContain('ran successfully');
    expect(sandbox.executed).toHaveLength(1);
  });

  test('edits are rejected outright when patching is off', async () => {
    const tool = createTool(false);
    await run(tool, 'const a = {');

    const { error } = await run(tool, [
      { op: 'replace', lines: [1, 1], value: 'const a = 1' },
    ]);
    expect(error).toContain('not enabled');
    expect(last(tool.runLog)?.rejection).toBe('patching-disabled');
  });

  test('edits after a run that committed tool calls are rejected', async () => {
    sandbox = installSandbox();
    sandbox.onExecute = () => {
      // Two todos land, then the program dies on the third construct.
      sandbox?.call('add_todo', { title: 'a' });
      sandbox?.call('add_todo', { title: 'b' });
      return { error: 'TypeError: cannot read properties of undefined' };
    };

    const tool = createTool(true);
    await run(tool, ['add_todo({})', 'add_todo({})', 'boom.x'].join('\n'));

    const { error } = await run(tool, [
      { op: 'replace', lines: [3, 3], value: 'const x = 1' },
    ]);
    expect(error).toContain('started 2 tool call(s)');
    expect(error).toContain('work that remains');
    expect(last(tool.runLog)?.rejection).toBe('previous-run-started-calls');
    // Only the first program reached the sandbox.
    expect(sandbox.executed).toHaveLength(1);
  });

  test('a failure that called tools says so instead of offering line numbers', async () => {
    sandbox = installSandbox();
    sandbox.onExecute = () => {
      sandbox?.call('add_todo', { title: 'a' });
      return { error: 'TypeError: boom' };
    };

    const tool = createTool(true);
    const { error } = await run(tool, 'add_todo({})\nboom.x');

    // Showing numbered lines here would invite an edit that is certain to be
    // refused, spending a turn to learn what this message already knows.
    expect(error).toContain('TypeError: boom');
    expect(error).toContain('cannot be edited');
    expect(error).toContain('started 1 tool call(s)');
    expect(error).not.toContain('1 | add_todo({})');
    expect(error).not.toContain('edit against these line numbers');
  });

  test('edits after a run that failed before committing are allowed', async () => {
    sandbox = installSandbox();
    sandbox.onExecute = (code) =>
      code.includes('boom')
        ? { error: 'ReferenceError: boom is not defined' }
        : { result: 'ok' };

    const tool = createTool(true);
    await run(tool, 'boom()\nadd_todo({})');

    const { error } = await run(tool, [
      { op: 'replace', lines: [1, 1], value: 'const x = 1' },
    ]);
    expect(error).toBeUndefined();
  });

  test('the committed-call count is per attempt, not cumulative', async () => {
    sandbox = installSandbox();
    sandbox.onExecute = () => {
      sandbox?.call('add_todo', { title: 'a' });
      return { result: 'ok' };
    };

    const tool = createTool(true);
    await run(tool, 'add_todo({})');

    // A syntax error never reaches the sandbox, so it commits nothing — the
    // previous attempt's call must not carry over and block this patch.
    sandbox.onExecute = () => ({ result: 'ok' });
    await run(tool, 'const a = {');
    const { error } = await run(tool, [
      { op: 'replace', lines: [1, 1], value: 'const a = 1' },
    ]);
    expect(error).toBeUndefined();
  });

  test('a rejected edit leaves the buffer intact', async () => {
    const tool = createTool(true);
    await run(tool, 'const a = 1\nconst b = {');

    const rejected = await run(tool, [
      { op: 'replace', lines: [9, 9], value: 'x' },
    ]);
    expect(rejected.error).toContain('does not exist');
    // The previous program is still echoed, so the retry can re-aim.
    expect(rejected.error).toContain('2 | const b = {');

    const { error } = await run(tool, [
      { op: 'replace', lines: [2, 2], value: 'const b = }' },
    ]);
    expect(error).toContain('2 | const b = }');
  });
});

describe('CodeTool — patching across attempts', () => {
  test('a successful edit runs the assembled program', async () => {
    sandbox = installSandbox();
    const tool = createTool(true);

    await run(tool, 'const a = 1\nconst b = {\nconst c = 3');
    const { result, error } = await run(tool, [
      { op: 'replace', lines: [2, 2], value: 'const b = 2' },
    ]);

    expect(error).toBeUndefined();
    expect(result).toBe('ok');
    expect(sandbox.executed).toEqual([
      'const a = 1\nconst b = 2\nconst c = 3',
    ]);
  });

  test('a second edit anchors to the first edit result', async () => {
    sandbox = installSandbox();
    sandbox.onExecute = (code) =>
      code.includes('boom')
        ? { error: 'ReferenceError: boom is not defined' }
        : { result: 'ok' };

    const tool = createTool(true);

    // Attempt 1: three lines, fails at runtime.
    await run(tool, ['const a = 1', 'boom()', 'const c = 3'].join('\n'));

    // Attempt 2: an insert shifts everything below it down by one, and still
    // fails.
    const second = await run(tool, [
      { op: 'insert', lines: [1, 1], value: '// header' },
    ]);
    expect(second.error).toContain('boom');
    expect(second.error).toContain('3 | boom()');

    // Attempt 3: anchored at the *new* line 3, not the original line 2.
    const third = await run(tool, [
      { op: 'replace', lines: [3, 3], value: 'const b = 2' },
    ]);
    expect(third.error).toBeUndefined();
    expect(last(sandbox.executed)).toBe(
      ['// header', 'const a = 1', 'const b = 2', 'const c = 3'].join('\n'),
    );
  });

  test('a failed edit result is itself patchable', async () => {
    const tool = createTool(true);

    await run(tool, 'const a = 1\nconst b = {');
    // Still a syntax error, so the buffer keeps the patched program.
    const second = await run(tool, [
      { op: 'replace', lines: [2, 2], value: 'const b = (' },
    ]);
    expect(second.error).toContain('2 | const b = (');

    const third = await run(tool, [
      { op: 'replace', lines: [2, 2], value: 'const b = [' },
    ]);
    expect(third.error).toContain('2 | const b = [');
  });

  test('a timed-out run counts as a failure and is patchable', async () => {
    sandbox = installSandbox();
    sandbox.onExecute = () => null; // the sandbox never answers

    const tool = new CodeTool({
      tools: TOOLS,
      timeout: 5,
      patch: { enabled: true },
    });

    const { error } = await run(tool, 'const a = 1\nwhile (true) {}');
    expect(error).toContain('timed out');
    expect(error).toContain('2 | while (true) {}');
    expect(last(tool.runLog)?.failed).toBe(true);

    sandbox.onExecute = () => ({ result: 'ok' });
    const { error: second } = await run(tool, [
      { op: 'replace', lines: [2, 2], value: 'const b = 2' },
    ]);
    expect(second).toBeUndefined();
  });

  test('a timed-out run that had committed is not patchable', async () => {
    sandbox = installSandbox();
    sandbox.onExecute = () => {
      sandbox?.call('add_todo', { title: 'a' });
      return null; // hangs after committing
    };

    const tool = new CodeTool({
      tools: TOOLS,
      timeout: 5,
      patch: { enabled: true },
    });

    await run(tool, 'add_todo({})\nwhile (true) {}');
    const { error } = await run(tool, [
      { op: 'delete', lines: [2, 2] },
    ]);
    expect(error).toContain('started 1 tool call(s)');
  });
});

describe('CodeTool — runaway executions', () => {
  test('the sandbox is torn down on timeout and rebuilt for the next run', async () => {
    sandbox = installSandbox();
    sandbox.onExecute = () => null;

    const tool = new CodeTool({ tools: TOOLS, timeout: 5 });

    const { error } = await run(tool, 'while (true) {}');
    expect(error).toContain('timed out');
    expect(sandbox.iframeCount).toBe(1);

    // Without teardown the wedged iframe would never answer again, so every
    // later run would time out too.
    sandbox.onExecute = () => ({ result: 'ok' });
    const { result } = await run(tool, 'const a = 1');
    expect(result).toBe('ok');
    expect(sandbox.iframeCount).toBe(2);
  });

  test('the next program waits for a handler still running after a timeout', async () => {
    sandbox = installSandbox();

    // A handler the test controls, standing in for a slow app action. Tearing
    // down the iframe cannot cancel it — it is already running out here.
    let release!: () => void;
    const handlerDone = new Promise<void>((resolve) => {
      release = resolve;
    });
    let applied = 0;

    const tool = new CodeTool({
      tools: [
        {
          ...TOOLS[0],
          handler: async () => {
            await handlerDone;
            applied++;
            return { id: '1' };
          },
        },
      ],
      timeout: 20,
    });

    sandbox.onExecute = () => {
      sandbox?.call('add_todo', { title: 'slow' });
      return null; // never answers, so the execution times out
    };

    const first = await run(tool, 'await add_todo({})');
    expect(first.error).toContain('timed out');
    expect(applied).toBe(0); // still mid-flight

    sandbox.onExecute = () => ({ result: 'ok' });

    let secondSettled = false;
    const second = run(tool, 'const a = 1').then((outcome) => {
      secondSettled = true;
      return outcome;
    });

    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(secondSettled).toBe(false); // blocked on the leftover handler
    expect(sandbox.executed).toHaveLength(1);

    release();
    const { result } = await second;
    expect(result).toBe('ok');
    // The handler finished before the next program started, not during it.
    expect(applied).toBe(1);
    expect(sandbox.executed).toHaveLength(2);
  });

  test('a handler that never settles blocks the next run instead of racing it', async () => {
    sandbox = installSandbox();

    const tool = new CodeTool({
      tools: [{ ...TOOLS[0], handler: () => new Promise(() => {}) }],
      timeout: 20,
    });

    sandbox.onExecute = () => {
      sandbox?.call('add_todo', { title: 'wedged' });
      return null;
    };
    await run(tool, 'await add_todo({})');

    sandbox.onExecute = () => ({ result: 'ok' });
    const { error, result } = await run(tool, 'const a = 1');

    expect(result).toBeUndefined();
    expect(error).toContain('still running');
    expect(error).toContain('Nothing was run');
    // The point of refusing: the second program never reached the sandbox.
    expect(sandbox.executed).toHaveLength(1);
    expect(last(tool.runLog)?.failed).toBe(true);
  });

  test('a timed-out program cannot keep calling tools', async () => {
    sandbox = installSandbox();
    sandbox.onExecute = () => null;

    let applied = 0;
    const tool = new CodeTool({
      tools: [{ ...TOOLS[0], handler: async () => ({ id: String(++applied) }) }],
      timeout: 5,
    });

    await run(tool, 'while (true) { add_todo({}) }');

    // The zombie fires a call after the tool has already reported the timeout.
    sandbox.call('add_todo', { title: 'late' });
    await Promise.resolve();
    expect(applied).toBe(0);
  });

  test('calls tagged with a stale execution id are refused', async () => {
    sandbox = installSandbox();

    let applied = 0;
    const tool = new CodeTool({
      tools: [{ ...TOOLS[0], handler: async () => ({ id: String(++applied) }) }],
    });

    await run(tool, 'const a = 1');

    // The iframe reuses one `currentExecutionId` global, so a zombie's calls
    // arrive tagged with whichever execution started most recently.
    sandbox.call('add_todo', {}, 'some-older-execution');
    await Promise.resolve();

    expect(applied).toBe(0);
    expect(last(sandbox.results)?.error).toContain('no longer active');
  });

  test('calls arriving after the result are refused', async () => {
    sandbox = installSandbox();

    let applied = 0;
    const tool = new CodeTool({
      tools: [{ ...TOOLS[0], handler: async () => ({ id: String(++applied) }) }],
    });

    await run(tool, 'const a = 1');

    // Same execution id, but the run has already been answered.
    sandbox.call('add_todo', {}, sandbox.lastExecutionId ?? undefined);
    await Promise.resolve();

    expect(applied).toBe(0);
    expect(last(sandbox.results)?.error).toContain('no longer active');
  });

  test('calls during an active execution are serviced and counted', async () => {
    sandbox = installSandbox();

    let applied = 0;
    const tool = new CodeTool({
      tools: [{ ...TOOLS[0], handler: async () => ({ id: String(++applied) }) }],
      patch: { enabled: true },
    });

    sandbox.onExecute = () => {
      sandbox?.call('add_todo', { title: 'a' });
      return { result: 'ok' };
    };

    const { result } = await run(tool, 'add_todo({})');
    expect(result).toBe('ok');
    expect(applied).toBe(1);
    expect(last(sandbox.results)?.error).toBeUndefined();
  });
});

describe('CodeTool — run log', () => {
  test('records full programs', async () => {
    sandbox = installSandbox();
    const tool = createTool(true);

    await run(tool, 'const a = 1');
    expect(tool.runLog).toEqual([{ input: 'full', failed: false }]);
  });

  test('records failures', async () => {
    const tool = createTool(true);
    await run(tool, 'const a = {');
    expect(tool.runLog).toEqual([{ input: 'full', failed: true }]);
  });

  test('records edit counts and line totals', async () => {
    sandbox = installSandbox();
    const tool = createTool(true);

    await run(tool, ['const a = 1', 'const b = {', 'const c = 3'].join('\n'));
    await run(tool, [
      { op: 'replace', lines: [2, 2], value: 'const b = 2' },
      { op: 'insert', lines: [1, 1], value: '// a\n// b' },
    ]);

    expect(last(tool.runLog)).toEqual({
      input: 'patch',
      failed: false,
      opCount: 2,
      linesCovered: 1,
      linesWritten: 3,
    });
  });

  test('records rejections by reason', async () => {
    const tool = createTool(true);

    await run(tool, [{ op: 'replace', lines: [1, 1], value: 'x' }]);
    await run(tool, 'const a = {');
    await run(tool, [{ op: 'replace', lines: [9, 9], value: 'x' }]);
    await run(tool, [
      { op: 'replace', lines: [1, 1], value: 'a' },
      { op: 'delete', lines: [1, 1] },
    ]);

    expect(tool.runLog.map((r) => r.rejection)).toEqual([
      'no-previous-program',
      undefined,
      'out-of-range',
      'overlapping-ranges',
    ]);
    expect(tool.runLog.every((r) => r.failed)).toBe(true);
  });
});
