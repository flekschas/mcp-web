import { ZodEnum, type ZodObject, type ZodType } from 'zod';
import type { SplitPlan } from './types.js';
import {
  getSchemaAtDeepPath,
  getSchemaAtPath,
  parseEnumSplit,
} from './utils.js';

// Validate that a split plan is structurally correct
export const validatePlan = (
  plan: SplitPlan,
  schema: ZodObject<Record<string, ZodType>>,
): string[] => {
  const errors: string[] = [];
  const enumSlices: Map<
    string,
    Array<{ start: number; end: number; item: string }>
  > = new Map();

  for (const item of plan) {
    const parsed = parseEnumSplit(item);

    // Try shallow path first, then deep path (through arrays/records)
    let schemaAtPath = getSchemaAtPath(schema, parsed.path);
    if (!schemaAtPath) {
      const deepResult = getSchemaAtDeepPath(schema, parsed.path);
      if (deepResult) {
        schemaAtPath = deepResult.schema;
      } else {
        errors.push(`Path '${parsed.path}' does not exist in schema`);
        continue;
      }
    }

    // Validate enum split notation
    if (parsed.chunkSize || parsed.start !== undefined) {
      if (!(schemaAtPath instanceof ZodEnum)) {
        errors.push(
          `Path '${parsed.path}' is not an enum but has enum split notation`,
        );
        continue;
      }

      const enumOptions = schemaAtPath.options as string[];

      if (parsed.chunkSize) {
        if (parsed.chunkSize <= 0) {
          errors.push(
            `Chunk size must be positive for '${parsed.path}[${parsed.chunkSize}]'`,
          );
        }
      } else if (parsed.start !== undefined) {
        const end = parsed.end !== undefined ? parsed.end : enumOptions.length;

        // Validate slice bounds
        if (parsed.start < 0) {
          errors.push(`Start index cannot be negative in '${item}'`);
        }
        if (end > enumOptions.length) {
          errors.push(
            `End index ${end} exceeds enum length ${enumOptions.length} in '${item}'`,
          );
        }
        if (parsed.start >= end) {
          errors.push(`Start index must be less than end index in '${item}'`);
        }

        // Track slices for completeness validation
        if (!enumSlices.has(parsed.path)) {
          enumSlices.set(parsed.path, []);
        }
        const slicesArray = enumSlices.get(parsed.path);
        if (slicesArray) {
          slicesArray.push({ start: parsed.start, end, item });
        }
      }
    }
  }

  // Validate slice completeness for each enum path
  for (const [enumPath, slices] of enumSlices) {
    const schemaAtPath = getSchemaAtPath(schema, enumPath);
    if (!(schemaAtPath instanceof ZodEnum)) continue;

    const enumLength = (schemaAtPath.options as string[]).length;
    const sliceErrors = validateSliceCompleteness(enumPath, slices, enumLength);
    errors.push(...sliceErrors);
  }

  return errors;
};

// Validate that slices for an enum are complete (no gaps, no overlaps)
export const validateSliceCompleteness = (
  enumPath: string,
  slices: Array<{ start: number; end: number; item: string }>,
  enumLength: number,
): string[] => {
  const errors: string[] = [];

  // Sort slices by start index
  const sortedSlices = [...slices].sort((a, b) => a.start - b.start);

  // Check for overlaps and gaps
  let expectedStart = 0;

  for (let i = 0; i < sortedSlices.length; i++) {
    const slice = sortedSlices[i];

    // Check for gap
    if (slice.start > expectedStart) {
      errors.push(
        `Gap in enum slices for '${enumPath}': missing range [${expectedStart}:${slice.start}]`,
      );
    }

    // Check for overlap with previous slice
    if (slice.start < expectedStart) {
      errors.push(
        `Overlapping enum slices for '${enumPath}': '${slice.item}' overlaps with previous slice`,
      );
    }

    expectedStart = slice.end;
  }

  // Check if we covered the entire enum
  if (expectedStart < enumLength) {
    errors.push(
      `Incomplete enum slices for '${enumPath}': missing range [${expectedStart}:${enumLength}]`,
    );
  }

  // Check if we went beyond the enum length
  if (expectedStart > enumLength) {
    errors.push(
      `Enum slices for '${enumPath}' extend beyond enum length ${enumLength}`,
    );
  }

  return errors;
};
