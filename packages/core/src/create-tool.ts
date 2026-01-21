import type { ToolDefinitionZod } from '@mcp-web/types';
import { ToolDefinitionSchema } from '@mcp-web/types';
import type { z } from 'zod';

/**
 * Configuration for creating a tool with Zod schemas.
 */
export interface CreateToolConfig<
  TInput extends z.ZodObject | undefined = undefined,
  TOutput extends z.ZodType | undefined = undefined
> {
  /** The name of the tool (must be unique). */
  name: string;
  /** Description of what the tool does. */
  description: string;
  /** The function that handles the tool execution. */
  handler: TInput extends z.ZodObject
    ? (input: z.infer<TInput>) => TOutput extends z.ZodType
      ? z.infer<TOutput> | Promise<z.infer<TOutput>>
      : void | Promise<void>
    : TOutput extends z.ZodType
      ? () => z.infer<TOutput> | Promise<z.infer<TOutput>>
      : () => void | Promise<void>;
  /** Optional Zod schema for validating input. */
  inputSchema?: TInput;
  /** Optional Zod schema for validating output. */
  outputSchema?: TOutput;
}

/**
 * A created tool that can be registered with MCPWeb.
 * 
 * Created tools are validated at creation time but not yet registered.
 * Use `mcpWeb.addTool(createdTool)` or `useTools(createdTool)` to register.
 */
export interface CreatedTool<
  TInput extends z.ZodObject | undefined = undefined,
  TOutput extends z.ZodType | undefined = undefined
> {
  /** Marker to identify this as a created tool. */
  readonly __brand: 'CreatedTool';
  /** The tool definition. */
  readonly definition: ToolDefinitionZod;
  /** The original config for type inference. */
  readonly config: CreateToolConfig<TInput, TOutput>;
}

/**
 * Creates a tool definition without registering it.
 * 
 * This follows the Jotai pattern of creating atoms outside React components.
 * Tools can be defined at module scope and registered when needed.
 * 
 * @example Module-level tool definition
 * ```typescript
 * // tools.ts
 * import { createTool } from '@mcp-web/core';
 * import { z } from 'zod';
 * 
 * export const getCurrentTimeTool = createTool({
 *   name: 'get_current_time',
 *   description: 'Get the current time in ISO format',
 *   handler: () => ({ time: new Date().toISOString() }),
 *   outputSchema: z.object({ time: z.string() }),
 * });
 * ```
 * 
 * @example Registration options
 * ```typescript
 * // Option 1: Direct registration
 * mcpWeb.addTool(getCurrentTimeTool);
 * 
 * // Option 2: React hook (auto cleanup on unmount)
 * function App() {
 *   useTools(getCurrentTimeTool);
 *   return <div>...</div>;
 * }
 * ```
 */
export function createTool<
  TInput extends z.ZodObject | undefined = undefined,
  TOutput extends z.ZodType | undefined = undefined
>(config: CreateToolConfig<TInput, TOutput>): CreatedTool<TInput, TOutput> {
  // Validate at creation time
  const validationResult = ToolDefinitionSchema.safeParse(config);
  if (!validationResult.success) {
    throw new Error(`Invalid tool definition: ${validationResult.error.message}`);
  }

  const definition: ToolDefinitionZod = {
    name: config.name,
    description: config.description,
    handler: config.handler as ToolDefinitionZod['handler'],
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
  };

  return {
    __brand: 'CreatedTool' as const,
    definition,
    config,
  };
}

/**
 * Type guard to check if a value is a CreatedTool.
 */
export function isCreatedTool(value: unknown): value is CreatedTool {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__brand' in value &&
    (value as CreatedTool).__brand === 'CreatedTool'
  );
}
