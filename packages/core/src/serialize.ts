/**
 * Run tasks one at a time.
 *
 * Needed where handlers share state that is only correct for the duration of
 * one call. `createStateTools` is the case in hand: a deep-path tool carries
 * the indices naming which collection element it addresses, and the generated
 * `get`/`set` pair for that path reads them from one shared object, because the
 * generator builds the pair once and has no per-call channel. A handler that
 * awaits anywhere lets a second call overwrite the indices while the first is
 * suspended, and the first then reads or writes a different element — silently,
 * and to a plausible-looking place.
 *
 * The generated handlers happen to be synchronous today, so the interleaving
 * cannot occur; this holds regardless, because nothing states that as a
 * contract and a handler that starts awaiting would not look like a change to
 * the state tools at all.
 */

/**
 * A gate that admits one task at a time, in call order.
 *
 * Tasks are queued rather than refused: a caller that issues two tool calls at
 * once wants both to happen.
 */
export function createMutex(): <R>(task: () => Promise<R>) => Promise<R> {
  let tail: Promise<unknown> = Promise.resolve();
  return <R>(task: () => Promise<R>): Promise<R> => {
    // Both arms run `task`, so one caller's rejection does not cancel the next
    // caller's turn — and `tail` never carries a rejection nobody handles.
    const result = tail.then(task, task);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
