import type { ZodObject, ZodType, z } from 'zod';
import type { splitSchema } from './schemas';

// Main decomposed schema interface
export interface DecomposedSchema {
  name: string;
  schema: ZodObject;
  targetPaths: string[];
}

/**
 * Split types for the decompose function
 *
 * @example
 * ```ts
 * const splits: Split[] = [
 *  'user', // simple path
 *  'profile.bio', // nested path
 *  'category[50]', // enum split into equal max. sized subarrays
 *  'category[0:50]', // enum slice
 *  'category[50:]', // enum slice from index to end
 *  'category[:50]', // enum slice from start to index
 *  'category[:]', // entire enum (same as 'category')
 *  'items[]', // array split
 *  'records{}' // record split
 * ]
 * ```
 */
export type Split = z.infer<typeof splitSchema>;

export interface ArraySplit {
  path: string;
  isArrayElement: boolean;
  excludedSubArrays: string[]; // For handling nested exclusions
}

export type SplitPlan = Split[];

// Decomposition options for automatic splitting
export interface DecompositionOptions {
  maxTokensPerSchema?: number;
  maxOptionsPerEnum?: number;
}

// Suggestion strategy types for future extensibility
export interface SuggestionStrategy {
  name: string;
  suggest(
    schema: ZodObject<Record<string, ZodType>>,
    options?: unknown,
  ): SplitPlan;
}

// Size-based strategy options
export interface SizeBasedOptions {
  maxTokensPerSchema: number;
  maxOptionsPerEnum: number;
}

// Internal types for processing
export interface SplitGroup {
  name: string;
  paths: string[];
  schemas: Record<string, ZodType>;
}
