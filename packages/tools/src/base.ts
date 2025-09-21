
import type { z } from 'zod';
import type { ToolDefinition, ToolResult } from './types.js';

export abstract class BaseTool<TParams, TResult> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: z.core.JSONSchema.JSONSchema | undefined;
  readonly outputSchema?: z.core.JSONSchema.JSONSchema | z.ZodObject | undefined;
  abstract readonly handler: (params: TParams) => ToolResult<TResult> | Promise<ToolResult<TResult>>;

  /**
   * Returns a ToolDefinition object that can be validated with your schema
   */
  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      handler: this.handler,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema
    };
  }
}
