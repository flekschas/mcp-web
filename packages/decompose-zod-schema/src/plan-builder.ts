import type { ZodObject, ZodType } from 'zod';
import type { SplitPlan } from './types.js';
import { conditionalEnumSplit } from './utils.js';

/**
 * Fluent builder for constructing schema decomposition plans.
 *
 * Provides a more ergonomic API for building complex split plans compared
 * to manually constructing arrays.
 *
 * @example
 * ```typescript
 * const plan = new PlanBuilder()
 *   .addSplit('settings')
 *   .addArraySplit('todos')
 *   .addEnumSplit('category', 50)
 *   .build();
 *
 * const decomposed = decomposeSchema(schema, plan);
 * ```
 */
export class PlanBuilder {
  private plan: SplitPlan = [];

  /**
   * Adds a simple path split.
   * @param path - Dot-notation path to the property (e.g., 'user.profile')
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
   * Adds an array split for item-by-item operations.
   * @param path - Path to the array property
   */
  addArraySplit(path: string): this {
    this.plan.push(`${path}[]`);
    return this;
  }

  /**
   * Adds a record split for key-value operations.
   * @param path - Path to the record property
   */
  addRecordSplit(path: string): this {
    this.plan.push(`${path}{}`);
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
