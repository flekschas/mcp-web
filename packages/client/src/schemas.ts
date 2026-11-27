import { z } from 'zod';

export const JsonRpcResponseSchema = z.object({
  jsonrpc: z.literal('2.0').default('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional()
  }).optional()
});

export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0').default('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional()
});

export const MCPWebClientConfigSchema = z.object({
  serverUrl: z.url(),
  authToken: z.string().min(1).optional(),
  /**
   * How long to wait for the bridge, in milliseconds. Defaults to 30 seconds,
   * and to 6 minutes for tool calls, since the user may answer a question.
   */
  timeout: z.number().optional()
});

export const TextContentSchema = z.object({
  type: z.literal('text').default('text'),
  text: z.string(),
});

export const ImageContentSchema = z.object({
  type: z.literal('image').default('image'),
  data: z.string(),
  mimeType: z.string(),
});

export const ContentSchema = z.union([TextContentSchema, ImageContentSchema]);
