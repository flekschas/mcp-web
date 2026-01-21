import { ToolDefinitionSchema } from '@mcp-web/types';
import { z } from 'zod';

export const EphemeralContextSchema = z.object({
  name: z.string(),
  value: z.unknown(),
  description: z.string().optional(),
  schema: z.custom<z.core.JSONSchema.JSONSchema>().optional()
});

export const ContextItemSchema = z.union([ToolDefinitionSchema, EphemeralContextSchema]);

export const QueryRequestSchema = z.object({
  /** Query prompt */
  prompt: z.string(),
  /** Context items to use for the query */
  context: z.array(ContextItemSchema).optional(),
  /** Tool to use for completing a query */
  responseTool: ToolDefinitionSchema.optional(),
  /** Tools available for this query (optimization - avoids listTools call) */
  tools: z.array(ToolDefinitionSchema).optional(),
  /** If true, only tools listed in 'tools' array can be called */
  restrictTools: z.boolean().optional().default(false),
  /** Timeout for the query */
  timeout: z.number().optional().default(30000),
});

/**
 * Client-side query response result schemas.
 *
 * These schemas represent individual query lifecycle events as consumed by the web library from the bridge.
 * They differ slightly from the wire-format schemas in @mcp-web/types/query because:
 * - Wire format (types package): Optimized for WebSocket transmission between bridge and frontend
 * - Client format (web package): Optimized for consumption by the MCPWeb class
 *
 * The main difference is that `QueryResponseResultCompleteSchema` includes the full toolCalls array,
 * while the wire format `QueryCompleteBridgeMessageSchema` is the same but sent over WebSocket.
 */

export const QueryResponseResultAcceptedSchema = z.object({
  type: z.literal('query_accepted').default('query_accepted'),
  uuid: z.string(),
});

export const QueryResponseResultProgressSchema = z.object({
  type: z.literal('query_progress').default('query_progress'),
  uuid: z.string(),
  message: z.string(),
});

export const QueryResponseResultCompleteSchema = z.object({
  type: z.literal('query_complete').default('query_complete'),
  uuid: z.string(),
  message: z.string().optional(),
  toolCalls: z.array(z.object({
    tool: z.string(),
    arguments: z.unknown(),
    result: z.unknown()
  })),
});

export const QueryResponseResultFailureSchema = z.object({
  type: z.literal('query_failure').default('query_failure'),
  uuid: z.string(),
  error: z.string(),
});

export const QueryResponseResultCancelSchema = z.object({
  type: z.literal('query_cancel').default('query_cancel'),
  uuid: z.string(),
  reason: z.string().optional(),
});

export const QueryResponseResultSchema = z.union([
  QueryResponseResultAcceptedSchema,
  QueryResponseResultProgressSchema,
  QueryResponseResultCompleteSchema,
  QueryResponseResultFailureSchema,
  QueryResponseResultCancelSchema,
]);
