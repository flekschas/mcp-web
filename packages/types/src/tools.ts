import { Ajv, type AnySchema } from 'ajv';
import { z } from 'zod';

/**
 * Re-export MCP SDK's standard Tool type for convenience.
 *
 * This is the wire protocol type used for tool definitions in MCP communication.
 * It differs from `ToolDefinition` which includes additional client-side
 * properties like `handler` and `outputSchema` not in the MCP wire protocol.
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

/**
 * Tool definition for client-side use with handler and optional schemas.
 *
 * This is the primary type used when registering tools with MCPWeb.
 * Supports both Zod schemas (recommended) and JSON schemas.
 */
export interface ToolDefinition {
  /** Unique name for the tool. */
  name: string;
  /** Description of what the tool does (shown to AI). */
  description: string;
  /** Function that executes the tool logic. */
  // biome-ignore lint/suspicious/noExplicitAny: Handler can accept/return anything
  handler: (input?: any) => any | Promise<any>;
  /** Input parameter schema (Zod or JSON Schema). */
  inputSchema?: z.ZodObject | Record<string, unknown>;
  /** Output value schema (Zod or JSON Schema). */
  outputSchema?: z.ZodType | Record<string, unknown>;
  /**
   * Tool metadata, forwarded to the MCP `tools/list` response.
   * Used for MCP Apps to declare `_meta.ui.resourceUri`.
   */
  _meta?: Record<string, unknown>;
}

/**
 * Tool metadata without handler, for wire protocol transmission.
 * Schemas must be JSON Schema (not Zod) to be serializable.
 */
export const ToolMetadataZodSchema = ToolDefinitionZodSchema.omit({ handler: true });

/** Tool metadata type with Zod schemas. */
export type ToolMetadataZod = z.infer<typeof ToolMetadataJsonSchema>;

/** Tool metadata schema with JSON Schema format. */
export const ToolMetadataJsonSchema = ToolDefinitionJsonSchema.omit({ handler: true });

/** Tool metadata type with JSON schemas. */
export type ToolMetadataJson = z.infer<typeof ToolMetadataJsonSchema>;

/** Combined tool metadata schema accepting either format. */
export const ToolMetadataSchema = z.union([ToolMetadataZodSchema, ToolMetadataJsonSchema]);

/** Tool metadata type (either Zod or JSON Schema format). */
export type ToolMetadata = z.infer<typeof ToolMetadataSchema>;

/**
 * Internal processed tool definition with both Zod and JSON schemas.
 * @internal Used by MCPWeb for tool registration and validation.
 */
export type ProcessedToolDefinition = ToolDefinition & {
  /** Zod schema for input validation (if using Zod). */
  inputZodSchema?: z.ZodObject;
  /** Zod schema for output validation (if using Zod). */
  outputZodSchema?: z.ZodType;
  /** JSON Schema for input (always available after processing). */
  inputJsonSchema?: z.core.JSONSchema.JSONSchema;
  /** JSON Schema for output (always available after processing). */
  outputJsonSchema?: z.core.JSONSchema.JSONSchema;
}
