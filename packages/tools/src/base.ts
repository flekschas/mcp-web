import type { ToolDefinition } from '@mcp-web/types';
import type { z } from 'zod';

export abstract class BaseTool<
  TInput extends z.ZodObject,
  TOutput extends z.ZodObject,
> {
  abstract get name(): string;
  abstract get description(): string;
  abstract get inputSchema(): TInput | undefined;
  abstract get outputSchema(): TOutput;
  abstract get handler(): (params: z.infer<TInput>) => z.infer<TOutput> | Promise<z.infer<TOutput>>;

  get definition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      handler: this.handler,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema
    };
  }
}
