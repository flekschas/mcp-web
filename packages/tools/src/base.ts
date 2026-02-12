import type { ToolDefinition } from '@mcp-web/types';
import type { z } from 'zod';

/**
 * Abstract base class for creating reusable MCP tools.
 *
 * Extend this class to create tools that can be shared across projects.
 * Subclasses must implement all abstract properties: name, description,
 * inputSchema, outputSchema, and handler.
 *
 * @typeParam TInput - Zod schema type for tool input validation
 * @typeParam TOutput - Zod schema type for tool output validation
 *
 * @example Creating a custom tool
 * ```typescript
 * import { BaseTool } from '@mcp-web/tools';
 * import { z } from 'zod';
 *
 * const InputSchema = z.object({
 *   query: z.string().describe('Search query'),
 * });
 *
 * const OutputSchema = z.object({
 *   results: z.array(z.string()),
 * });
 *
 * class SearchTool extends BaseTool<typeof InputSchema, typeof OutputSchema> {
 *   get name() { return 'search'; }
 *   get description() { return 'Search for items'; }
 *   get inputSchema() { return InputSchema; }
 *   get outputSchema() { return OutputSchema; }
 *   get handler() {
 *     return ({ query }) => ({ results: ['item1', 'item2'] });
 *   }
 * }
 *
 * // Use the tool
 * const searchTool = new SearchTool();
 * mcp.addTool(searchTool.definition);
 * ```
 */
export abstract class BaseTool<
  TInput extends z.ZodObject,
  TOutput extends z.ZodType,
> {
  /** Unique name for the tool. */
  abstract get name(): string;
  /** Description of what the tool does (shown to AI). */
  abstract get description(): string;
  /** Zod schema for validating input parameters. */
  abstract get inputSchema(): TInput | undefined;
  /** Zod schema for validating output values. */
  abstract get outputSchema(): TOutput;
  /** Function that executes the tool logic. */
  abstract get handler(): (params: z.infer<TInput>) => z.infer<TOutput> | Promise<z.infer<TOutput>>;

  /**
   * Returns the tool definition for registration with MCPWeb.
   * @returns Tool definition object compatible with MCPWeb.addTool()
   */
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
