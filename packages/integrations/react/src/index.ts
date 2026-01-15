import {
  applyPartialUpdate,
  type DecomposedSchema,
  type DecompositionOptions,
  decomposeSchema,
  type SplitPlan,
} from '@mcp-web/decompose-zod-schema';
import type { MCPWebConfig, ToolDefinition } from '@mcp-web/types';
import { isZodSchema, MCPWeb, validateInput } from '@mcp-web/web';
import React, { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ZodObject, z } from 'zod';

export interface UseToolConfig<T> {
  /**
   * The MCPWeb instance to register tools with.
   * Optional - if not provided, will use the instance from MCPWebProvider context.
   * If both are available, the prop takes precedence over context.
   */
  mcpWeb?: MCPWeb;
  /** The name of the tool. */
  name: string;
  /** The description of the tool. */
  description: string;
  /** The React useState value. */
  value: T;
  /** The React useState setter function. */
  setValue?: (value: T) => void;
  /** The schema for validating new values and informing tool use. Can be either a Zod or JSON Schema. */
  valueSchema: z.ZodType<T> | z.core.JSONSchema.JSONSchema;
  /** The split plan or decomposition options for the value schema (only applies to object schemas). */
  valueSchemaSplit?: SplitPlan | DecompositionOptions;
}

/**
 * Hook for registering tools for a given state value.
 *
 * @example
 * ```tsx
 * const TodoSchema = z.object({
 *   id: z.string(),
 *   title: z.string(),
 *   completed: z.boolean(),
 * });
 * type Todo = z.infer<typeof TodoSchema>;
 *
 * function Todos() {
 *   const [todos, setTodos] = useState<Todo[]>([]);
 *
 *   useTool({
 *     name: 'todos',
 *     description: 'All todos',
 *     value: todos,
 *     setValue: setTodos,
 *     valueSchema: z.array(TodoSchema),
 *   });
 *
 *   return (
 *     <div>
 *       {todos.map((todo) => (
 *         <div key={todo.id}>{todo.title}</div>
 *       ))}
 *     </div>
 *   );
 * }
 *
 * ```
 */
