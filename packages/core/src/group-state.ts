import { z } from 'zod';

/**
 * A tuple representing a single piece of state: [getter, setter, schema]
 * Follows the familiar [value, setter] pattern from React/Jotai hooks.
 */
export type StateTriple<T> = [get: () => T, set: (value: T) => void, schema: z.ZodType<T>];

/**
 * Configuration object mapping state names to their getter/setter/schema triples.
 * Uses `any` instead of `unknown` to avoid contravariance issues with the setter function.
 */
// biome-ignore lint/suspicious/noExplicitAny: we need to be able to set any value
export  type StateTriples = Record<string, StateTriple<any>>;

/**
 * Infer the value type from a StateTriple.
 */
type InferTripleType<T> = T extends StateTriple<infer U> ? U : never;

/**
 * The result of groupState: combined schema, getter, and setter.
 */
export type GroupedState<T extends StateTriples> = {
  schema: z.ZodObject<{
    [K in keyof T]: z.ZodOptional<T[K] extends StateTriple<infer U> ? z.ZodType<U> : never>;
  }>;
  get: () => { [K in keyof T]: InferTripleType<T[K]> };
  set: (value: Partial<{ [K in keyof T]: InferTripleType<T[K]> }>) => void;
};

/**
 * Groups multiple atomic state variables into a single schema/getter/setter
 * that can be spread into `addStateTools`.
 *
 * This reduces tool explosion when using declarative reactive state (like Jotai atoms)
 * by exposing semantically related state through one tool set.
 *
 * @param atoms - Object mapping state names to [getter, setter, schema] triples
 * @returns Object with combined { schema, get, set } for use with addStateTools
 *
 * @example
 * ```typescript
 * import { groupState } from '@mcp-web/core';
 *
 * const settingsGroup = groupState({
 *   sortBy: [getSortBy, setSortBy, SortBySchema],
 *   sortOrder: [getSortOrder, setSortOrder, SortOrderSchema],
 *   showCompleted: [getShowCompleted, setShowCompleted, ShowCompletedSchema],
 *   theme: [getTheme, setTheme, ThemeSchema],
 * });
 *
 * mcpWeb.addStateTools({
 *   name: 'settings',
 *   description: 'Display and app settings',
 *   ...settingsGroup,
 * });
 * ```
 */
export function groupState<T extends StateTriples>(atoms: T): GroupedState<T> {
  // Build combined schema with all fields optional (for partial updates)
  const schemaShape: Record<string, z.ZodTypeAny> = {};
  for (const [key, [, , schema]] of Object.entries(atoms)) {
    schemaShape[key] = schema.optional();
  }
  const schema = z.object(schemaShape);

  // Build combined getter
  const get = () => {
    const result: Record<string, unknown> = {};
    for (const [key, [getter]] of Object.entries(atoms)) {
      result[key] = getter();
    }
    return result;
  };

  // Build combined setter (only sets defined values)
  const set = (value: Record<string, unknown>) => {
    for (const [key, [, setter]] of Object.entries(atoms)) {
      if (value[key] !== undefined) {
        setter(value[key]);
      }
    }
  };

  return { schema, get, set } as GroupedState<T>;
}

