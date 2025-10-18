import {
  applyPartialUpdate,
  type DecomposedSchema,
  type DecompositionOptions,
  decomposeSchema,
  type SplitPlan,
} from '@mcp-web/decompose-zod-schema';
import {
  isObjectValue,
  isSupportedValue,
  isZodSchema,
  MCPWeb,
  toToolSchema,
  validateInput,
} from '@mcp-web/web';
import { ZodObject, z } from 'zod';

export const StateToolConfigSchema = z.object({
  /** The MCPWeb instance to register tools with. */
  mcp: z.custom<MCPWeb>((val) => val instanceof MCPWeb, {
    message: 'Must be an MCPWeb instance',
  }),
  /** The name of the tool. */
  name: z.string().describe('The name of the tool.'),
  /** The description of the tool. */
  description: z.string().describe('The description of the tool.'),
  /** The Svelte $state or $derived value (must be an object or array). */
  state: z.unknown().describe('The Svelte $state or $derived value (must be an object or array).'),
  /** The schema for validating state values and informing tool use. Can be either a Zod or JSON Schema. */
  stateSchema: z.union([
    z.custom<z.ZodType>(),
    z.custom<z.core.JSONSchema.JSONSchema>(),
  ]).describe('The schema for validating state values and informing tool use. Can be either a Zod or JSON Schema.'),
  /** The split plan or decomposition options for the state schema. */
  stateSchemaSplit: z.union([
    z.custom<SplitPlan>(),
    z.custom<DecompositionOptions>(),
  ]).optional().describe('The split plan or decomposition options for the state schema.'),
  /** Whether the state is read-only. Defaults to false (writable). */
  readOnly: z.boolean().optional().describe('Whether the state is read-only. Defaults to false (writable).'),
});

export type StateToolConfig<T extends object> = Omit<
  z.infer<typeof StateToolConfigSchema>,
  'state'
> & {
  state: T;
  stateSchema: z.ZodType<T> | z.core.JSONSchema.JSONSchema;
};

/**
 * Updates an object or array in place by replacing all its contents.
 * This works with Svelte's reactive proxies.
 */
function replaceInPlace<T>(target: T, newValue: T): void {
  if (Array.isArray(target)) {
    // Clear array and push new items
    target.length = 0;
    if (Array.isArray(newValue)) {
      target.push(...newValue);
    }
  } else if (typeof target === 'object' && target !== null) {
    // Clear object properties and assign new ones
    for (const key in target) {
      if (Object.hasOwn(target, key)) {
        delete target[key];
      }
    }
    Object.assign(target, newValue);
  }
}

/**
 * Adds MCP tools for getting and setting a Svelte $state or $derived value.
 *
 * This function creates MCP tools that allow Claude to read and optionally modify
 * Svelte reactive state. It works with both $state and $derived runes.
 *
 * For writable state (readOnly: false), it creates:
 * - A getter tool: `get_${name}`
 * - Setter tool(s): Either a single `set_${name}` or decomposed setters if stateSchemaSplit is provided
 *
 * For read-only state (readOnly: true), it only creates:
 * - A getter tool: `get_${name}`
 *
 * @example
 * ```typescript
 * // In your .svelte.ts file:
 * import { addStateTool } from '@mcp-web/svelte';
 *
 * let user = $state({ name: 'Alice', age: 30 });
 *
 * addStateTool({
 *   mcp,
 *   name: 'user',
 *   description: 'Current user data',
 *   state: user,
 *   stateSchema: z.object({
 *     name: z.string(),
 *     age: z.number(),
 *   }),
 *   stateSchemaSplit: {
 *     profile: ['name'],
 *     demographics: ['age']
 *   }
 * });
 * // Creates: get_user, set_user_profile, set_user_demographics
 * ```
 *
 * @example
 * ```typescript
 * // Read-only derived state:
 * let fullName = $derived(`${user.name} (${user.age})`);
 *
 * addStateTool({
 *   mcp,
 *   name: 'fullName',
 *   description: 'User full name with age',
 *   state: fullName,
 *   readOnly: true,
 *   stateSchema: z.string()
 * });
 * // Creates: get_fullName (read-only)
 * ```
 */
export function addStateTool<T extends object>(config: StateToolConfig<T>): () => void {
  const validConfig = StateToolConfigSchema.parse(config);

  const { mcp, state, name, description, stateSchema, stateSchemaSplit, readOnly } = validConfig;

  // Validate the value type is supported
  if (!isSupportedValue(stateSchema)) {
    throw new Error(
      `Unsupported value type for state '${name}'. Only arrays and objects are supported.`
    );
  }

  // Validate that state is an object or array
  if (!isObjectValue(stateSchema)) {
    throw new Error(
      `State '${name}' must be an object or array. Primitive values are not supported. Use objects to structure your state.`
    );
  }

  console.log('adding svelte state tools', name, readOnly ? '(read-only)' : '(writable)');

  const tools: string[] = [];

  // Always add a getter tool
  const getterToolName = `get_${name}`;
  mcp.addTool({
    name: getterToolName,
    description: `Get the current value of ${name}. ${description}`,
    handler: () => state,
    outputSchema: toToolSchema(stateSchema),
  });
  tools.push(getterToolName);

  // Add setter tools if not read-only
  if (!readOnly) {
    const isZodObjectSchema =
      stateSchema && isZodSchema(stateSchema) && stateSchema instanceof ZodObject;

    const shouldDecompose = isZodObjectSchema && stateSchemaSplit !== undefined;

    let decomposedSchemas: DecomposedSchema[] = [];

    if (shouldDecompose && stateSchemaSplit) {
      try {
        // Use type assertion to avoid version conflicts between different Zod installations
        decomposedSchemas = decomposeSchema(
          stateSchema as unknown as Parameters<typeof decomposeSchema>[0],
          stateSchemaSplit
        );
      } catch (error) {
        console.warn(`Failed to decompose schema for ${name}:`, error);
      }
    }

    if (decomposedSchemas.length > 0) {
      // Add decomposed setter tools
      decomposedSchemas.forEach((decomposed) => {
        const toolName = `set_${name}_${decomposed.name}`;
        mcp.addTool({
          name: toolName,
          description: `Set ${decomposed.name} properties of ${name}. ${description}`,
          handler: (partialValue: z.infer<typeof decomposed.schema>) => {
            try {
              const currentValue = state;
              const updatedValue = applyPartialUpdate(
                currentValue,
                decomposed.targetPaths,
                partialValue
              );
              const validatedValue = validateInput(updatedValue, stateSchema);
              replaceInPlace(state, validatedValue);
              return { success: true };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          },
          inputSchema: decomposed.schema,
          outputSchema: z.object({
            success: z.boolean(),
            error: z.string().optional(),
          }),
        });
        tools.push(toolName);
      });
    } else {
      // Add single setter tool
      const toolName = `set_${name}`;
      mcp.addTool({
        name: toolName,
        description: `Set the value of ${name}. ${description}`,
        handler: (newValue: unknown) => {
          try {
            const validatedValue = validateInput(newValue, stateSchema);
            replaceInPlace(state, validatedValue);
            return { success: true };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        },
        inputSchema: toToolSchema(stateSchema),
        outputSchema: z.object({
          success: z.boolean(),
          error: z.string().optional(),
        }),
      });
      tools.push(toolName);
    }
  }

  // Return cleanup function
  return () => {
    tools.forEach((tool) => {
      mcp.removeTool(tool);
    });
  };
}
