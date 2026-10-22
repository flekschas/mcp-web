import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import { createStateTools } from './create-state-tools.js';

/**
 * A deep-path tool addresses one element of a collection, named by indices in
 * its own input. Those indices reach the generated `get`/`set` through an
 * object shared by every handler on the path, because the generator builds one
 * `get`/`set` pair for the whole path and has no per-call channel.
 *
 * What these check is that the addressing is right — that a call writes where
 * it said. The interleaving hazard the mutex guards against is covered in
 * `serialize.test.ts`, which can force a suspension; the generated handlers
 * here do not currently await, so no test at this level could distinguish a
 * guarded path from an unguarded one.
 */

const TrackSchema = z.object({
  uid: z.string(),
  height: z.number(),
});

const ViewSchema = z.object({
  id: z.string(),
  tracks: z.array(TrackSchema),
});

const StateSchema = z.object({
  views: z.array(ViewSchema),
});

type State = z.infer<typeof StateSchema>;

function initialState(): State {
  return {
    views: [
      { id: 'a', tracks: [{ uid: 't0', height: 10 }] },
      { id: 'b', tracks: [{ uid: 't1', height: 20 }] },
    ],
  };
}

/** The setter for `views.tracks`, plus a handle on the backing state. */
function trackSetter() {
  let state = initialState();
  const tools = createStateTools({
    name: 'app',
    description: 'the app',
    get: () => state,
    set: (v: State) => {
      state = v;
    },
    schema: StateSchema,
    schemaSplit: ['views.tracks'],
    expand: true,
  });

  const setter = tools.tools.find((t) => t.name === 'set_app_views_tracks');
  if (!setter) {
    throw new Error(
      `no tracks setter among: ${tools.tools.map((t) => t.name).join(', ')}`,
    );
  }
  return { setter, read: () => state };
}

describe('a deep-path tool writes to the element it was given', () => {
  it('addresses the element its indices name', async () => {
    const { setter, read } = trackSetter();
    await setter.handler({ viewsIndex: 1, index: 0, value: { height: 99 } });

    expect(read().views[1]!.tracks[0]!.height).toBe(99);
    expect(read().views[0]!.tracks[0]!.height).toBe(10);
  });

  it('routes two calls to two different elements', async () => {
    const { setter, read } = trackSetter();

    await Promise.all([
      setter.handler({ viewsIndex: 0, index: 0, value: { height: 111 } }),
      setter.handler({ viewsIndex: 1, index: 0, value: { height: 222 } }),
    ]);

    expect(read().views[0]!.tracks[0]!.height).toBe(111);
    expect(read().views[1]!.tracks[0]!.height).toBe(222);
  });

  it('keeps serving calls after one is rejected', async () => {
    const { setter, read } = trackSetter();

    await expect(
      setter.handler({ viewsIndex: 0, index: 0, value: { height: 'tall' } }),
    ).rejects.toThrow();

    await setter.handler({ viewsIndex: 1, index: 0, value: { height: 42 } });

    expect(read().views[0]!.tracks[0]!.height).toBe(10);
    expect(read().views[1]!.tracks[0]!.height).toBe(42);
  });
});
