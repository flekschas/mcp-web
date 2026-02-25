import type { ToolDefinitionZod } from '@mcp-web/types';
import type { z } from 'zod';
import { generateToolsForSchema } from './zod-schema-to-tools/index.js';

export interface ZodSchemasToToolsOptions<T> {
  /** Zod schema describing the state shape. */
  schema: z.ZodType<T>;
  /** Function to get the current state value. */
  get: () => T;
  /** Function to set the state value. */
  set: (value: T) => void;
  /** Name prefix for generated tools (default: 'state'). */
  name?: string;
  /** Description for generated tools. */
  description?: string;
}

/**
 * Converts a Zod schema into an array of MCP tool definitions.
 *
 * Analyzes the schema shape and generates appropriate CRUD tools:
 * - Fixed-shape objects -> get + set (with deep merge)
 * - Arrays -> get + add + set + delete
 * - Records -> get + set + delete
 * - Mixed objects -> root get/set + collection tools
 */
export function zodSchemasToTools<T>(
  options: ZodSchemasToToolsOptions<T>,
): ToolDefinitionZod[] {
  const {
    schema,
    get,
    set,
    name = 'state',
    description = name,
  } = options;

  const result = generateToolsForSchema({
    name,
    description,
    get: get as () => unknown,
    set: set as (value: unknown) => void,
    schema: schema as z.ZodTypeAny,
  });

  for (const warning of result.warnings) {
    console.warn(warning);
  }

  return result.tools;
}
