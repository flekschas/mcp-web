import { applyPartialUpdate, type DecomposedSchema, type DecompositionOptions, decomposeSchema, type SplitPlan } from '@mcp-web/decompose-zod-schema';
import { isObjectValue, isSupportedValue, isZodSchema, type MCPWeb, toToolSchema, validateInput } from '@mcp-web/web';
import { useEffect, useRef } from "react";
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
}: UseToolConfig<T>) {
  const valueRef = useRef<T>(value);
  valueRef.current = value;

  useEffect(() => {
    // Validate the value type is supported
    if (!isSupportedValue(valueSchema)) {
      throw new Error(`Unsupported value type for '${name}'. Only primitive values, arrays, and objects are supported.`);
    }

    console.log('adding react state tools', name);

    const tools: string[] = [];

    // Always add a getter tool
    const getterToolName = `get_${name}`;
    mcp.addTool({
      name: getterToolName,
      description: `Get the current value of ${name}. ${description}`,
      handler: () => valueRef.current,
      outputSchema: toToolSchema(valueSchema),
    });
    tools.push(getterToolName);

    // Add setter tools if setValue is provided
    if (setValue) {
      const isObjectSchema = isObjectValue(valueSchema);
      const isZodObjectSchema = valueSchema &&
        isZodSchema(valueSchema) &&
        valueSchema instanceof ZodObject;

      const shouldDecompose = isObjectSchema && isZodObjectSchema && valueSchemaSplit !== undefined;

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
          decomposedSchemas.forEach((decomposed) => {
            const toolName = `set_${name}_${decomposed.name}`;
            mcp.addTool({
              name: toolName,
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
                    error: error instanceof Error ? error.message : 'Unknown error'
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
          // Fall back to single setter if decomposition failed
          const setterToolName = `set_${name}`;
          mcp.addTool({
            name: setterToolName,
            description: `Set the value of ${name}. ${description}`,
            handler: (newValue: unknown) => {
              try {
                const validatedValue = validateInput(newValue, valueSchema);
                setValue(validatedValue as T);
                return { success: true };
              } catch (error) {
                return {
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown error'
                };
              }
            },
            inputSchema: toToolSchema(valueSchema),
            outputSchema: z.object({
              success: z.boolean(),
              error: z.string().optional(),
            }),
          });
          tools.push(setterToolName);
        }
      } else {
        // Add single setter tool for non-object values or when decomposition is not requested
        const setterToolName = `set_${name}`;
        mcp.addTool({
          name: setterToolName,
          description: `Set the value of ${name}. ${description}`,
          handler: (newValue: unknown) => {
            try {
              const validatedValue = validateInput(newValue, valueSchema);
              setValue(validatedValue as T);
              return { success: true };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              };
            }
          },
          inputSchema: toToolSchema(valueSchema),
          outputSchema: z.object({
            success: z.boolean(),
            error: z.string().optional(),
          }),
        });
        tools.push(setterToolName);
      }
    }

    // Return cleanup function
    return () => {
      tools.forEach((tool) => { mcp.removeTool(tool); });
    };
  }, [mcp, name, description, valueSchema, setValue, valueSchemaSplit]);
}
