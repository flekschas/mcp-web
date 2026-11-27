import { expect, test } from 'bun:test';
import type { ToolDefinitionZod } from '@mcp-web/types';
import { z } from 'zod';
import { FunctionExecutor } from './function-executor.js';
import { CodeTool } from './index.js';

test("a tool called from a program can't ask the user", async () => {
  const tools: ToolDefinitionZod[] = [
    {
      name: 'clear_todos',
      description: 'Clear all todos after asking the user',
      inputSchema: z.object({}),
      handler: async (_input, { elicit }) => elicit('Clear all todos?'),
    },
  ];
  const tool = new CodeTool({ tools, executor: new FunctionExecutor() });

  const output = await tool.handler({ code: 'await clear_todos({})' });

  expect(output.error).toContain(
    "clear_todos asked the user a question (elicit), which tools can't do " +
      'when a code-mode program calls them.',
  );
});

test('a tool called from a program learns that the call was cancelled', async () => {
  let release = () => {};
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started = () => {};
  const running = new Promise<void>((resolve) => {
    started = resolve;
  });
  let stored = false;
  const tools: ToolDefinitionZod[] = [
    {
      name: 'save',
      description: 'Save after some work',
      inputSchema: z.object({}),
      handler: async (_input, { signal }) => {
        started();
        await waiting;
        signal.throwIfAborted();
        stored = true;
      },
    },
  ];
  const tool = new CodeTool({ tools, executor: new FunctionExecutor() });
  const call = new AbortController();

  const output = tool.handler(
    { code: 'await save({})' },
    { signal: call.signal },
  );
  await running;
  call.abort(new Error('The tool call was cancelled.'));
  release();

  expect((await output).error).toContain('The tool call was cancelled.');
  expect(stored).toBe(false);
});

test('a program cancelled while it waits for its turn never runs', async () => {
  let release = () => {};
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let runs = 0;
  const tools: ToolDefinitionZod[] = [
    {
      name: 'save',
      description: 'Save after some work',
      inputSchema: z.object({}),
      handler: async () => {
        runs++;
        await waiting;
      },
    },
  ];
  const tool = new CodeTool({ tools, executor: new FunctionExecutor() });
  const second = new AbortController();

  const first = tool.handler({ code: 'await save({})' });
  const queued = tool.handler(
    { code: 'await save({})' },
    { signal: second.signal },
  );
  second.abort();
  release();

  expect((await first).error).toBeUndefined();
  expect((await queued).error).toBe(
    'The call was cancelled, so nothing was run.',
  );
  expect(runs).toBe(1);
});
