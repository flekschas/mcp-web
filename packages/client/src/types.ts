import type { z } from "zod";
import type { ContentSchema, ImageContentSchema, MCPWebBridgeResponseSchema, MCPWebClientConfigSchema, TextContentSchema } from "./schemas.js";

export type MCPWebClientConfig = z.infer<typeof MCPWebClientConfigSchema>;
export type MCPWebClientConfigInput = z.input<typeof MCPWebClientConfigSchema>;

export type MCPWebBridgeResponse = z.infer<typeof MCPWebBridgeResponseSchema>;

export type TextContent = z.infer<typeof TextContentSchema>;
export type ImageContent = z.infer<typeof ImageContentSchema>;
export type Content = z.infer<typeof ContentSchema>;
