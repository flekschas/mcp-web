import { describe, expect, test } from 'bun:test';
import type { Elicit, ToolHandlerContext } from '@mcp-web/types';
import { z } from 'zod';
import type { StateChange } from './before-change.js';
import { createStateTools } from './create-state-tools.js';

const ProjectsSchema = z.record(z.string(), z.object({ title: z.string() }));
type Projects = z.infer<typeof ProjectsSchema>;

const initialProjects = (): Projects => ({
  a: { title: 'Work' },
  b: { title: 'Home' },
});

/** A context whose user answers every question with `answer`. */
const answering = (answer: boolean, signal = new AbortController().signal) => {
  const questions: string[] = [];
  const elicit = (async (message: string) => {
    questions.push(message);
    return answer;
  }) as Elicit;
  return { context: { elicit, signal }, questions };
};

/** Project tools whose `onBeforeChange` is `hook`, recording each change. */
function projectTools(
  hook: (
    change: StateChange<Projects>,
    context: ToolHandlerContext,
  ) => Projects | undefined | Promise<Projects | undefined> = () => undefined,
) {
  const state = { projects: initialProjects() };
  const changes: StateChange<Projects>[] = [];
  const tools = createStateTools({
    name: 'projects',
    description: 'Projects',
    get: () => state.projects,
    set: (value: Projects) => {
      state.projects = value;
    },
    schema: ProjectsSchema,
    expand: true,
    onBeforeChange: (change, context) => {
      changes.push(change);
      return hook(change, context);
    },
  });
  const call = (name: string, input: unknown, context = answering(true)) => {
    const tool = tools.tools.find((t) => t.name === name);
    if (!tool) throw new Error(`No tool ${name}`);
    return tool.handler(input, context.context);
  };
  return { state, changes, call };
}

