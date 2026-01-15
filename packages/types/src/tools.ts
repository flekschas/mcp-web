import { Ajv, type AnySchema } from 'ajv';
import { z } from 'zod';

/**
 * Re-export MCP SDK's standard Tool type for convenience.
 * This is the wire protocol type used for tool definitions in MCP communication.
 *
 * Note: This differs from our `ToolDefinition` type which includes additional
 * client-side properties like `handler` and `outputSchema` that are not part
 * of the MCP wire protocol.
 */
export type { ListToolsResult, Tool } from '@modelcontextprotocol/sdk/types.js';

const ajv = new Ajv({ strict: false });

const validateJsonSchema = (schema: unknown): schema is z.core.JSONSchema.JSONSchema => {
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

/** Base schema for all tool definitions with common fields */
const ToolDefinitionBaseSchema = z.object({
  /** The name of the tool. */
  name: z.string().min(1, 'Tool name is required'),
  /** The description of the tool. */
  description: z.string().min(1, 'Tool description is required'),
  /** The function that handles the tool execution. */
  // biome-ignore lint/suspicious/noExplicitAny: Can literally be anything
  handler: z.custom<(...args: any[]) => any | Promise<any>>(
    (val) => typeof val === 'function',
    { message: "Handler must be a function" }
  ),
});

/** Schema for tool definitions with Zod schemas */
export const ToolDefinitionZodSchema = ToolDefinitionBaseSchema.extend({
  /** The input schema for the tool (Zod object schema). */
  inputSchema: z.instanceof(z.ZodObject).optional(),
  /** The output schema for the tool (any Zod schema type). */
  outputSchema: z.instanceof(z.ZodType).optional()
});

/** Tool definition type for tools with Zod schemas (inferred from schema) */
export type ToolDefinitionZod = z.infer<typeof ToolDefinitionZodSchema>;

/** Schema for tool definitions with JSON Schema */
export const ToolDefinitionJsonSchema = ToolDefinitionBaseSchema.extend({
  /** The input schema for the tool (JSON Schema). */
  inputSchema: z.custom<z.core.JSONSchema.JSONSchema>(validateJsonSchema, { message: "Must be valid JSON Schema Draft 7" }).optional(),
  /** The output schema for the tool (JSON Schema). */
  outputSchema: z.custom<z.core.JSONSchema.JSONSchema>(validateJsonSchema, { message: "Must be valid JSON Schema Draft 7" }).optional()
});

/** Runtime validation schema that accepts either Zod or JSON Schema */
export const ToolDefinitionSchema = z.union([ToolDefinitionZodSchema, ToolDefinitionJsonSchema]);

export interface ToolDefinition {
  name: string;
  description: string;
  // biome-ignore lint/suspicious/noExplicitAny: Handler can accept/return anything
  handler: (input?: any) => any | Promise<any>;
  inputSchema?: z.ZodObject | Record<string, unknown>;
  outputSchema?: z.ZodType | Record<string, unknown>;
}

/**
 * Tool metadata without the handler for wire protocol transmission.
 * Schemas must be JSON Schema (not Zod objects) to be serializable over the wire.
 */
export const ToolMetadataZodSchema = ToolDefinitionZodSchema.omit({ handler: true });
export type ToolMetadataZod = z.infer<typeof ToolMetadataJsonSchema>;

export const ToolMetadataJsonSchema = ToolDefinitionJsonSchema.omit({ handler: true });
export type ToolMetadataJson = z.infer<typeof ToolMetadataJsonSchema>;

export const ToolMetadataSchema = z.union([ToolMetadataZodSchema, ToolMetadataJsonSchema]);
export type ToolMetadata = z.infer<typeof ToolMetadataSchema>;

export type ProcessedToolDefinition = ToolDefinition & {
  inputZodSchema?: z.ZodObject;
  outputZodSchema?: z.ZodType;
  inputJsonSchema?: z.core.JSONSchema.JSONSchema;
  outputJsonSchema?: z.core.JSONSchema.JSONSchema;
}
