import type { ZodObject, ZodType } from 'zod';
import type { SplitPlan } from './types.js';
import { conditionalEnumSplit } from './utils.js';

/**
 * Fluent builder for constructing schema decomposition plans.
 *
 * Provides a more ergonomic API for building complex split plans compared
 * to manually constructing arrays. Array and record paths are auto-detected
 * from the schema — use `addSplit()` for all path types.
 *
 * @example
 * ```typescript
 * const plan = new PlanBuilder()
 *   .addSplit('settings')
 *   .addSplit('todos')           // auto-detected as array from schema
 *   .addSplit('views.tracks.top') // nested path through array elements
 *   .addEnumSplit('category', 50)
 *   .build();
 *
 * const decomposed = decomposeSchema(schema, plan);
 * ```
 */
export class PlanBuilder {
  private plan: SplitPlan = [];

  /**
   * Adds a path split. Works for all property types — objects, arrays,
   * records, and nested paths through collections.
   * @param path - Dot-notation path to the property (e.g., 'user.profile', 'todos', 'views.tracks.top')
   */
  addSplit(path: string): this {
    this.plan.push(path);
    return this;
  }

  /**
   * Adds an enum split that chunks the enum into equal-sized groups.
   * @param path - Path to the enum property
   * @param chunkSize - Maximum number of options per chunk
   */
  addEnumSplit(path: string, chunkSize: number): this {
    this.plan.push(`${path}[${chunkSize}]`);
    return this;
  }

  /**
   * Adds an enum slice from start to end index.
   * @param path - Path to the enum property
   * @param start - Start index (inclusive)
   * @param end - End index (exclusive)
   */
  addEnumSlice(path: string, start: number, end: number): this {
    this.plan.push(`${path}[${start}:${end}]`);
    return this;
  }

  /**
   * Adds an enum slice from start index to end.
   * @param path - Path to the enum property
   * @param start - Start index (inclusive)
   */
  addEnumSliceFromIndex(path: string, start: number): this {
    this.plan.push(`${path}[${start}:]`);
    return this;
  }

  /**
   * Adds an enum slice from start to end index.
   * @param path - Path to the enum property
   * @param end - End index (exclusive)
   */
  addEnumSliceToIndex(path: string, end: number): this {
    this.plan.push(`${path}[:${end}]`);
    return this;
  }

  /**
   * Adds a slice for the entire enum (equivalent to just the path).
   * @param path - Path to the enum property
   */
  addEntireEnumSlice(path: string): this {
    this.plan.push(`${path}[:]`);
    return this;
  }

  /**
   * Adds a conditional enum split based on size.
   * Only splits if enum exceeds maxSize, otherwise adds simple path.
   * @param path - Path to the enum property
   * @param maxSize - Maximum enum size before splitting
   * @param schema - The schema containing the enum
   */
  addConditionalEnumSplit(
    path: string,
    maxSize: number,
    schema: ZodObject<Record<string, ZodType>>,
  ): this {
    const splits = conditionalEnumSplit(path, maxSize, schema);
    this.plan.push(...splits);
    return this;
  }

  /**
   * Builds and returns the split plan.
   * @returns The constructed SplitPlan array
   */
  build(): SplitPlan {
    return [...this.plan];
  }
}