describe('onBeforeChange', () => {
  test('sees the state before and after, and stores the change', async () => {
    const { state, changes, call } = projectTools();
    expect(await call('delete_projects', { key: 'a' })).toEqual({
      success: true,
    });
    expect(changes).toEqual([
      { prev: initialProjects(), next: { b: { title: 'Home' } } },
    ]);
    expect(state.projects).toEqual({ b: { title: 'Home' } });
  });

  test('asks the user with the elicit of the tool call', async () => {
    const { state, call } = projectTools(async ({ prev, next }, { elicit }) => {
      const removed = Object.keys(prev).filter((id) => !(id in next));
      if (!(await elicit(`Delete ${removed.join(', ')}?`))) {
        throw new Error('The user chose not to delete.');
      }
    });

    const no = answering(false);
    await expect(call('delete_projects', { all: true }, no)).rejects.toThrow(
      'The user chose not to delete.',
    );
    expect(no.questions).toEqual(['Delete a, b?']);
    expect(state.projects).toEqual(initialProjects());

    await call('delete_projects', { all: true }, answering(true));
    expect(state.projects).toEqual({});
  });

  test('stores the state it returns instead, and tells the AI', async () => {
    const { state, call } = projectTools(({ next }) => ({
      ...next,
      c: { title: 'Kept' },
    }));
    const result = await call('delete_projects', { key: 'a' });
    expect(state.projects).toEqual({
      b: { title: 'Home' },
      c: { title: 'Kept' },
    });
    expect(result).toMatchObject({ success: true, note: expect.any(String) });
  });

  test('does not add a note when it returns next', async () => {
    const { call } = projectTools(({ next }) => next);
    expect(await call('delete_projects', { key: 'a' })).toEqual({
      success: true,
    });
  });

  test('cannot change the stored state by editing next', async () => {
    const { state, call } = projectTools(({ next }) => {
      next.b.title = 'Edited';
      throw new Error('No');
    });
    await expect(call('delete_projects', { key: 'a' })).rejects.toThrow('No');
    expect(state.projects).toEqual(initialProjects());
  });

  test('rejects a returned state that does not match the schema', async () => {
    const { state, call } = projectTools(
      () => ({ c: { name: 'No title' } }) as unknown as Projects,
    );
    await expect(call('delete_projects', { key: 'a' })).rejects.toThrow();
    expect(state.projects).toEqual(initialProjects());
  });

  test('rejects the change when the state changed while it waited', async () => {
    let answer = () => {};
    const { state, call } = projectTools(
      () =>
        new Promise<undefined>((resolve) => {
          answer = () => resolve(undefined);
        }),
    );

    const deleting = call('delete_projects', { key: 'a' });
    // While the hook waits, other tools still run.
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await call('get_projects', {})).toEqual(initialProjects());

    // The user renames a project in the app in the meantime.
    state.projects.b.title = 'House';
    answer();
    await expect(deleting).rejects.toThrow(
      'The projects state changed while this change waited',
    );
    expect(state.projects).toEqual({
      a: { title: 'Work' },
      b: { title: 'House' },
    });
  });

  test('throws from elicit when the state changed while the user answered', async () => {
    let answer = (_: boolean) => {};
    const elicit = (() =>
      new Promise<boolean>((resolve) => {
        answer = resolve;
      })) as Elicit;
    let ranAfterAnswer = false;
    const { state, call } = projectTools(async (_change, context) => {
      await context.elicit('Delete?');
      ranAfterAnswer = true;
    });

    const deleting = call(
      'delete_projects',
      { key: 'a' },
      {
        context: { elicit, signal: new AbortController().signal },
        questions: [],
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    state.projects = { ...state.projects, c: { title: 'New' } };
    answer(true);

    await expect(deleting).rejects.toThrow(
      'The projects state changed while this change waited',
    );
    expect(ranAfterAnswer).toBe(false);
    expect(Object.keys(state.projects)).toEqual(['a', 'b', 'c']);
  });

  test('works out changes one at a time, so each asks about the current state', async () => {
    const seen: string[][] = [];
    const answers: (() => void)[] = [];
    const { state, call } = projectTools(async ({ prev }) => {
      seen.push(Object.keys(prev));
      await new Promise<void>((resolve) => answers.push(resolve));
    });

    const first = call('delete_projects', { key: 'a' });
    const second = call('delete_projects', { key: 'b' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    // The second waits until the first is stored.
    expect(seen).toEqual([['a', 'b']]);

    answers[0]();
    await first;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(seen).toEqual([['a', 'b'], ['b']]);

    answers[1]();
    await second;
    expect(state.projects).toEqual({});
  });

  test('stores nothing for a call cancelled while it waited for its turn', async () => {
    let answer = () => {};
    const { state, call } = projectTools(({ next }) =>
      'a' in next
        ? undefined
        : new Promise<undefined>((resolve) => {
            answer = () => resolve(undefined);
          }),
    );

    const deleting = call('delete_projects', { key: 'a' });
    const cancel = new AbortController();
    const adding = call(
      'set_projects',
      { key: 'c', value: { title: 'New' } },
      answering(true, cancel.signal),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    // The bridge times out the queued call.
    cancel.abort(new Error('The tool call was cancelled: Tool call timeout'));
    answer();

    await deleting;
    await expect(adding).rejects.toThrow('Tool call timeout');
    expect(state.projects).toEqual({ b: { title: 'Home' } });
  });

  test('editing prev does not look like a concurrent change', async () => {
    const { state, call } = projectTools(({ prev }) => {
      prev.a.title = 'Edited';
    });
    await call('delete_projects', { key: 'a' });
    expect(state.projects).toEqual({ b: { title: 'Home' } });
  });

  test('reading a collection of an object does not wait for a question', async () => {
    let board = { title: 'Board', items: ['x'] };
    let answer = () => {};
    const tools = createStateTools({
      name: 'board',
      description: 'A board',
      get: () => board,
      set: (value) => {
        board = value;
      },
      schema: z.object({ title: z.string(), items: z.array(z.string()) }),
      expand: true,
      onBeforeChange: () =>
        new Promise<undefined>((resolve) => {
          answer = () => resolve(undefined);
        }),
    });
    const run = (name: string, input: unknown) =>
      tools.tools
        .find((tool) => tool.name === name)
        ?.handler(input, answering(true).context);

    const deleting = run('delete_board_items', { index: 0 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await run('get_board_items', {})).toEqual(['x']);
    answer();
    await deleting;
    expect(board.items).toEqual([]);
  });

  test('does not run for tools that change nothing', async () => {
    const { changes, call } = projectTools();
    await call('get_projects', {});
    await call('delete_projects', { key: 'missing' });
    expect(changes).toEqual([]);
  });

  test('stores nothing when a change turns out to be no change', async () => {
    let stored = 0;
    const tools = createStateTools({
      name: 'count',
      description: 'A count',
      get: () => 1,
      set: () => {
        stored++;
      },
      schema: z.number(),
      onBeforeChange: () => {},
    });
    await tools.setters.handler({ value: 1 }, answering(true).context);
    expect(stored).toBe(0);
  });

  test('compares dates by their time', async () => {
    let date = new Date(0);
    const seen: StateChange<Date>[] = [];
    const tools = createStateTools({
      name: 'date',
      description: 'A date',
      get: () => date,
      set: (value: Date) => {
        date = value;
      },
      schema: z.date(),
      onBeforeChange: (change) => {
        seen.push(change);
      },
    });
    await tools.setters.handler(
      { value: new Date(0) },
      answering(true).context,
    );
    expect(seen).toEqual([]);
    await tools.setters.handler(
      { value: new Date(42) },
      answering(true).context,
    );
    expect(seen).toEqual([{ prev: new Date(0), next: new Date(42) }]);
    expect(date).toEqual(new Date(42));
  });

  test('runs for the setter of basic state tools', async () => {
    let count = 1;
    const seen: StateChange<number>[] = [];
    const tools = createStateTools({
      name: 'count',
      description: 'A count',
      get: () => count,
      set: (value: number) => {
        count = value;
      },
      schema: z.number(),
      onBeforeChange: (change) => {
        seen.push(change);
        return change.next > 10 ? 10 : undefined;
      },
    });
    await tools.setters.handler({ value: 99 }, answering(true).context);
    expect(seen).toEqual([{ prev: 1, next: 99 }]);
    expect(count).toBe(10);
  });
});
