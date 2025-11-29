import {
  applyPartialUpdate,
  type DecomposedSchema,
  type DecompositionOptions,
  decomposeSchema,
  type SplitPlan,
} from '@mcp-web/decompose-zod-schema';
import { type ToolDefinition } from '@mcp-web/types';
import { isZodSchema, type MCPWeb, validateInput } from '@mcp-web/web';
import { useEffect, useRef, useState } from 'react';
import { ZodObject, z } from 'zod';

export interface UseToolConfig<T> {
  /** The MCPWeb instance to register tools with. */
  mcp: MCPWeb;
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

export function useTool<T>({
  mcp,
  name,
  description,
  value,
  setValue,
  valueSchema,
  valueSchemaSplit,
}: UseToolConfig<T>): ToolDefinition[] {
  const [tools, setTools] = useState<ToolDefinition[]>([]);

  const valueRef = useRef<T>(value);
  valueRef.current = value;

  useEffect(() => {
    console.log('adding react state tools', name);

    const tools: ToolDefinition[] = [];

    // Always add a getter tool
    const getterToolDefinition = mcp.addTool({
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
            const setterToolDefinition = mcp.addTool({
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
          const setterToolDefinition = mcp.addTool({
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
        const setterToolDefinition = mcp.addTool({
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
        mcp.removeTool(tool.name);
      }
    };
  }, [mcp, name, description, valueSchema, setValue, valueSchemaSplit]);

  return tools;
}
