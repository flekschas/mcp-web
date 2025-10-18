import Ajv from 'ajv';
import { ZodObject, z } from 'zod';

const ajv = new Ajv({ strict: false });

// Type guard to check if a schema is a Zod schema
export function isZodSchema(schema: z.ZodType<unknown> | z.core.JSONSchema.JSONSchema): schema is z.ZodType<unknown> {
  return typeof schema === 'object' && 'safeParse' in schema;
}

export function toJSONSchema(schema: z.ZodObject | z.core.JSONSchema.JSONSchema): z.core.JSONSchema.JSONSchema {
  if (schema && typeof schema === 'object' && 'safeParse' in schema) {
    return z.toJSONSchema(schema as z.ZodSchema);
  }
  return schema;
}

// Type guard to check if a schema represents an object value (plain object, not array)
export function isObjectValue<T>(schema?: z.ZodType<T> | z.core.JSONSchema.JSONSchema): boolean {
  if (!schema) return false;

  if (typeof schema === 'object' && 'safeParse' in schema) {
    // Zod schema - check if it's specifically an object schema (not array)
    return schema instanceof ZodObject;
  }

  // JSON Schema - check type property for 'object' specifically
  if (typeof schema === 'object' && 'type' in schema) {
    return schema.type === 'object';
  }

  return false;
}

// Validate that the schema represents a supported value type
export function isSupportedValue<T>(schema?: z.ZodType<T> | z.core.JSONSchema.JSONSchema): boolean {
  if (!schema) return true;

  if (typeof schema === 'object' && 'safeParse' in schema) {
    // For Zod schemas, we support most basic types
    // biome-ignore lint/suspicious/noExplicitAny: It's the internal zod definition
    const zodDef = (schema as any)._def;
    if (zodDef && 'typeName' in zodDef) {
      const unsupportedTypes = ['ZodMap', 'ZodSet', 'ZodFunction', 'ZodLazy', 'ZodPromise'];
      return !unsupportedTypes.includes(zodDef.typeName);
    }
    return true; // Default to supported if we can't determine type
  }

  // For JSON schemas, check for unsupported patterns
  if (typeof schema === 'object') {
    // We don't support schemas that explicitly define Map/Set-like structures
    return true; // Most JSON schemas are supported
  }

  return true;
}

// Convert schema to appropriate format for tools
export function toToolSchema<T>(schema?: z.ZodType<T> | z.core.JSONSchema.JSONSchema): z.ZodObject | z.core.JSONSchema.JSONSchema {
  if (!schema) {
    return z.object({});
  }

  if (isZodSchema(schema)) {
    // If it's already an object schema, use as-is
    if (schema instanceof z.ZodObject) {
      return schema;
    }
    // For non-objects, wrap in a value property for consistent tool interface
    return z.object({ value: schema as z.ZodSchema });
  }

  // Handle JSON Schema case
  return schema;
}

export function validateInput<T>(
  input: unknown,
  schema: z.ZodType<T> | z.core.JSONSchema.JSONSchema
): T {
  if (!schema) {
    return input as T;
  }

  if (isZodSchema(schema)) {
    const result = schema.safeParse(input);
    if (!result.success) {
      throw new Error(`Invalid input: ${result.error.message}`);
    }
    return result.data;
  }

  // JSON Schema validation
  const validate = ajv.compile(schema);
  const isValid = validate(input);
  if (!isValid) {
    throw new Error(`Invalid input: ${ajv.errorsText(validate.errors)}`);
  }

  return input as T;
}
