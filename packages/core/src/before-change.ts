import type {
  Elicit,
  ToolDefinitionZod,
  ToolHandlerContext,
} from '@mcp-web/types';
import type { z } from 'zod';
import { createMutex } from './serialize.js';

/** A change a generated state tool is about to store. */
export interface StateChange<T> {
  /** The state before the change. */
  prev: T;
  /** The state the tool wants to store. */
  next: T;
}

/**
 * Runs before a generated state tool stores a change. Return nothing to store
 * `next`, return another state to store that instead, or throw to reject the
 * change. The error message is what the AI sees.
 *
 * If the state changes while the user answers, `elicit` throws and the change
 * is rejected.
 */
export type OnBeforeChange<T> = (
  change: StateChange<T>,
  context: ToolHandlerContext,
  // biome-ignore lint/suspicious/noConfusingVoidType: a hook that returns nothing is typed `void`, and returning nothing stores `next`
) => T | void | Promise<T | void>;

interface BeforeChangeConfig<T> {
  name: string;
  get: () => T;
  set: (value: T) => void;
  schema: z.ZodType<T>;
  onBeforeChange: OnBeforeChange<T>;
}

/**
 * Runs `onBeforeChange` before a change is stored. Generated tools call the
 * returned `set`, which records the change. `wrap` makes a tool pass the
 * recorded change to `onBeforeChange` and then store it.
 */
export function beforeChange<T>({
  name,
  get,
  set,
  schema,
  onBeforeChange,
}: BeforeChangeConfig<T>) {
  let recording = false;
  let change: StateChange<T> | undefined;
  // One change at a time is worked out, asked about and stored, so a question
  // is about the state as it is, and a recorded change belongs to the tool
  // that made it.
  const runExclusive = createMutex();

  const conflict = () =>
    new Error(
      `The ${name} state changed while this change waited, so it was not ` +
        'stored. Get the state again and retry.',
    );

  const wrap = (tool: ToolDefinitionZod): ToolDefinitionZod => ({
    ...tool,
    handler: (input: unknown, context: ToolHandlerContext) =>
      runExclusive(async () => {
        // A call cancelled while it waited for its turn changes nothing, so a
        // retry can't store the change twice.
        context.signal.throwIfAborted();
        change = undefined;
        recording = true;
        let result: unknown;
        try {
          result = await tool.handler(input, context);
        } finally {
          recording = false;
        }
        // `set` assigned it while the tool ran, which TypeScript can't see.
        const recorded = change as StateChange<T> | undefined;
        if (!recorded || isEqual(recorded.prev, recorded.next)) return result;

        const { prev, next } = recorded;
        const assertUnchanged = () => {
          if (!isEqual(get(), prev)) throw conflict();
        };
        // Code after an answer runs only if the state is still as asked about.
        const ask = context.elicit as (...args: unknown[]) => Promise<unknown>;
        const elicit = (async (...args: unknown[]) => {
          const answer = await ask(...args);
          assertUnchanged();
          return answer;
        }) as Elicit;

        // Copies, so editing them can't change what is stored or compared.
        const replacement = await onBeforeChange(
          { prev: structuredClone(prev), next: structuredClone(next) },
          { ...context, elicit },
        );
        assertUnchanged();
        context.signal.throwIfAborted();
        if (replacement === undefined || isEqual(replacement, next)) {
          set(next);
          return result;
        }

        set(schema.parse(replacement));
        const note =
          'The app stored a different value than requested. Get the state to see it.';
        return isPlainObject(result) ? { ...result, note } : result;
      }),
  });

  return {
    set: (value: T) => {
      if (!recording) return set(value);
      // A copy, so changes made in place while the hook waits still count.
      change = { prev: change?.prev ?? structuredClone(get()), next: value };
    },
    wrap,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Compares JSON-compatible values and dates.
 *
 * @throws For other objects, such as maps, which it can't compare
 */
function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof Date || b instanceof Date) {
    return (
      a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
    );
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, i) => isEqual(item, b[i]))
    );
  }
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (!isPlainObject(a) || !isPlainObject(b)) {
    throw new Error(
      'onBeforeChange: state must consist of JSON-compatible values and ' +
        'dates, so changes can be compared.',
    );
  }
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => key in b && isEqual(a[key], b[key]))
  );
}
