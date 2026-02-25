import type { ToolDefinitionZod } from '@mcp-web/types';
import { z } from 'zod';
import { deriveSetInputSchema, unwrapSchema } from './schema-helpers.js';
import type { SchemaShape, ToolGenerationOptions } from './types.js';
import { deepMerge } from './utils.js';

/**
 * Generates getter and setter tools for fixed-shape schemas.
 * Fixed-shape includes: primitives, tuples, and objects with only fixed props.
 */
export function generateFixedShapeTools(
  options: ToolGenerationOptions,
  shape: SchemaShape
): ToolDefinitionZod[] {
  const { name, description, get, set, schema } = options;
  const tools: ToolDefinitionZod[] = [];
  const unwrapped = unwrapSchema(schema);

  // Getter tool
  tools.push({
    name: `get_${name}`,
    description: `Get the current ${description}`,
    inputSchema: z.object({}),
    handler: async () => {
      return get();
    },
  });

  // Setter tool - behavior depends on subtype
  if (shape.subtype === 'primitive' || shape.subtype === 'tuple') {
    // Full replacement for primitives and tuples
    tools.push({
      name: `set_${name}`,
      description: `Set the ${description}`,
      inputSchema: z.object({ value: schema }),
      handler: async (input: { value: unknown }) => {
        const validated = schema.parse(input.value);
        set(validated);
        return { success: true, value: validated };
      },
    });
  } else if (shape.subtype === 'object') {
    // Partial update with deep merge for objects
    const objectSchema = unwrapped as z.ZodObject<z.ZodRawShape>;
    const setInputSchema = deriveSetInputSchema(objectSchema);

    tools.push({
      name: `set_${name}`,
      description: `Update the ${description} (partial update with deep merge)`,
      inputSchema: setInputSchema,
      handler: async (input: Record<string, unknown>) => {
        const current = get();
        const merged = deepMerge(current, input);
        const validated = schema.parse(merged);
        set(validated);
        return { success: true, value: validated };
      },
    });
  }

  return tools;
}
