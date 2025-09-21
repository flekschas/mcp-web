import { ZodEnum, ZodObject, type ZodType, z } from 'zod';
import type { Split } from './types.js';

// Path utilities - simple and dependency-free
export const setNestedValue = (
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void => {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (
      !(key in current) ||
      typeof current[key] !== 'object' ||
      current[key] === null
    ) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
};

// Custom even chunking function for optimal distribution
export const evenChunk = <T>(array: T[], maxChunkSize: number): T[][] => {
  if (array.length <= maxChunkSize) return [array];

  const numChunks = Math.ceil(array.length / maxChunkSize);
  const evenChunkSize = Math.ceil(array.length / numChunks);

  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += evenChunkSize) {
    chunks.push(array.slice(i, i + evenChunkSize));
  }

  return chunks;
};

// Parse split notation including enum splits, array splits, and record splits
export const parseEnumSplit = (
  item: Split,
): { path: string; chunkSize?: number; start?: number; end?: number; isArraySplit?: boolean; isRecordSplit?: boolean } => {
  // Handle nested array split notation: 'views[].tracks.top[]'
  // This matches patterns where we have array splits within array splits
  const nestedArrayMatch = item.match(/^(.+)\[\]\.(.+)\[\]$/);
  if (nestedArrayMatch) {
    const [, basePath, subPath] = nestedArrayMatch;
    // For validation, we need to check if the base path exists as an array
    // and if the subPath exists within the array element schema
    return { path: `${basePath}.${subPath}`, isArraySplit: true };
  }

  // Handle simple array split notation: 'views[]'
  const arrayMatch = item.match(/^(.+)\[\]$/);
  if (arrayMatch) {
    const [, path] = arrayMatch;
    return { path, isArraySplit: true };
  }

  // Handle record split notation: 'configs{}'
  const recordMatch = item.match(/^(.+)\{\}$/);
  if (recordMatch) {
    const [, path] = recordMatch;
    return { path, isRecordSplit: true };
  }
  // Handle chunk size notation: 'category[50]'
  const chunkMatch = item.match(/^(.+)\[(\d+)\]$/);
  if (chunkMatch) {
    const [, path, chunkSizeStr] = chunkMatch;
    return { path, chunkSize: parseInt(chunkSizeStr, 10) };
  }

  // Handle full slice notation: 'category[10:20]' or 'category[-5:10]'
  const fullSliceMatch = item.match(/^(.+)\[(-?\d+):(-?\d+)\]$/);
  if (fullSliceMatch) {
    const [, path, startStr, endStr] = fullSliceMatch;
    return { path, start: parseInt(startStr, 10), end: parseInt(endStr, 10) };
  }

  // Handle slice from index to end: 'category[10:]' or 'category[-5:]'
  const fromIndexMatch = item.match(/^(.+)\[(-?\d+):\]$/);
  if (fromIndexMatch) {
    const [, path, startStr] = fromIndexMatch;
    return { path, start: parseInt(startStr, 10), end: undefined };
  }

  // Handle slice from start to index: 'category[:20]' or 'category[:-5]'
  const toIndexMatch = item.match(/^(.+)\[:(-?\d+)\]$/);
  if (toIndexMatch) {
    const [, path, endStr] = toIndexMatch;
    return { path, start: 0, end: parseInt(endStr, 10) };
  }

  // Handle entire enum slice: 'category[:]'
  const entireMatch = item.match(/^(.+)\[:\]$/);
  if (entireMatch) {
    const [, path] = entireMatch;
    return { path, start: 0, end: undefined };
  }

  // Regular path
  return { path: item };
};

// Extract schema at a given path
export const getSchemaAtPath = (
  schema: ZodObject<Record<string, ZodType>>,
  path: string,
): ZodType | undefined => {
  const parts = path.split('.');
  let current: ZodType = schema;

  for (const part of parts) {
    if (current instanceof ZodObject) {
      const shape = current.shape as Record<string, ZodType>;
      current = shape[part];
      if (!current) return undefined;
    } else {
      return undefined;
    }
  }

  return current;
};

// Create a schema with only specified paths
export const extractSchemaForPaths = (
  originalSchema: ZodObject<Record<string, ZodType>>,
  paths: string[],
): ZodObject<Record<string, ZodType>> => {
  const shape: Record<string, ZodType> = {};

  for (const path of paths) {
    const parsedPath = parseEnumSplit(path);
    const schema = getSchemaAtPath(originalSchema, parsedPath.path);

    if (!schema) continue;

    // Handle enum splitting
    if (
      schema instanceof ZodEnum &&
      (parsedPath.chunkSize || parsedPath.start !== undefined)
    ) {
      const enumOptions = schema.options as string[];

      if (parsedPath.chunkSize) {
        // For chunk size, we don't handle it in extractSchemaForPaths - that's done in manual-decompose
        // This should not happen in normal usage as chunks generate multiple schemas
        // Skip this path and continue with regular schema extraction
      } else if (parsedPath.start !== undefined) {
        // Handle slice notation with optional end
        const end =
          parsedPath.end !== undefined ? parsedPath.end : enumOptions.length;
        const slicedOptions = enumOptions.slice(parsedPath.start, end);
        if (slicedOptions.length > 0) {
          setNestedValue(
            shape,
            parsedPath.path,
            z.enum(slicedOptions as [string, ...string[]]),
          );
        }
      }
    } else {
      // Handle regular schema extraction
      setNestedValue(shape, parsedPath.path, schema);
    }
  }

  return z.object(shape);
};

// Estimate tokens in a schema (rough approximation)
export const estimateTokensByJsonSchema = (schema: ZodType): number => {
  try {
    const jsonSchema = z.toJSONSchema(schema);
    const schemaString = JSON.stringify(jsonSchema);
    return Math.ceil(schemaString.length / 3.5);
  } catch {
    // Fallback for schemas that can't be converted
    return 100;
  }
};

/**
 * Helper function to create conditional enum splits based on enum size
 */
export function conditionalEnumSplit(
  path: string,
  maxSize: number,
  schema: ZodObject<Record<string, ZodType>>,
): string[] {
  const enumSchema = getSchemaAtPath(schema, path);

  if (!(enumSchema instanceof ZodEnum)) {
    return [path]; // Not an enum, return as regular path
  }

  const enumOptions = enumSchema.options as string[];

  if (enumOptions.length <= maxSize) {
    return [path]; // Small enough, no split needed
  }

  // Return chunk notation
  return [`${path}[${maxSize}]`];
}
