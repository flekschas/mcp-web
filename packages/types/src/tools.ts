import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

/**
 * Re-export MCP SDK's standard Tool type for convenience.
 *
 * This is the wire protocol type used for tool definitions in MCP communication.
 * It differs from `ToolDefinition` which includes additional client-side
 * properties like `handler` that are not in the MCP wire protocol.
 */
export type { ListToolsResult, Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Returns the output schema when its top-level type is `object`, the only
 * kind of output schema MCP allows.
 */
export const getMcpOutputSchema = (
  schema?: z.core.JSONSchema.JSONSchema,
): Tool['outputSchema'] =>
  schema?.type === 'object' ? (schema as Tool['outputSchema']) : undefined;

/**
 * Whether a tool result reports a failure: an object with a set `error`, e.g.
 * `{ error: 'Invalid move' }`. A result like `{ status: 'rendered', error:
 * null }` is not one.
 */
export const isErrorResult = (result: unknown): boolean =>
  !!result &&
  typeof result === 'object' &&
  !!(result as { error?: unknown }).error;

/**
 * Checks the shape of a JSON Schema: the keywords the bridge and MCP clients
 * read, not the full meta-schema.
 *
 * Compiling the meta-schema needs `new Function`, which Cloudflare Workers
 * block, and this check runs on every query the bridge parses.
 */
const validateJsonSchema = (
  schema: unknown,
): schema is z.core.JSONSchema.JSONSchema => {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema))
    return false;

  const { type, properties, required } = schema as {
    type?: unknown;
    properties?: unknown;
    required?: unknown;
  };

  const typeIsValid =
    type === undefined ||
    typeof type === 'string' ||
    (Array.isArray(type) && type.every((entry) => typeof entry === 'string'));

  const propertiesAreValid =
    properties === undefined ||
    (typeof properties === 'object' &&
      properties !== null &&
      !Array.isArray(properties));

  const requiredIsValid =
    required === undefined ||
    (Array.isArray(required) &&
      required.every((entry) => typeof entry === 'string'));

  return typeIsValid && propertiesAreValid && requiredIsValid;
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
    { message: 'Handler must be a function' },
  ),
});

/** Schema for tool definitions with Zod schemas */
export const ToolDefinitionZodSchema = ToolDefinitionBaseSchema.extend({
  /** The input schema for the tool (Zod object schema). */
  inputSchema: z.instanceof(z.ZodObject).optional(),
  /** The output schema for the tool (any Zod schema type). */
  outputSchema: z.instanceof(z.ZodType).optional(),
});

/** Tool definition type for tools with Zod schemas (inferred from schema) */
export type ToolDefinitionZod = z.infer<typeof ToolDefinitionZodSchema>;

/**
 * A code tool, such as a `CodeTool` from `@mcp-web/tools/code`: a tool, with
 * the lookup tool that returns its function signatures when it has one.
 */
export type CodeToolLike = ToolDefinitionZod & {
  lookupTool?: ToolDefinitionZod | null;
  /** Tears down the sandbox. Called when the code tool is removed. */
  destroy?(): void;
};

/**
 * Builds a code tool over a state's generated tools. `createCodeMode` from
 * `@mcp-web/tools/code` returns one.
 */
export type CodeMode = <T>(state: {
  /** The state's name, as in `get_<name>`. */
  name: string;
  /** The state's getter, which is also registered on its own. */
  getter: ToolDefinitionZod;
  /** All the state's generated tools, including the getter. */
  tools: ToolDefinitionZod[];
  get: () => T;
  set: (value: T) => void;
}) => CodeToolLike;

/** Schema for tool definitions with JSON Schema */
export const ToolDefinitionJsonSchema = ToolDefinitionBaseSchema.extend({
  /** The input schema for the tool (JSON Schema). */
  inputSchema: z
    .custom<z.core.JSONSchema.JSONSchema>(validateJsonSchema, {
      message: 'Must be a JSON Schema object',
    })
    .optional(),
  /** The output schema for the tool (JSON Schema). */
  outputSchema: z
    .custom<z.core.JSONSchema.JSONSchema>(validateJsonSchema, {
      message: 'Must be a JSON Schema object',
    })
    .optional(),
});

/** Runtime validation schema that accepts Zod or JSON Schema for each schema */
export const ToolDefinitionSchema = ToolDefinitionBaseSchema.extend({
  inputSchema: z.union([
    ToolDefinitionZodSchema.shape.inputSchema,
    ToolDefinitionJsonSchema.shape.inputSchema,
  ]),
  outputSchema: z.union([
    ToolDefinitionZodSchema.shape.outputSchema,
    ToolDefinitionJsonSchema.shape.outputSchema,
  ]),
});

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
export const ToolMetadataZodSchema = ToolDefinitionZodSchema.omit({
  handler: true,
});

/** Tool metadata type with Zod schemas. */
export type ToolMetadataZod = z.infer<typeof ToolMetadataJsonSchema>;

/** Tool metadata schema with JSON Schema format. */
export const ToolMetadataJsonSchema = ToolDefinitionJsonSchema.omit({
  handler: true,
});

/** Tool metadata type with JSON schemas. */
export type ToolMetadataJson = z.infer<typeof ToolMetadataJsonSchema>;

/** Combined tool metadata schema accepting either format. */
export const ToolMetadataSchema = z.union([
  ToolMetadataZodSchema,
  ToolMetadataJsonSchema,
]);

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
};
