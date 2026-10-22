/**
 * Atomic execution: a program's changes all land, or none do.
 *
 * Without this, a program whose seventh call fails leaves the first six
 * applied. The model's next turn then starts from a state it never intended and
 * has to diagnose before it can fix anything — and it must write *different*
 * code, skipping the part that already ran, because `add_todo` is not
 * idempotent. Retrying is only safe when nothing was half-applied, so this is
 * also what makes patching sound.
 *
 * ## Why the app supplies it
 *
 * `CodeTool` has tools, not state. A tool is a name, a schema and a handler;
 * where the handler writes is the application's business and deliberately
 * invisible here. So the capability to snapshot and restore has to come from
 * whoever owns the state, and `CodeTool` only decides *when* to use it.
 *
 * ## Snapshot-and-restore, not write-to-a-clone
 *
 * The obvious implementation — point handlers at a copy and swap it in on
 * success — breaks read-back. Code earns its low round-trip count precisely by
 * writing and then reading:
 *
 * ```js
 * await set_views(next);
 * const current = await get_state();   // must observe the write
 * ```
 *
 * Redirecting writes to a copy while reads still hit the original would make
 * that return stale data. Snapshotting up front and restoring on failure keeps
 * every read and write against the live state, so the program observes itself
 * exactly as it does today, and costs one `structuredClone` per execution.
 */

export interface Transaction {
  /** Take a snapshot. Called before a program runs. */
  begin(): void;
  /** Keep the changes and release the snapshot. Called on success. */
  commit(): void;
  /** Restore the snapshot. Called when a program fails or times out. */
  rollback(): void;
}

/**
 * A transaction over a single get/set pair — the shape `createStateTools` and
 * `addStateTools` already have.
 *
 * ```ts
 * mcp.addTool(new CodeTool({
 *   tools: state.tools,
 *   transaction: stateTransaction(() => store.app, (v) => { store.app = v; }),
 * }));
 * ```
 */
export function stateTransaction<T>(
  get: () => T,
  set: (value: T) => void,
): Transaction {
  let snapshot: T | undefined;
  let held = false;

  return {
    begin() {
      snapshot = structuredClone(get());
      held = true;
    },
    commit() {
      snapshot = undefined;
      held = false;
    },
    rollback() {
      // Guarded so a rollback with no snapshot cannot write `undefined` over
      // live state — which would turn a failed program into a wiped one.
      if (!held) return;
      set(snapshot as T);
      snapshot = undefined;
      held = false;
    },
  };
}

/**
 * Combine several transactions into one.
 *
 * An app with more than one state atom needs all of them snapshotted together,
 * or a failure restores some and not others — which is the same partial-state
 * problem one level up.
 */
export function combineTransactions(
  ...transactions: Transaction[]
): Transaction {
  return {
    begin() {
      for (const t of transactions) t.begin();
    },
    commit() {
      for (const t of transactions) t.commit();
    },
    rollback() {
      // Reverse order, so a transaction that depends on an earlier one is
      // restored before the thing it depends on moves under it.
      for (const t of [...transactions].reverse()) t.rollback();
    },
  };
}
