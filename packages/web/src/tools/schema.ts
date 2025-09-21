import Ajv, { type AnySchema } from 'ajv';
import { z } from 'zod';

const ajv = new Ajv({ strict: false });

const validateJsonSchemaOrZod = (schema: unknown): schema is z.core.JSONSchema.JSONSchema | z.ZodObject => {
  // Check if it's a Zod schema
  if (schema && typeof schema === 'object' && 'safeParse' in schema && typeof schema.safeParse === 'function') {
    return true;
  }

  // Check if it's a JSON Schema
  if (schema && typeof schema === 'object') {
    // Allow schemas with explicit $schema to validate against their declared version
    if ('$schema' in schema && schema.$schema) {
      return ajv.validateSchema(schema as AnySchema) as boolean;
    }

    // Default to Draft 7 for schemas without $schema
    const schemaWithDraft = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      ...schema
    };

    return ajv.validateSchema(schemaWithDraft as AnySchema) as boolean;
  }

  return false;
};

/** The schema for a tool definition. */
export const ToolDefinitionSchema = z.object({
  /** The name of the tool. */
  name: z.string().min(1, 'Tool name is required'),
  /** The description of the tool. */
  description: z.string().min(1, 'Tool description is required'),
  /** The function that handles the tool execution. */
  // biome-ignore lint/suspicious/noExplicitAny: It's truly anything
  handler: z.custom<(...args: any[]) => any | Promise<any>>(
    (val) => typeof val === 'function',
    { message: "Handler must be a function" }
  ),
  /** The input schema for the tool. Can be either a JSON Schema or a Zod schema. */
  inputSchema: z.custom<z.core.JSONSchema.JSONSchema | z.ZodObject>(
    validateJsonSchemaOrZod,
    { message: "Must be valid JSON Schema Draft 7 or Zod schema" }
  ).optional(),
  /** The output schema for the tool. Can be either a JSON Schema or a Zod schema. */
  outputSchema: z.custom<z.core.JSONSchema.JSONSchema | z.ZodObject>(
    validateJsonSchemaOrZod,
    { message: "Must be valid JSON Schema Draft 7 or Zod schema" }
  ).optional()
});
