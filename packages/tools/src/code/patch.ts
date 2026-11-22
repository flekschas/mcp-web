import { z } from 'zod';

/**
 * A 1-based line number.
 *
 * `.int()` implies safe-integer bounds, which `toJSONSchema` renders as a
 * `maximum: 9007199254740991` that costs tokens and tells the model nothing.
 * Overwriting it with `undefined` via `.meta()` drops it from the emitted
 * schema while keeping both `type: integer` and the runtime check.
 */
const LineNumberSchema = z.number().int().min(1).meta({ maximum: undefined });

/**
 * A single line-anchored edit to the previous program.
 *
 * One flat shape with an explicit `op` tag. `value` is required for `replace`
 * and `insert` and forbidden for `delete`. A refine enforces this, so it does
 * not survive into JSON Schema and `applyPatches` re-checks it.
 */
export const PatchOpSchema = z
  .object({
    op: z.enum(['replace', 'delete', 'insert']),
    lines: z
      .tuple([LineNumberSchema, LineNumberSchema])
      .describe(
        '1-based inclusive line range in the previous program. For `insert`, ' +
          'only the first number is used and text is inserted *before* that line.',
      ),
    value: z
      .string()
      .optional()
      .describe(
        'Replacement or inserted text. Required for replace and insert; omitted for delete.',
      ),
  })
  .refine((op) => op.op === 'delete' || op.value !== undefined, {
    message: '`value` is required for `replace` and `insert`',
  });

export type PatchOp = z.infer<typeof PatchOpSchema>;

/** Why a patch was refused. */
export type PatchRejectionReason =
  | 'patching-disabled'
  | 'no-previous-program'
  | 'previous-run-succeeded'
  | 'previous-run-started-calls'
  | 'empty-ops'
  | 'missing-value'
  | 'unexpected-value'
  | 'inverted-range'
  | 'out-of-range'
  | 'overlapping-ranges'
  | 'insert-inside-range';

export type PatchResult =
  | { code: string; error?: undefined; reason?: undefined }
  | { code?: undefined; error: string; reason: PatchRejectionReason };

/** Counts of what a patch touches, recorded in the run log. */
export interface PatchSummary {
  opCount: number;
  /** Previous-program lines covered by `replace` and `delete` ranges. */
  linesCovered: number;
  /** Lines of text written in by `replace` and `insert` values. */
  linesWritten: number;
}

function fail(reason: PatchRejectionReason, error: string): PatchResult {
  return { error, reason };
}

/** Splits a program into lines. An empty program has zero lines, not one. */
function splitLines(code: string): string[] {
  return code === '' ? [] : code.split('\n');
}

/** Names an op the way error messages refer to it, e.g. `ops[1] (replace 3-5)`. */
function describeOp(op: PatchOp, index: number): string {
  const [from, to] = op.lines;
  const where =
    op.op === 'insert'
      ? `before ${from}`
      : from === to
        ? `${from}`
        : `${from}-${to}`;
  return `ops[${index}] (${op.op} ${where})`;
}

export function summarizeOps(ops: PatchOp[]): PatchSummary {
  let linesCovered = 0;
  let linesWritten = 0;

  for (const op of ops) {
    if (op.op !== 'insert') {
      // Clamped because this runs on unvalidated ops: an inverted range would
      // otherwise contribute a negative count to the run record.
      linesCovered += Math.max(0, op.lines[1] - op.lines[0] + 1);
    }
    if (op.op !== 'delete' && op.value !== undefined) {
      linesWritten += op.value.split('\n').length;
    }
  }

  return { opCount: ops.length, linesCovered, linesWritten };
}

/**
 * Applies line-anchored edits to a program.
 *
 * Every anchor resolves against `previous` unmodified — ops do not see each
 * other's effects. All ops are validated before any is applied, so a rejected
 * patch leaves nothing half-done.
 */