export function useTool<T>({
  mcpWeb: mcpWebProp,
  name,
  description,
  value,
  setValue,
  valueSchema,
  valueSchemaSplit,
}: UseToolConfig<T>): ToolDefinition[] {
  const [tools, setTools] = useState<ToolDefinition[]>([]);

  // Try to get from context if not provided as prop
  const context = useContext(MCPWebContext);

  // Prop takes precedence over context
  const mcpWeb = mcpWebProp ?? context?.mcpWeb;

  if (!mcpWeb) {
    throw new Error('useTool requires either mcpWeb prop or MCPWebProvider in component tree');
  }

  const valueRef = useRef<T>(value);
  // Updated on every render such that the getter tool always returns the latest
  // value.
  valueRef.current = value;

  useEffect(() => {
    const tools: ToolDefinition[] = [];

    // Always add a getter tool
    const getterToolDefinition = mcpWeb.addTool({
      name: `get_${name}`,
      description: `Get the current value of ${name}. ${description}`,
      handler: () => valueRef.current,
      outputSchema: valueSchema as z.ZodType<T>,
    });
    tools.push(getterToolDefinition);

    // Add setter tools if setValue is provided
    if (setValue) {
      const isZodObjectSchema = isZodSchema(valueSchema) && valueSchema instanceof ZodObject;
      const shouldDecompose = isZodObjectSchema && valueSchemaSplit !== undefined;

      if (shouldDecompose && valueSchemaSplit) {
        // Add decomposed setter tools for object values
        let decomposedSchemas: DecomposedSchema[] = [];

        try {
          // Use type assertion to avoid version conflicts between different Zod installations
          decomposedSchemas = decomposeSchema(
            valueSchema as unknown as Parameters<typeof decomposeSchema>[0],
            valueSchemaSplit
          );
        } catch (error) {
          console.warn(`Failed to decompose schema for ${name}:`, error);
        }

        if (decomposedSchemas.length > 0) {
          // Add decomposed setter tools
          for (const decomposed of decomposedSchemas) {
            const setterToolDefinition = mcpWeb.addTool({
              name: `set_${name}_${decomposed.name}`,
              description: `Set ${decomposed.name} properties of ${name}. ${description}`,
              handler: (partialValue: z.infer<typeof decomposed.schema>) => {
                try {
                  const currentValue = valueRef.current;
                  const updatedValue = applyPartialUpdate(currentValue, decomposed.targetPaths, partialValue);
                  const validatedValue = validateInput(updatedValue, valueSchema);
                  setValue(validatedValue as T);
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
            tools.push(setterToolDefinition);
          }
        } else {
          // Fall back to single setter if decomposition failed
          const inputSchema = isZodObjectSchema
            ? (valueSchema as z.ZodObject<z.ZodRawShape>)
            : z.object({ value: valueSchema as z.ZodType<T> });
          const setterToolDefinition = mcpWeb.addTool({
            name: `set_${name}`,
            description: `Set the value of ${name}. ${description}`,
            handler: (newValue: unknown) => {
              try {
                const actualValue = isZodObjectSchema ? newValue : (newValue as { value: unknown }).value;
                const validatedValue = validateInput(actualValue, valueSchema);
                setValue(validatedValue as T);
                return { success: true };
              } catch (error) {
                return {
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown error',
                };
              }
            },
            inputSchema,
            outputSchema: z.object({
              success: z.boolean(),
              error: z.string().optional(),
            }),
          });
          tools.push(setterToolDefinition);
        }
      } else {
        // Add single setter tool for non-object values or when decomposition is not requested
        const inputSchema = isZodObjectSchema
          ? (valueSchema as z.ZodObject<z.ZodRawShape>)
          : z.object({ value: valueSchema as z.ZodType<T> });
        const setterToolDefinition = mcpWeb.addTool({
          name: `set_${name}`,
          description: `Set the value of ${name}. ${description}`,
          handler: (newValue: unknown) => {
            try {
              const actualValue = isZodObjectSchema ? newValue : (newValue as { value: unknown }).value;
              const validatedValue = validateInput(actualValue, valueSchema);
              setValue(validatedValue as T);
              return { success: true };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          },
          inputSchema,
          outputSchema: z.object({
            success: z.boolean(),
            error: z.string().optional(),
          }),
        });
        tools.push(setterToolDefinition);
      }
    }

    setTools(tools);

    // Return cleanup function
    return () => {
      for (const tool of tools) {
        mcpWeb.removeTool(tool.name);
      }
    };
  }, [mcpWeb, name, description, valueSchema, setValue, valueSchemaSplit]);

  return tools;
}

/**
 * Internal hook for managing MCPWeb connection lifecycle.
 * Connects on mount and disconnects on unmount.
 * Returns reactive connection state for triggering re-renders.
 *
 * @internal
 */
function useConnectedMCPWeb(mcpInstance: MCPWeb): MCPWebContextValue {
  const [isConnected, setIsConnected] = useState(mcpInstance.connected);

  useEffect(() => {
    if (!mcpInstance.connected) {
      mcpInstance.connect().then(() => setIsConnected(true));
    } else {
      setIsConnected(true);
    }

    return () => {
      mcpInstance.disconnect();
    };
  }, [mcpInstance]);

  return { mcpWeb: mcpInstance, isConnected };
}

interface MCPWebContextValue {
  mcpWeb: MCPWeb;
  isConnected: boolean;
}

const MCPWebContext = createContext<MCPWebContextValue | null>(null);

export interface MCPWebProviderProps {
  children: ReactNode;
  config: MCPWebConfig;
}

/**
 * Provider component for sharing MCPWeb instance across component tree.
 * Handles MCPWeb instantiation and connection lifecycle automatically.
 *
 * @example
 * ```tsx
 * function Root() {
 *   return (
 *     <MCPWebProvider config={{ name: 'My App', description: 'My app description' }}>
 *       <App />
 *     </MCPWebProvider>
 *   );
 * }
 * ```
 */
export function MCPWebProvider({ children, config }: MCPWebProviderProps) {
  const mcpInstance = useMemo(() => new MCPWeb(config), [config]);
  const mcpState = useConnectedMCPWeb(mcpInstance);

  return React.createElement(
    MCPWebContext.Provider,
    { value: mcpState },
    children
  );
}

/**
 * Hook for accessing MCPWeb instance from context.
 * Must be used within MCPWebProvider.
 *
 * @returns Object containing the MCPWeb instance and connection state
 * @throws Error if used outside of MCPWebProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { mcpWeb, isConnected } = useMCPWeb();
 *   // Use mcpWeb...
 * }
 * ```
 */
export function useMCPWeb(): MCPWebContextValue {
  const context = useContext(MCPWebContext);
  if (!context) {
    throw new Error('useMCPWeb must be used within MCPWebProvider');
  }
  return context;
}
