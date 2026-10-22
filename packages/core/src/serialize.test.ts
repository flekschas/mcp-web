import { describe, expect, it } from 'bun:test';
import { createMutex } from './serialize.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('one task at a time, in call order', () => {
  it('does not interleave two tasks that await', async () => {
    const run = createMutex();
    const events: string[] = [];

    const task = (name: string) => async () => {
      events.push(`${name}:start`);
      await tick();
      events.push(`${name}:end`);
    };

    await Promise.all([run(task('a')), run(task('b'))]);

    expect(events).toEqual(['a:start', 'a:end', 'b:start', 'b:end']);
  });

  it('keeps per-call state correct across a suspension', async () => {
    // The shape of the bug this exists for: a value written before an await and
    // read after it. Unguarded, the second call's write wins and both reads
    // return 2.
    const run = createMutex();
    let shared = 0;

    const read = (value: number) => async (): Promise<number> => {
      shared = value;
      await tick();
      return shared;
    };

    expect(await Promise.all([run(read(1)), run(read(2))])).toEqual([1, 2]);
  });

  it('admits the next task after one rejects', async () => {
    const run = createMutex();

    await expect(
      run(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await run(async () => 'ok')).toBe('ok');
  });

  it('returns each task its own result', async () => {
    const run = createMutex();
    expect(await Promise.all([run(async () => 1), run(async () => 2)])).toEqual([
      1, 2,
    ]);
  });
});
