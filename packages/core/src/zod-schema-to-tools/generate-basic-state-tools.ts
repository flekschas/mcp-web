import type { ToolDefinitionZod } from '@mcp-web/types';
import type { DecomposedSchema, SplitPlan, DecompositionOptions } from '@mcp-web/decompose-zod-schema';
import { applyPartialUpdate, decomposeSchema } from '@mcp-web/decompose-zod-schema';
import { ZodObject, z } from 'zod';
import { isZodSchema, validateInput } from '../utils.js';

export interface BasicStateToolOptions<T> {
  name: string;
  description: string;
  get: () => T;
  set: (value: T) => void;
  schema: z.ZodType<T> | z.core.JSONSchema.JSONSchema;
  schemaSplit?: SplitPlan | DecompositionOptions;
}

export interface BasicStateToolsResult {
  getter: ToolDefinitionZod;
  setters: ToolDefinitionZod[];
}

/**
 * Generates basic getter and setter tools for state management.
 * Returns tool definitions without registering them - the caller is responsible for registration.
 * 
 * @returns Object containing getter tool and array of setter tools (1 for simple, N for decomposed)
 */
export function generateBasicStateTools<T>(
  options: BasicStateToolOptions<T>
): BasicStateToolsResult {
  const { name, description, get, set, schema, schemaSplit } = options;

  // Always create a getter tool
  const getter: ToolDefinitionZod = {
    name: `get_${name}`,
    description: `Get the current value of ${name}. ${description}`,
    handler: get,
    outputSchema: schema as z.ZodType<T>,
  };

  const setters: ToolDefinitionZod[] = [];

  // Determine if we should decompose the schema
  const isZodObjectSchema = isZodSchema(schema) && schema instanceof ZodObject;
  const shouldDecompose = isZodObjectSchema && schemaSplit !== undefined;

  let decomposedSchemas: DecomposedSchema[] = [];

  if (shouldDecompose && schemaSplit) {
    try {
      decomposedSchemas = decomposeSchema(
        schema as unknown as Parameters<typeof decomposeSchema>[0],
        schemaSplit
      );
    } catch (error) {
      console.warn(`Failed to decompose schema for ${name}:`, error);
    }
  }

  if (decomposedSchemas.length > 0) {
    // Add decomposed setter tools
    for (const decomposed of decomposedSchemas) {
      const setterTool: ToolDefinitionZod = {
        name: `set_${name}_${decomposed.name}`,
        description: `Set ${decomposed.name} properties of ${name}. ${description}`,
        handler: (partialValue: z.infer<typeof decomposed.schema>) => {
          try {
            const currentValue = get();
            const updatedValue = applyPartialUpdate(
              currentValue,
              decomposed.targetPaths,
              partialValue
            );
            const validatedValue = validateInput(updatedValue, schema);
            set(validatedValue);
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
      };
      setters.push(setterTool);
    }
  } else {
    // Add single setter tool
    // Wrap non-object schemas in a value property (MCP requires object inputs)
    const inputSchema = isZodObjectSchema
      ? (schema as z.ZodObject<z.ZodRawShape>)
      : z.object({ value: schema as z.ZodType<T> });
    
    const setterTool: ToolDefinitionZod = {
      name: `set_${name}`,
      description: `Set the value of ${name}. ${description}`,
      handler: (newValue: unknown) => {
        try {
          // Unwrap if we wrapped in value property
          const actualValue = isZodObjectSchema ? newValue : (newValue as { value: unknown }).value;
          const validatedValue = validateInput(actualValue, schema);
          set(validatedValue);
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
    };
    setters.push(setterTool);
  }

  return { getter, setters };
}

