import { z } from 'zod';
import { isKeyField, unwrapSchema } from './schema-helpers.js';
import type { KeyFieldResult, SchemaShape } from './types.js';

/**
 * Analyzes a schema to determine its shape characteristics.
 */
export function analyzeSchemaShape(schema: z.ZodTypeAny): SchemaShape {
  const unwrapped = unwrapSchema(schema);

  // Default result
  const result: SchemaShape = {
    type: 'unsupported',
    subtype: 'unknown',
    hasOptionalFields: false,
    optionalPaths: [],
    fixedPaths: [],
    dynamicPaths: [],
  };

  if (
    unwrapped instanceof z.ZodString ||
    unwrapped instanceof z.ZodNumber ||
    unwrapped instanceof z.ZodBoolean ||
    unwrapped instanceof z.ZodLiteral ||
    unwrapped instanceof z.ZodEnum
  ) {
    result.type = 'fixed';
    result.subtype = 'primitive';
    return result;
  }

  if (unwrapped instanceof z.ZodTuple) {
    result.type = 'fixed';
    result.subtype = 'tuple';
    return result;
  }

  if (unwrapped instanceof z.ZodArray) {
    result.type = 'dynamic';
    result.subtype = 'array';
    return result;
  }

  if (unwrapped instanceof z.ZodRecord) {
    result.type = 'dynamic';
    result.subtype = 'record';
    return result;
  }

  // Objects - analyze further
  if (unwrapped instanceof z.ZodObject) {
    result.subtype = 'object';
    const shape = unwrapped.shape;

    for (const [key, field] of Object.entries(shape)) {
      const zodField = field as z.ZodTypeAny;
      const unwrappedField = unwrapSchema(zodField);

      // Check for optional fields
      if (zodField instanceof z.ZodOptional) {
        result.hasOptionalFields = true;
        result.optionalPaths.push(key);
      }

      // Check if field is dynamic (array or record)
      if (unwrappedField instanceof z.ZodArray || unwrappedField instanceof z.ZodRecord) {
        result.dynamicPaths.push(key);
      } else {
        result.fixedPaths.push(key);
      }
    }

    // Determine object type
    if (result.dynamicPaths.length > 0 && result.fixedPaths.length > 0) {
      result.type = 'mixed';
    } else if (result.dynamicPaths.length > 0) {
      result.type = 'dynamic';
    } else {
      result.type = 'fixed';
    }

    return result;
  }

  return result;
}

/**
 * Detects the ID field in an object schema.
 * Returns information about explicit id() markers.
 * Throws an error if multiple id() markers are found.
 */
export function findIdField(schema: z.ZodObject<z.ZodRawShape>): KeyFieldResult {
  const shape = schema.shape;
  let explicitKey: string | null = null;

  for (const [name, field] of Object.entries(shape)) {
    if (isKeyField(field as z.ZodTypeAny)) {
      // Error if multiple id() markers
      if (explicitKey) {
        throw new Error(
          `Multiple fields marked with id(): '${explicitKey}' and '${name}'.\n` +
          `Only one field can be the ID. For compound keys, use index-based addressing.`
        );
      }
      explicitKey = name;
    }
  }

  if (explicitKey) {
    return { type: 'explicit', field: explicitKey };
  }

  // No id() marker → use index-based addressing
  return { type: 'none' };
}

/**
 * Validates that a schema only uses supported types.
 * Throws an error if unsupported types are found.
 */
export function validateSupportedTypes(schema: z.ZodTypeAny, path = 'root'): string[] {
  const errors: string[] = [];
  const unwrapped = unwrapSchema(schema);

  const supported = [
    z.ZodObject,
    z.ZodArray,
    z.ZodRecord,
    z.ZodString,
    z.ZodNumber,
    z.ZodBoolean,
    z.ZodLiteral,
    z.ZodEnum,
    z.ZodTuple,
    z.ZodDate,
    z.ZodBigInt,
    z.ZodNull,
    z.ZodUndefined,
  ];

  const isSupported = supported.some((type) => unwrapped instanceof type);

  if (!isSupported) {
    errors.push(`Unsupported type at '${path}': ${unwrapped.constructor.name}`);
  }

  // Recurse for nested schemas
  if (unwrapped instanceof z.ZodObject) {
    for (const [key, field] of Object.entries(unwrapped.shape)) {
      errors.push(...validateSupportedTypes(field as z.ZodTypeAny, `${path}.${key}`));
    }
  } else if (unwrapped instanceof z.ZodArray) {
    errors.push(...validateSupportedTypes(unwrapped.element as z.ZodTypeAny, `${path}[]`));
  } else if (unwrapped instanceof z.ZodRecord) {
    const def = unwrapped._def as unknown as { valueType?: z.ZodTypeAny };
    const valueType = def.valueType;
    if (valueType) {
      errors.push(...validateSupportedTypes(valueType, `${path}{}`));
    }
  }

  return errors;
}
