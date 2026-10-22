/**
 * For fields that are optional-only (not nullable in the original schema),
 * converts null values to undefined after deepMerge. This allows the
 * original schema.parse() to succeed since null is not valid for
 * optional-only fields.
 *
 * Called between deepMerge and schema.parse in set handlers.
 */
export function nullToUndefinedForOptionalOnly(
  merged: Record<string, unknown>,
  optionalOnlyKeys: Set<string>,
): Record<string, unknown> {
  if (optionalOnlyKeys.size === 0) return merged;

  const result = { ...merged };
  for (const key of optionalOnlyKeys) {
    if (result[key] === null) {
      result[key] = undefined;
    }
  }
  return result;
}

/**
 * Deep merge two objects recursively.
 * Used for partial updates to state objects.
 *
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns The merged result
 *
 * Key behaviors:
 * - `undefined` in source → keep target value (no change)
 * - `null` in source → set to null (explicit clear)
 * - Nested objects → recursively merged
 * - Arrays → replaced entirely (not merged)
 */
export function deepMerge(target: unknown, source: unknown): unknown {
  // Base cases
  if (source === null) return source; // Explicit null clears the value
  if (source === undefined) return target; // Undefined means "no change"
  if (typeof source !== 'object') return source;
  if (Array.isArray(source)) return source; // Arrays are replaced, not merged
  if (typeof target !== 'object' || target === null) return source;
  if (Array.isArray(target)) return source;

  // Object merge: recursively merge properties
  const result = { ...target } as Record<string, unknown>;
  for (const [key, value] of Object.entries(source)) {
    result[key] = deepMerge(result[key], value);
  }
  return result;
}
