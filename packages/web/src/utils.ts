import type { ToolMetadataJson, ToolDefinition } from '@mcp-web/types';
import Ajv from 'ajv';
import { z } from 'zod';

const ajv = new Ajv({ strict: false });

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
    outputSchema: tool.outputSchema ? toJSONSchema(tool.outputSchema as z.ZodType) : undefined,
  };
}
