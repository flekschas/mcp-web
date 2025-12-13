import { z } from 'zod';
import { ToolMetadataJsonSchema } from './tools.js';

export const ProcessedContextItemSchema = z.object({
  name: z.string(),
  value: z.unknown(),
  schema: z.custom<z.core.JSONSchema.JSONSchema>().optional(),
  description: z.string().optional(),
  type: z.enum(['tool', 'ephemeral']),
});

export const QuerySchema = z.object({
  uuid: z.string(),
  prompt: z.string(),
  context: z.array(ProcessedContextItemSchema),
  responseTool: ToolMetadataJsonSchema.optional(),
  tools: z.array(ToolMetadataJsonSchema).optional(),
  restrictTools: z.boolean().optional()
});

/**
 * Wire-format query message schemas.
 *
 * These schemas represent messages sent over WebSocket between the bridge server and frontends.
 * They are used for:
 * - Bridge <-> Web communication (WebSocket messages)
 * - Agent <-> Bridge communication (HTTP endpoints for progress/complete)
 *
 * Note: The web package (@mcp-web/web) has similar but slightly different schemas optimized
 * for client-side consumption. These wire-format schemas are the source of truth for network
 * communication.
 */

export const QueryMessageSchema = z.object({
  type: z.literal('query').default('query'),
  ...QuerySchema.shape
});

export const QueryAcceptedMessageSchema = z.object({
  type: z.literal('query_accepted').default('query_accepted'),
  uuid: z.string()
});

export const QueryProgressMessageSchema = z.object({
  type: z.literal('query_progress').default('query_progress'),
  uuid: z.string(),
  message: z.string(),
});

export const QueryCompleteBaseMessageSchema = z.object({
  type: z.literal('query_complete').default('query_complete'),
  uuid: z.string(),
});

export const QueryCompleteClientMessageSchema = z.object({
  ...QueryCompleteBaseMessageSchema.shape,
  message: z.string(),
});

export const QueryCompleteBridgeMessageSchema = z.object({
  ...QueryCompleteBaseMessageSchema.shape,
  message: z.string().optional(),
  toolCalls: z.array(z.object({
    tool: z.string(),
    arguments: z.unknown(),
    result: z.unknown()
  })),
});

export const QueryFailureMessageSchema = z.object({
  type: z.literal('query_failure').default('query_failure'),
  uuid: z.string().describe('The query UUID'),
  error: z.string().describe('The error code'),
  reason: z.string().optional().describe('The reason for the failure'),
});

export const QueryCancelMessageSchema = z.object({
  type: z.literal('query_cancel').default('query_cancel'),
  uuid: z.string().describe('The query UUID to cancel'),
  reason: z.string().optional().describe('The reason for the cancellation'),
});

// Export inferred types
export type ProcessedContextItem = z.infer<typeof ProcessedContextItemSchema>;
export type Query = z.infer<typeof QuerySchema>;
export type QueryMessage = z.output<typeof QueryMessageSchema>;
export type QueryAcceptedMessage = z.output<typeof QueryAcceptedMessageSchema>;
export type QueryProgressMessage = z.output<typeof QueryProgressMessageSchema>;
export type QueryCompleteClientMessage = z.output<typeof QueryCompleteClientMessageSchema>;
export type QueryCompleteBridgeMessage = z.output<typeof QueryCompleteBridgeMessageSchema>;
export type QueryFailureMessage = z.output<typeof QueryFailureMessageSchema>;
export type QueryCancelMessage = z.output<typeof QueryCancelMessageSchema>;
