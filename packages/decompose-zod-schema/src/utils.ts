import {
  ZodArray,
  ZodDefault,
  ZodEnum,
  ZodNullable,
  ZodObject,
  ZodOptional,
  ZodRecord,
  type ZodType,
  z,
} from 'zod';
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

// Parse split notation for enum splits
export const parseEnumSplit = (
  item: Split,
): { path: string; chunkSize?: number; start?: number; end?: number } => {
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

// Extract schema at a given path (only traverses ZodObject shapes)
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

/**
 * Metadata about a segment encountered during deep path traversal.
 */
export interface DeepPathSegment {
  /** The property key at this path segment */
  key: string;
  /** Whether this segment is an array, record, or regular object property */
  collectionType: 'array' | 'record' | 'none';
}

/**
 * Result of deep path traversal.
 */
export interface DeepPathResult {
  /** The schema at the target path */
  schema: ZodType;
  /** Information about each segment in the path */
  segments: DeepPathSegment[];
}

/**
 * Unwrap optional, nullable, and default wrappers from a schema.
 */
const unwrapZodSchema = (schema: ZodType): ZodType => {
  let current = schema;
  // biome-ignore lint/correctness/noConstantCondition: intentional unwrap loop
  while (true) {
    if (current instanceof ZodOptional) {
      current = current.unwrap() as ZodType;
    } else if (current instanceof ZodNullable) {
      current = current.unwrap() as ZodType;
    } else if (current instanceof ZodDefault) {
      current = current.removeDefault() as ZodType;
    } else {
      return current;
    }
  }
};

/**
 * Traverse a dot-path through a schema, following through array elements
 * and record values. This allows resolving paths like 'views.tracks.top'
 * where 'views' is an array.
 *
 * Returns the schema at the target path and metadata about each segment
 * (including whether it's a collection that needs indexing).
 */
export const getSchemaAtDeepPath = (
  schema: ZodObject<Record<string, ZodType>>,
  path: string,
): DeepPathResult | undefined => {
  const parts = path.split('.');
  let current: ZodType = schema;
  const segments: DeepPathSegment[] = [];

  for (const part of parts) {
    const unwrapped = unwrapZodSchema(current);

    if (unwrapped instanceof ZodObject) {
      const shape = unwrapped.shape as Record<string, ZodType>;
      const next = shape[part];
      if (!next) return undefined;
      segments.push({ key: part, collectionType: 'none' });
      current = next;
    } else if (unwrapped instanceof ZodArray) {
      // Traverse into the array's element schema
      const element = unwrapZodSchema(unwrapped.element as ZodType);
      if (!(element instanceof ZodObject)) return undefined;
      const shape = element.shape as Record<string, ZodType>;
      const next = shape[part];
      if (!next) return undefined;
      // Mark the PREVIOUS segment as an array (it was the array property)
      if (segments.length > 0) {
        segments[segments.length - 1].collectionType = 'array';
      }
      segments.push({ key: part, collectionType: 'none' });
      current = next;
    } else if (unwrapped instanceof ZodRecord) {
      // Traverse into the record's value schema
      const valueDef = (unwrapped._def as unknown as { valueType?: ZodType })
        .valueType;
      if (!valueDef) return undefined;
      const valueUnwrapped = unwrapZodSchema(valueDef);
      if (!(valueUnwrapped instanceof ZodObject)) return undefined;
      const shape = valueUnwrapped.shape as Record<string, ZodType>;
      const next = shape[part];
      if (!next) return undefined;
      // Mark the PREVIOUS segment as a record
      if (segments.length > 0) {
        segments[segments.length - 1].collectionType = 'record';
      }
      segments.push({ key: part, collectionType: 'none' });
      current = next;
    } else {
      return undefined;
    }
  }

  return { schema: current, segments };
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
        // For chunk size, we don't handle it in extractSchemaForPaths
        // This should not happen in normal usage as chunks generate multiple schemas
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
