import { z } from 'zod';

/**
 * Re-export MCP SDK's standard Resource type for convenience.
 *
 * This is the wire protocol type used for resource definitions in MCP communication.
 */
export type { Resource, ListResourcesResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Handler function for reading a resource.
 * Returns the resource content as a string or binary data.
 */
export type ResourceReadHandler = () =>
  | string
  | Uint8Array
  | Promise<string>
  | Promise<Uint8Array>;

/**
 * Zod schema for resource definition validation.
 */
export const ResourceDefinitionSchema = z.object({
  /** Unique URI for the resource (e.g., "ui://app-name/resource.html") */
  uri: z.string().min(1, 'Resource URI is required'),
  /** Human-readable name for the resource */
  name: z.string().min(1, 'Resource name is required'),
  /** Description of the resource (shown to AI) */
  description: z.string().optional(),
  /** MIME type of the resource content (defaults to text/html) */
  mimeType: z.string().optional(),
  /** Handler function that returns the resource content */
  handler: z.custom<ResourceReadHandler>(
    (val) => typeof val === 'function',
    { message: 'Handler must be a function' }
  ),
});

/**
 * Resource definition for client-side use with handler.
 *
 * This is the primary type used when registering resources with MCPWeb.
 */
export interface ResourceDefinition {
  /** Unique URI for the resource (e.g., "ui://app-name/resource.html") */
  uri: string;
  /** Human-readable name for the resource */
  name: string;
  /** Description of the resource (shown to AI) */
  description?: string;
  /** MIME type of the resource content */
  mimeType?: string;
  /** Handler function that returns the resource content */
  handler: ResourceReadHandler;
}

/**
 * Resource metadata without handler, for wire protocol transmission.
 */
export const ResourceMetadataSchema = ResourceDefinitionSchema.omit({ handler: true });

/** Resource metadata type (serializable, no handler) */
export type ResourceMetadata = z.infer<typeof ResourceMetadataSchema>;

// ============================================
// WebSocket Message Types
// ============================================

/**
 * Message sent from frontend to bridge to register a resource.
 */
export interface RegisterResourceMessage {
  type: 'register-resource';
  resource: ResourceMetadata;
}

/**
 * Zod schema for register resource message validation.
 */
export const RegisterResourceMessageSchema = z.object({
  type: z.literal('register-resource'),
  resource: ResourceMetadataSchema,
});

/**
 * Message sent from bridge to frontend to request resource content.
 */
export interface ResourceReadMessage {
  type: 'resource-read';
  requestId: string;
  uri: string;
}

/**
 * Zod schema for resource read message validation.
 */
export const ResourceReadMessageSchema = z.object({
  type: z.literal('resource-read'),
  requestId: z.string(),
  uri: z.string(),
});

/**
 * Message sent from frontend to bridge with resource content.
 */
export interface ResourceResponseMessage {
  type: 'resource-response';
  requestId: string;
  content?: string;
  blob?: string; // Base64 encoded binary data
  mimeType: string;
  error?: string;
}

/**
 * Zod schema for resource response message validation.
 */
export const ResourceResponseMessageSchema = z.object({
  type: z.literal('resource-response'),
  requestId: z.string(),
  content: z.string().optional(),
  blob: z.string().optional(),
  mimeType: z.string(),
  error: z.string().optional(),
});
