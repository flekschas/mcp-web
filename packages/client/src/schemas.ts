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
  serverUrl: z.string().url(),
  authToken: z.string().min(1).optional(),
  timeout: z.number().optional().default(30000)
});

export const MCPWebBridgeResponseSchema = z.object({
  error: z.string().optional(),
  data: z.unknown().optional(),
  success: z.boolean().optional(),
  available_sessions: z.array(z.unknown()).optional(),
  available_tools: z.array(z.string()).optional(),
  tools: z.array(z.unknown()).optional(),
  resources: z.array(z.unknown()).optional(),
  prompts: z.array(z.unknown()).optional()
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
