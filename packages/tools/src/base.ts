import type { ToolDefinition } from '@mcp-web/types';
import type { z } from 'zod';

export abstract class BaseTool<
  TInput extends z.ZodObject,
  TOutput extends z.ZodObject,
> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema?: TInput;
  abstract readonly outputSchema: TOutput;
  abstract readonly handler: (params: z.infer<TInput>) => z.infer<TOutput> | Promise<z.infer<TOutput>>;

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
