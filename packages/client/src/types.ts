import type { z } from "zod";
import type {
  ContentSchema,
  ImageContentSchema,
  MCPWebClientConfigSchema,
  TextContentSchema,
} from "./schemas.ts";

export type MCPWebClientConfig = z.input<typeof MCPWebClientConfigSchema>;
export type MCPWebClientConfigOutput = z.infer<typeof MCPWebClientConfigSchema>;

export type TextContent = z.infer<typeof TextContentSchema>;
export type ImageContent = z.infer<typeof ImageContentSchema>;
export type Content = z.infer<typeof ContentSchema>;
