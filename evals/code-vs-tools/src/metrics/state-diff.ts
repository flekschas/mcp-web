import deepDiff from 'deep-diff';
import type { SuccessMetric } from '../types.js';

type Diff = deepDiff.Diff<unknown, unknown>;
const diff = deepDiff.diff;

/**
 * Recursively strips specified field names from an object.
 * Used to remove system-generated fields (IDs, timestamps) before comparison.
 */
function stripFields(obj: unknown, fieldsToStrip: string[]): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => stripFields(item, fieldsToStrip));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (!fieldsToStrip.includes(key)) {
      result[key] = stripFields(value, fieldsToStrip);
    }
  }
  return result;
}

/**
 * Maps a deep-diff change to the approximate number of tool calls needed to fix it.
 *
 * - 'N' (new): missing in actual -> 1 add/set call
 * - 'D' (deleted): extra in actual -> 1 delete call
 * - 'E' (edited): wrong value -> 1 set call
 * - 'A' (array change): per-item change -> recurse into item diff
 */
function diffToToolCallCost(d: Diff): number {
  switch (d.kind) {
    case 'N': // New in expected, missing in actual
      return 1;
    case 'D': // Deleted from expected, extra in actual
      return 1;
    case 'E': // Edited value
      return 1;
    case 'A': // Array change
      return d.item ? diffToToolCallCost(d.item) : 1;
    default:
      return 1;
  }
}

/**
 * Computes the success metric by comparing end state to golden state.
 *
 * @param endState - The final state produced by the model
 * @param goldenState - The expected ideal state
 * @param goldenMinToolCalls - Minimum tool calls to go from initial -> golden (for normalization)
 * @param ignoreFields - Field names to strip before comparison (e.g. system-generated IDs)
 */
export function computeSuccess(
  endState: unknown,
  goldenState: unknown,
  goldenMinToolCalls: number,
  ignoreFields: string[] = [],
): SuccessMetric {
  const strippedEnd = stripFields(endState, ignoreFields);
  const strippedGolden = stripFields(goldenState, ignoreFields);

  const diffs = diff(strippedEnd, strippedGolden);

  if (!diffs || diffs.length === 0) {
    return { exact: true, editDistance: 0, normalizedScore: 1 };
  }

  const editDistance = diffs.reduce((sum, d) => sum + diffToToolCallCost(d), 0);
  const normalizedScore = Math.max(
    0,
    Math.min(1, 1 - editDistance / Math.max(goldenMinToolCalls, 1)),
  );

  return { exact: false, editDistance, normalizedScore };
}
