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
 * Useful for:
 * - Read-only tools (derived state, computed values)
 * - Custom action tools that don't map directly to state
 * - Tools that need to be conditionally registered
 *
 * This follows the Jotai pattern of creating atoms outside React components.
 * Tools can be defined at module scope and registered when needed.
 *
 * @example Read-only derived state
 * ```typescript
 * // tools.ts
 * import { createTool } from '@mcp-web/core';
 * import { z } from 'zod';
 * import { activeTodosAtom } from './atoms';
 *
 * export const activeTodosTool = createTool({
 *   name: 'get_active_todos',
 *   description: 'Get all incomplete todos',
 *   handler: () => store.get(activeTodosAtom),
 *   outputSchema: z.array(TodoSchema),
 * });
 * ```
 *
 * @example Custom action
 * ```typescript
 * export const createTodoTool = createTool({
 *   name: 'create_todo',
 *   description: 'Create a new todo',
 *   handler: ({ title }) => {
 *     const todo = { id: crypto.randomUUID(), title, completed: false };
 *     todos.push(todo);
 *     return todo;
 *   },
 *   inputSchema: z.object({ title: z.string() }),
 *   outputSchema: TodoSchema,
 * });
 * ```
 *
 * @example Registration options
 * ```typescript
 * // Option 1: Direct registration
 * mcpWeb.addTool(activeTodosTool);
 *
 * // Option 2: React hook (auto cleanup on unmount)
 * function App() {
 *   useTools(activeTodosTool);
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
