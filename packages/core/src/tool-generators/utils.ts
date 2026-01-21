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
