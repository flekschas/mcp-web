import type { ZodObject, ZodType, z } from 'zod';
import type { splitSchema } from './schemas';

/**
 * A decomposed schema segment with metadata about its source.
 */
export interface DecomposedSchema {
  /** Generated name for this schema segment. */
  name: string;
  /** The Zod schema for this segment. */
  schema: ZodObject;
  /** Original paths from the source schema included in this segment. */
  targetPaths: string[];
}

/**
 * Split specification for decomposing schemas.
 *
 * Supports various notations:
 * - Simple path: `'user'` - Extract the 'user' property
 * - Nested path: `'profile.bio'` - Extract nested property
 * - Enum chunking: `'category[50]'` - Split enum into chunks of 50
 * - Enum slice: `'category[0:50]'` - Extract enum options 0-49
 * - Array split: `'items[]'` - Split array for item operations
 * - Record split: `'records{}'` - Split record for key-value operations
 *
 * @example
 * ```typescript
 * const splits: Split[] = [
 *   'user',              // simple path
 *   'profile.bio',       // nested path
 *   'category[50]',      // enum split into max 50 chunks
 *   'category[0:50]',    // enum slice
 *   'items[]',           // array split
 *   'records{}',         // record split
 * ];
 * ```
 */
export type Split = z.infer<typeof splitSchema>;

/**
 * Parsed array split information.
 * @internal
 */
export interface ArraySplit {
  /** Base path to the array property. */
  path: string;
  /** Whether this represents array element operations. */
  isArrayElement: boolean;
  /** Paths to exclude from the split. */
  excludedSubArrays: string[];
}

/**
 * Array of split specifications defining how to decompose a schema.
 */
export type SplitPlan = Split[];

/**
 * Options for automatic schema decomposition.
 */
export interface DecompositionOptions {
  /** Maximum estimated tokens per decomposed schema. */
  maxTokensPerSchema?: number;
  /** Maximum options per enum before splitting. */
  maxOptionsPerEnum?: number;
}

/**
 * Strategy interface for suggesting decomposition plans.
 */
export interface SuggestionStrategy {
  /** Name identifier for the strategy. */
  name: string;
  /** Generates a split plan for the given schema. */
  suggest(
    schema: ZodObject<Record<string, ZodType>>,
    options?: unknown,
  ): SplitPlan;
}

/**
 * Options for size-based decomposition strategy.
 */
export interface SizeBasedOptions {
  /** Maximum estimated tokens per decomposed schema. */
  maxTokensPerSchema: number;
  /** Maximum options per enum before splitting. */
  maxOptionsPerEnum: number;
}

/**
 * Internal grouping of related splits.
 * @internal
 */
export interface SplitGroup {
  /** Group name. */
  name: string;
  /** Paths included in this group. */
  paths: string[];
  /** Schemas for each path. */
  schemas: Record<string, ZodType>;
}