export function applyPatches(previous: string, ops: PatchOp[]): PatchResult {
  if (ops.length === 0) {
    return fail('empty-ops', 'No edits were provided.');
  }

  const lines = splitLines(previous);
  const lastLine = lines.length;

  for (const [index, op] of ops.entries()) {
    const [from, to] = op.lines;
    const where = describeOp(op, index);

    if (op.op === 'delete') {
      if (op.value !== undefined) {
        return fail(
          'unexpected-value',
          `${where}: \`delete\` must not carry \`value\`. Use \`replace\` to substitute text.`,
        );
      }
    } else if (op.value === undefined) {
      return fail(
        'missing-value',
        `${where}: \`value\` is required for \`${op.op}\`.`,
      );
    }

    if (!Number.isInteger(from) || from < 1) {
      return fail(
        'out-of-range',
        `${where}: line numbers are 1-based integers, got ${from}.`,
      );
    }

    if (op.op === 'insert') {
      if (from > lastLine + 1) {
        return fail(
          'out-of-range',
          `${where}: the previous program has ${lastLine} line(s); ` +
            `insert anchors run from 1 to ${lastLine + 1} (use ${lastLine + 1} to append).`,
        );
      }
      continue;
    }

    if (!Number.isInteger(to) || to < from) {
      return fail(
        'inverted-range',
        `${where}: end line ${to} is before start line ${from}.`,
      );
    }

    if (to > lastLine) {
      return fail(
        'out-of-range',
        `${where}: the previous program has ${lastLine} line(s), so line ${to} does not exist.`,
      );
    }
  }

  const ranges = ops
    .map((op, index) => ({ op, index }))
    .filter((entry) => entry.op.op !== 'insert');

  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const a = ranges[i];
      const b = ranges[j];
      if (a.op.lines[0] <= b.op.lines[1] && b.op.lines[0] <= a.op.lines[1]) {
        return fail(
          'overlapping-ranges',
          `Overlapping edits: ${describeOp(a.op, a.index)} and ` +
            `${describeOp(b.op, b.index)} cover the same lines. ` +
            'Every edit must anchor to a distinct part of the previous program.',
        );
      }
    }
  }

  for (const [index, op] of ops.entries()) {
    if (op.op !== 'insert') continue;
    const anchor = op.lines[0];

    for (const range of ranges) {
      // Anchoring at the start of a range is well-defined — the insert lands
      // before the replacement. Anywhere else inside it is not: those lines
      // are on their way out.
      if (anchor > range.op.lines[0] && anchor <= range.op.lines[1]) {
        return fail(
          'insert-inside-range',
          `${describeOp(op, index)} anchors inside the lines covered by ` +
            `${describeOp(range.op, range.index)}. Anchor it at ` +
            `${range.op.lines[0]} to insert before that edit, or at ` +
            `${range.op.lines[1] + 1} to insert after it.`,
        );
      }
    }
  }

  // Descending by start line, so earlier anchors are unaffected by later
  // splices. Within one start line, ranges apply before inserts — that is what
  // makes an insert anchored at the start of a replace land *before* the
  // replacement. Among inserts sharing an anchor, the last listed applies
  // first, so the final order matches the order they were written in.
  const ordered = ops
    .map((op, index) => ({ op, index }))
    .sort((a, b) => {
      if (a.op.lines[0] !== b.op.lines[0]) {
        return b.op.lines[0] - a.op.lines[0];
      }
      const rank = (op: PatchOp) => (op.op === 'insert' ? 1 : 0);
      if (rank(a.op) !== rank(b.op)) return rank(a.op) - rank(b.op);
      return b.index - a.index;
    });

  const out = [...lines];

  for (const { op } of ordered) {
    const [from, to] = op.lines;
    const start = from - 1;

    if (op.op === 'insert') {
      out.splice(start, 0, ...(op.value as string).split('\n'));
    } else if (op.op === 'delete') {
      out.splice(start, to - from + 1);
    } else {
      out.splice(start, to - from + 1, ...(op.value as string).split('\n'));
    }
  }

  return { code: out.join('\n') };
}

/** What the tool remembers about the last program it ran. */
export interface PreviousRun {
  /** The program as the model wrote it, which anchors resolve against. */
  code: string;
  /** Whether it ended in an error. */
  failed: boolean;
  /**
   * Proxied tool calls it dispatched, counted when the call was handed to its
   * handler rather than when the handler returned. Deliberately conservative:
   * a handler that rejected may still have changed something first, and from
   * out here the two are indistinguishable.
   */
  startedToolCalls: number;
}

/**
 * Applies edits after checking that patching is allowed at all.
 *
 * The proxied functions are not idempotent, so an edited program may only be
 * re-run when the original dispatched no calls at all. That rules out a run
 * that succeeded (it applied everything), a run that failed part-way through
 * (it applied a prefix), and a run whose only call failed (it may have applied
 * part of one). What is left — and it is the common retry — is a program that
 * died before reaching any call: a syntax error, an undefined variable, a
 * misspelled function name.
 *
 * The last check applies only when execution commits immediately. With a
 * transaction configured, a failed run is rolled back and commits nothing by
 * construction, so `atomic` lifts the restriction and any failed program
 * becomes editable — which is the bulk of what patching is for.
 */
export function resolvePatchedCode(
  previous: PreviousRun | null,
  ops: PatchOp[],
  /**
   * Whether the failed run's changes were rolled back.
   *
   * When execution is atomic a failure commits nothing, so the started-call
   * guard below no longer applies — re-running an edited copy cannot repeat
   * effects that were undone. Defaults to false, which keeps the conservative
   * behaviour for a `CodeTool` configured without a transaction.
   */
  atomic = false,
): PatchResult {
  if (previous === null) {
    return fail(
      'no-previous-program',
      'Cannot edit: no program has been run yet. Send a complete program.',
    );
  }

  if (!previous.failed) {
    return fail(
      'previous-run-succeeded',
      'Cannot edit: the previous program ran successfully, and re-running an ' +
        'edited copy would apply its effects a second time. Send a complete ' +
        'program containing only the new work.',
    );
  }

  if (!atomic && previous.startedToolCalls > 0) {
    return fail(
      'previous-run-started-calls',
      `Cannot edit: the previous program started ${previous.startedToolCalls} ` +
        'tool call(s) before it failed. Whatever they changed still stands, ' +
        'and re-running an edited copy would repeat them. Send a complete ' +
        'program covering only the work that remains.',
    );
  }

  return applyPatches(previous.code, ops);
}

/**
 * Renders a program with 1-based line numbers prefixed, so the model reads
 * anchor positions instead of counting newlines in a JSON-escaped string.
 */
export function renderNumberedSource(code: string): string {
  const lines = splitLines(code);
  const width = String(lines.length).length;

  return lines
    .map((line, i) => `${String(i + 1).padStart(width, ' ')} | ${line}`)
    .join('\n');
}
