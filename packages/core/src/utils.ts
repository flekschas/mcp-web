import type { ToolMetadataJson, ToolDefinition } from '@mcp-web/types';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { z } from 'zod';

// Checks JSON Schemas like the MCP TypeScript SDK client checks tool results:
// as draft-07, with string formats, and ignoring `$schema`. Schemas aren't
// registered by `$id`, so tools can share a schema without clashing.
const ajv = new Ajv({
  strict: false,
  validateSchema: false,
  addUsedSchema: false,
});
addFormats(ajv);

// Type guard to check if a schema is a Zod schema
export function isZodSchema(schema: z.ZodType<unknown> | z.core.JSONSchema.JSONSchema): schema is z.ZodType<unknown> {
  return typeof schema === 'object' && 'safeParse' in schema;
}

export function toJSONSchema(schema: z.ZodType | z.core.JSONSchema.JSONSchema): z.core.JSONSchema.JSONSchema {
  if (schema && typeof schema === 'object' && 'safeParse' in schema) {
    const jsonSchema = z.toJSONSchema(schema as z.ZodSchema);
    // Remove $schema property to avoid AJV Draft 2020-12 validation errors
    // Our AJV instance only supports Draft 7
    if (typeof jsonSchema === 'object' && '$schema' in jsonSchema) {
      const { $schema: _unused, ...rest } = jsonSchema as Record<string, unknown>;
      return rest;
    }
    return jsonSchema;
  }
  return schema;
}

/**
 * Converts a Zod output schema to JSON Schema draft-07, the dialect the MCP
 * TypeScript SDK client checks tool results with. Zod's default 2020-12 output
 * writes tuples in a form that draft-07 rejects. A JSON Schema is returned as
 * is.
 */
export function toOutputJSONSchema(
  schema: z.ZodType | z.core.JSONSchema.JSONSchema
): z.core.JSONSchema.JSONSchema {
  return isZodSchema(schema)
    ? z.toJSONSchema(schema, { target: 'draft-7' })
    : schema;
}

export function toToolZodSchema<T>(schema?: z.ZodType<T> | z.core.JSONSchema.JSONSchema): z.ZodObject {
  // If it's already an object schema, use as-is
  if (schema instanceof z.ZodObject) {
    return schema;
  }
  // For non-objects, wrap in a value property for consistent tool interface
  return z.object({ value: schema as z.ZodSchema });
}

// Convert schema to appropriate format for tools
export function toToolSchema<T>(schema?: z.ZodType<T> | z.core.JSONSchema.JSONSchema): z.ZodObject | z.core.JSONSchema.JSONSchema {
  if (!schema) {
    return z.object({});
  }

  if (isZodSchema(schema)) {
    return toToolZodSchema(schema);
  }

  // Handle JSON Schema case
  return schema;
}

export function validateInput<T>(
  input: unknown,
  schema: z.ZodType<T> | z.core.JSONSchema.JSONSchema
): T {
  return validate(input, schema, 'input');
}

/**
 * Validates a tool result and returns the value to send: Zod's parsed data,
 * which drops unknown keys and fills in defaults, or the result itself for a
 * JSON Schema.
 *
 * A `_meta` field is left out of the check and kept, because it carries
 * transport data such as an MCP App's resource URI, not tool output.
 */
export function validateOutput(
  output: unknown,
  schema: z.ZodType | z.core.JSONSchema.JSONSchema
): unknown {
  if (!isPlainObject(output) || !('_meta' in output)) {
    return validate(output, schema, 'output');
  }
  const { _meta, ...rest } = output;
  const validOutput = validate(rest, schema, 'output');
  return isPlainObject(validOutput) ? { ...validOutput, _meta } : validOutput;
}

/**
 * Returns a function that validates a tool result like `validateOutput`.
 * A JSON Schema is compiled here, so a broken schema fails before the tool
 * runs. Returns `undefined` when the page blocks compiling, which a Content
 * Security Policy without `unsafe-eval` does, and the result goes unchecked.
 */
export function getOutputValidator(
  schema: z.ZodType | z.core.JSONSchema.JSONSchema
): ((output: unknown) => unknown) | undefined {
  if (!isZodSchema(schema)) {
    try {
      ajv.compile(schema);
    } catch (error) {
      if (!(error instanceof EvalError)) throw error;
      console.warn(
        'Tool results are not checked against JSON Schema output schemas because the page blocks compiling them. Use a Zod output schema to check them.'
      );
      return undefined;
    }
  }
  return (output) => validateOutput(output, schema);
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function validate<T>(
  value: unknown,
  schema: z.ZodType<T> | z.core.JSONSchema.JSONSchema,
  kind: 'input' | 'output'
): T {
  if (!schema) {
    return value as T;
  }

  if (isZodSchema(schema)) {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new Error(`Invalid ${kind}: ${result.error.message}`);
    }
    return result.data;
  }

  // JSON Schema validation
  const validateJson = ajv.compile(schema);
  if (!validateJson(value)) {
    throw new Error(`Invalid ${kind}: ${ajv.errorsText(validateJson.errors)}`);
  }

  return value as T;
}

/**
 * Convert a ToolDefinition to ToolMetadataJson for wire transmission.
 * Removes the handler and converts Zod schemas to JSON Schema.
 *
 * @param tool - The tool definition to convert
 * @returns Serializable tool metadata without handler, with JSON Schema schemas
 */
export function toToolMetadataJson(tool: ToolDefinition): ToolMetadataJson {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema ? toJSONSchema(tool.inputSchema as z.ZodType) : undefined,
    outputSchema: tool.outputSchema ? toOutputJSONSchema(tool.outputSchema as z.ZodType) : undefined,
    annotations: tool.annotations,
  };
}

/**
 * Deep merge two objects recursively.
 * Used for partial updates to state objects.
 *
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns The merged result
 *
 * Key behaviors:
 * - `undefined` in source → keep target value (no change)
 * - `null` in source → set to null (explicit clear)
 * - Nested objects → recursively merged
 * - Arrays → replaced entirely (not merged)
 */
export function deepMerge(target: unknown, source: unknown): unknown {
  // Base cases
  if (source === null) return source; // Explicit null clears the value
  if (source === undefined) return target; // Undefined means "no change"
  if (typeof source !== 'object') return source;
  if (Array.isArray(source)) return source; // Arrays are replaced, not merged
  if (typeof target !== 'object' || target === null) return source;
  if (Array.isArray(target)) return source;

  // Object merge: recursively merge properties
  const result = { ...target } as Record<string, unknown>;
  for (const [key, value] of Object.entries(source)) {
    result[key] = deepMerge(result[key], value);
  }
  return result;
}
