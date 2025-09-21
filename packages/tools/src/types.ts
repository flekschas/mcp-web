import type { z } from 'zod';
import type { ToolDefinitionSchema } from './schema.js';

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

export interface ToolError {
  error: string;
}

export interface ToolSuccess<T> {
  value: T;
}

export type ToolResult<T> = ToolError | ToolSuccess<T>;
