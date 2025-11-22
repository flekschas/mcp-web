import Ajv, { type AnySchema } from 'ajv';
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

const validateJsonSchema = (schema: unknown): schema is Record<string, unknown> => {
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

/** Schema for tool definitions with JSON Schema */
export const ToolDefinitionJsonSchema = ToolDefinitionBaseSchema.extend({
  /** The input schema for the tool (JSON Schema). */
  inputSchema: z.custom<Record<string, unknown>>(validateJsonSchema, { message: "Must be valid JSON Schema Draft 7" }).optional(),
  /** The output schema for the tool (JSON Schema). */
  outputSchema: z.custom<Record<string, unknown>>(validateJsonSchema, { message: "Must be valid JSON Schema Draft 7" }).optional()
});

/** Runtime validation schema that accepts either Zod or JSON Schema */
export const ToolDefinitionSchema = z.union([ToolDefinitionZodSchema, ToolDefinitionJsonSchema]);

// Simple, flexible tool definition that works for all cases
export interface ToolDefinition {
  name: string;
  description: string;
  // biome-ignore lint/suspicious/noExplicitAny: Handler can accept/return anything
  handler: (input?: any) => any | Promise<any>;
  inputSchema?: z.ZodObject<z.ZodRawShape> | Record<string, unknown>;
  outputSchema?: z.ZodType | Record<string, unknown>;
}

/**
 * Tool metadata without the handler for wire protocol transmission.
 * Schemas must be JSON Schema (not Zod objects) to be serializable over the wire.
 */
export const ToolMetadataSchema = ToolDefinitionSchema.transform((tool) => {
  const { handler: _handler, ...metadata } = tool;
  return metadata;
});

/**
 * Tool metadata without the handler.
 * Note: For wire transmission, schemas must be JSON Schema, not Zod objects.
 * Use `toSerializableToolMetadata()` to convert ToolDefinition to serializable format.
 */
export type ToolMetadata = Omit<ToolDefinition, 'handler'>;

/**
 * Serializable tool metadata for wire transmission.
 * Schemas are JSON Schema objects, not Zod schemas.
 */
export interface SerializableToolMetadata {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

/**
 * Schema for validating serializable tool metadata.
 * Used for wire protocol transmission where schemas must be JSON Schema (not Zod).
 */
export const SerializableToolMetadataSchema = z.object({
  name: z.string().min(1, 'Tool name is required'),
  description: z.string().min(1, 'Tool description is required'),
  inputSchema: z.custom<Record<string, unknown>>(validateJsonSchema, { message: "Must be valid JSON Schema Draft 7" }).optional(),
  outputSchema: z.custom<Record<string, unknown>>(validateJsonSchema, { message: "Must be valid JSON Schema Draft 7" }).optional()
});

export type ProcessedToolDefinition = ToolDefinition & {
  inputZodSchema?: z.ZodObject;
  outputZodSchema?: z.ZodType;
  inputJsonSchema?: Record<string, unknown>;
  outputJsonSchema?: Record<string, unknown>;
}
