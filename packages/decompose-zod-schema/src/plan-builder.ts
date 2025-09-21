import type { ZodObject, ZodType } from 'zod';
import type { SplitPlan } from './types.js';
import { conditionalEnumSplit } from './utils.js';

/**
 * Plan builder for more ergonomic plan construction
 */
export class PlanBuilder {
  private plan: SplitPlan = [];

  addSplit(path: string): this {
    this.plan.push(path);
    return this;
  }

  addEnumSplit(path: string, chunkSize: number): this {
    this.plan.push(`${path}[${chunkSize}]`);
    return this;
  }

  addEnumSlice(path: string, start: number, end: number): this {
    this.plan.push(`${path}[${start}:${end}]`);
    return this;
  }

  addEnumSliceFromIndex(path: string, start: number): this {
    this.plan.push(`${path}[${start}:]`);
    return this;
  }

  addEnumSliceToIndex(path: string, end: number): this {
    this.plan.push(`${path}[:${end}]`);
    return this;
  }

  addEntireEnumSlice(path: string): this {
    this.plan.push(`${path}[:]`);
    return this;
  }

  addArraySplit(path: string): this {
    this.plan.push(`${path}[]`);
    return this;
  }

  addRecordSplit(path: string): this {
    this.plan.push(`${path}{}`);
    return this;
  }

  addConditionalEnumSplit(
    path: string,
    maxSize: number,
    schema: ZodObject<Record<string, ZodType>>,
  ): this {
    const splits = conditionalEnumSplit(path, maxSize, schema);
    this.plan.push(...splits);
    return this;
  }

  build(): SplitPlan {
    return [...this.plan];
  }
}
