import type { ToolDefinitionZod } from '@mcp-web/types';
import { z } from 'zod';
import { generateFixedShapeTools } from './generate-fixed-shape-tools.js';
import { analyzeSchemaShape, findIdField } from './schema-analysis.js';
import {
  deriveAddInputSchema,
  deriveSetInputSchema,
  unwrapSchema,
  validateSystemFields,
} from './schema-helpers.js';
import type { GeneratedTools, KeyFieldResult, SchemaShape, ToolGenerationOptions } from './types.js';
import { deepMerge } from './utils.js';

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Generates MCP tools for a schema based on its shape.
 * - Fixed-shape schemas → get + set with deep merge
 * - Dynamic-shape schemas → get + add + set + delete (arrays) or get + set + delete (records)
 * - Mixed schemas → asymmetric get/set + collection tools
 *
 * Returns tool definitions without registering them - the caller is responsible for registration.
 */
export function generateToolsForSchema(
  options: ToolGenerationOptions
): GeneratedTools {
  const { name, schema } = options;
  const tools: ToolDefinitionZod[] = [];
  const warnings: string[] = [];

  // Validate schema
  const unwrapped = unwrapSchema(schema);

  // Validate system fields if it's an object
  if (unwrapped instanceof z.ZodObject) {
    validateSystemFields(unwrapped);
  }

  // Analyze schema shape
  const shape = analyzeSchemaShape(schema);

  // Warn about optional fields (once)
  if (shape.hasOptionalFields) {
    warnings.push(
      `⚠️ Warning: Schema for '${name}' uses optional() on field(s): ${shape.optionalPaths.join(', ')}.\n\n` +
      `Problem: optional() creates ambiguity in partial updates:\n` +
      `- Is the field missing because AI didn't provide it? (keep current)\n` +
      `- Or because AI wants to clear it? (set to undefined)\n\n` +
      `Solution: Use nullable() instead:\n` +
      `- fieldName: z.string().nullable()\n\n` +
      `This makes intent explicit:\n` +
      `- Omit field → keep current value\n` +
      `- Pass null → clear the value`
    );
  }

  // Generate tools based on schema type
  if (shape.type === 'fixed') {
    // Fixed-shape: primitives, tuples, or objects with only fixed props
    tools.push(...generateFixedShapeTools(options, shape));
  } else if (shape.type === 'dynamic') {
    // Dynamic-shape: arrays or records at root, or objects with only dynamic props
    if (shape.subtype === 'array') {
      tools.push(...generateArrayTools(options));
    } else if (shape.subtype === 'record') {
      tools.push(...generateRecordTools(options));
    }
  } else if (shape.type === 'mixed') {
    // Mixed: objects with both fixed and dynamic props
    tools.push(...generateMixedObjectTools(options, shape));
  } else {
    // Unsupported type
    warnings.push(
      `⚠️ Warning: Schema for '${name}' contains unsupported types.\n` +
      `Only JSON-compatible types are supported (objects, arrays, records, primitives).`
    );
  }

  return { tools, warnings };
}

// ============================================================================
// Array Tools Generator
// ============================================================================

/**
 * Generates tools for array schemas.
 * Creates 4 tools: get, add, set, delete
 * Uses index-based addressing by default, ID-based when id() marker present.
 */
function generateArrayTools(
  options: ToolGenerationOptions
): ToolDefinitionZod[] {
  const { name, description, get, set, schema } = options;
  const tools: ToolDefinitionZod[] = [];
  const unwrapped = unwrapSchema(schema) as z.ZodArray<z.ZodTypeAny>;
  const elementSchema = unwrapped.element as z.ZodTypeAny;

  // Check if element is an object with id() marker
  const elementUnwrapped = unwrapSchema(elementSchema);
  let idField: KeyFieldResult = { type: 'none' };

  if (elementUnwrapped instanceof z.ZodObject) {
    idField = findIdField(elementUnwrapped);
  }

  const useIdBased = idField.type === 'explicit';

  // Derive input schemas (exclude system fields)
  let addInputSchema = elementSchema;
  let setInputSchema = elementSchema;

  if (elementUnwrapped instanceof z.ZodObject) {
    addInputSchema = deriveAddInputSchema(elementUnwrapped);
    setInputSchema = deriveSetInputSchema(elementUnwrapped);
  }

  // GET tool
  if (useIdBased) {
    const keyField = idField.field as string;
    tools.push({
      name: `get_${name}`,
      description: `Get ${description} by ID, or get all if no ID provided`,
      inputSchema: z.object({
        id: z.string().optional().describe('The ID of the item to retrieve. If omitted, returns all items.'),
      }),
      handler: async (input: { id?: string }) => {
        const array = get() as unknown[];
        if (input.id !== undefined) {
          return array.find((item: unknown) => (item as Record<string, unknown>)[keyField] === input.id);
        }
        return array;
      },
    });
  } else {
    tools.push({
      name: `get_${name}`,
      description: `Get ${description} by index, or get all if no index provided`,
      inputSchema: z.object({
        index: z.number().int().min(0).optional().describe('The zero-based index of the item to retrieve. If omitted, returns all items.'),
      }),
      handler: async (input: { index?: number }) => {
        const array = get() as unknown[];
        if (input.index !== undefined) {
          return array[input.index];
        }
        return array;
      },
    });
  }

  // ADD tool
  if (useIdBased) {
    tools.push({
      name: `add_${name}`,
      description: `Add a new item to ${description}`,
      inputSchema: z.object({
        value: addInputSchema.describe('The item to add.'),
      }),
      handler: async (input: { value: unknown }) => {
        const array = get() as unknown[];
        const parsed = elementSchema.parse(input.value);
        array.push(parsed);
        set(array);
        return { success: true, value: parsed };
      },
    });
  } else {
    tools.push({
      name: `add_${name}`,
      description: `Add a new item to ${description} at the specified index (default: end)`,
      inputSchema: z.object({
        value: addInputSchema.describe('The item to add.'),
        index: z.number().int().min(0).optional().describe('The zero-based index at which to insert the item. If omitted, the item is added at the end.'),
      }),
      handler: async (input: { value: unknown; index?: number }) => {
        const array = get() as unknown[];
        const parsed = elementSchema.parse(input.value);
        if (input.index !== undefined) {
          array.splice(input.index, 0, parsed);
        } else {
          array.push(parsed);
        }
        set(array);
        return { success: true, value: parsed };
      },
    });
  }

  // SET tool (partial update with deep merge)
  if (useIdBased) {
    const keyField = idField.field as string;
    tools.push({
      name: `set_${name}`,
      description: `Update an item in ${description} by ID (partial update with deep merge)`,
      inputSchema: z.object({
        id: z.string().describe('The ID of the item to update.'),
        value: setInputSchema.describe('The fields to update. Only provided fields will be changed; omitted fields retain their current values.'),
      }),
      handler: async (input: { id: string; value: Record<string, unknown> }) => {
        const array = get() as unknown[];
        const index = array.findIndex((item: unknown) =>
          (item as Record<string, unknown>)[keyField] === input.id
        );
        if (index === -1) {
          throw new Error(`Item with id '${input.id}' not found in ${name}`);
        }
        const merged = deepMerge(array[index], input.value);
        const validated = elementSchema.parse(merged);
        array[index] = validated;
        set(array);
        return { success: true, value: validated };
      },
    });
  } else {
    tools.push({
      name: `set_${name}`,
      description: `Update an item in ${description} by index (partial update with deep merge)`,
      inputSchema: z.object({
        index: z.number().int().min(0).describe('The zero-based index of the item to update.'),
        value: setInputSchema.describe('The fields to update. Only provided fields will be changed; omitted fields retain their current values.'),
      }),
      handler: async (input: { index: number; value: Record<string, unknown> }) => {
        const array = get() as unknown[];
        if (input.index >= array.length) {
          throw new Error(`Index ${input.index} out of bounds for ${name} (length: ${array.length})`);
        }
        const merged = deepMerge(array[input.index], input.value);
        const validated = elementSchema.parse(merged);
        array[input.index] = validated;
        set(array);
        return { success: true, value: validated };
      },
    });
  }

  // DELETE tool
  if (useIdBased) {
    const keyField = idField.field as string;
    tools.push({
      name: `delete_${name}`,
      description: `Delete an item from ${description} by ID, or delete all items`,
      inputSchema: z.object({
        id: z.string().optional().describe('The ID of the item to delete. Ignored if `all` is true.'),
        all: z.literal(true).optional().describe(`Delete all items in ${description}. This takes precedence over \`id\`.`),
      }),
      handler: async (input: { id?: string; all?: boolean }) => {
        const array = get() as unknown[];
        if (input.all) {
          set([]);
        } else if (input.id) {
          const index = array.findIndex((item: unknown) =>
            (item as Record<string, unknown>)[keyField] === input.id
          );
          if (index !== -1) {
            array.splice(index, 1);
            set(array);
          }
        }
        return { success: true };
      },
    });
  } else {
    tools.push({
      name: `delete_${name}`,
      description: `Delete an item from ${description} by index, or delete all items`,
      inputSchema: z.object({
        index: z.number().int().min(0).optional().describe('The zero-based index of the item to delete. Ignored if `all` is true.'),
        all: z.literal(true).optional().describe(`Delete all items in ${description}. This takes precedence over \`index\`.`),
      }),
      handler: async (input: { index?: number; all?: boolean }) => {
        const array = get() as unknown[];
        if (input.all) {
          set([]);
        } else if (input.index !== undefined) {
          if (input.index < array.length) {
            array.splice(input.index, 1);
            set(array);
          }
        }
        return { success: true };
      },
    });
  }

  return tools;
}

// ============================================================================
// Record Tools Generator
// ============================================================================

/**
 * Generates tools for record schemas.
 * Creates 3 tools: get, set (upsert), delete
 * Records use string keys naturally, no ID marker needed.
 */
function generateRecordTools(
  options: ToolGenerationOptions
): ToolDefinitionZod[] {
  const { name, description, get, set, schema } = options;
  const tools: ToolDefinitionZod[] = [];
  const unwrapped = unwrapSchema(schema) as z.ZodRecord;
  const def = unwrapped._def as unknown as { valueType?: z.ZodTypeAny };
  const valueSchema = def.valueType || z.unknown();

  // Derive input schemas (exclude system fields if value is object)
  const valueUnwrapped = unwrapSchema(valueSchema);
  let setInputSchema = valueSchema;

  if (valueUnwrapped instanceof z.ZodObject) {
    setInputSchema = deriveSetInputSchema(valueUnwrapped);
  }

  // GET tool
  tools.push({
    name: `get_${name}`,
    description: `Get ${description} by key, or get all if no key provided`,
    inputSchema: z.object({
      key: z.string().optional().describe('The key of the entry to retrieve. If omitted, returns all entries.'),
    }),
    handler: async (input: { key?: string }) => {
      const record = get() as Record<string, unknown>;
      if (input.key !== undefined) {
        return record[input.key];
      }
      return record;
    },
  });

  // SET tool (upsert: add or update)
  tools.push({
    name: `set_${name}`,
    description: `Set (add or update) an entry in ${description} (partial update with deep merge for objects)`,
    inputSchema: z.object({
      key: z.string().describe('The key for the entry to set.'),
      value: setInputSchema.describe('The value to set. For existing object entries, only provided fields will be changed.'),
    }),
    handler: async (input: { key: string; value: unknown }) => {
      const record = get() as Record<string, unknown>;

      // If value schema is object and entry exists, deep merge
      if (valueUnwrapped instanceof z.ZodObject && record[input.key] !== undefined) {
        const merged = deepMerge(record[input.key], input.value);
        const validated = valueSchema.parse(merged);
        record[input.key] = validated;
        set(record);
        return { success: true, value: validated };
      }

      // Otherwise, full replacement (upsert)
      const validated = valueSchema.parse(input.value);
      record[input.key] = validated;
      set(record);
      return { success: true, value: validated };
    },
  });

  // DELETE tool
  tools.push({
    name: `delete_${name}`,
    description: `Delete an entry from ${description} by key, or delete all entries`,
    inputSchema: z.object({
      key: z.string().optional().describe('The key of the entry to delete. Ignored if `all` is true.'),
      all: z.literal(true).optional().describe(`Delete all entries in ${description}. This takes precedence over \`key\`.`),
    }),
    handler: async (input: { key?: string; all?: boolean }) => {
      const record = get() as Record<string, unknown>;
      if (input.all) {
        set({});
      } else if (input.key) {
        delete record[input.key];
        set(record);
      }
      return { success: true };
    },
  });

  return tools;
}

// ============================================================================
// Mixed Object Tools Generator
// ============================================================================

/**
 * Generates tools for mixed objects (both fixed and dynamic props).
 * Creates asymmetric get/set:
 * - get() returns full state (including collections)
 * - set() only updates fixed-shape props
 * - Separate tools for each collection
 */
function generateMixedObjectTools(
  options: ToolGenerationOptions,
  _shape: SchemaShape
): ToolDefinitionZod[] {
  const { name, description, get, set, schema } = options;
  const tools: ToolDefinitionZod[] = [];
  const unwrapped = unwrapSchema(schema) as z.ZodObject<z.ZodRawShape>;

  // Split into fixed and dynamic parts
  const fixedShape: Record<string, z.ZodTypeAny> = {};
  const dynamicFields: Array<{ key: string; field: z.ZodTypeAny }> = [];

  for (const [key, field] of Object.entries(unwrapped.shape)) {
    const zodField = field as z.ZodTypeAny;
    const unwrappedField = unwrapSchema(zodField);

    if (unwrappedField instanceof z.ZodArray || unwrappedField instanceof z.ZodRecord) {
      dynamicFields.push({ key, field: zodField });
    } else {
      fixedShape[key] = zodField;
    }
  }

  const hasFixedProps = Object.keys(fixedShape).length > 0;

  // ROOT GETTER - always returns full state
  tools.push({
    name: `get_${name}`,
    description: `Get the current ${description} (full state including collections)`,
    inputSchema: z.object({
      excludeCollections: z.boolean().optional().describe('If true, excludes array and record collections from the response, returning only fixed-shape properties.'),
    }),
    handler: async (input: { excludeCollections?: boolean }) => {
      const fullState = get();

      if (input.excludeCollections) {
        // Return only fixed-shape props
        const fixedState: Record<string, unknown> = {};
        for (const key of Object.keys(fixedShape)) {
          fixedState[key] = (fullState as Record<string, unknown>)[key];
        }
        return fixedState;
      }

      return fullState;
    },
  });

  // ROOT SETTER - only if there are fixed props
  if (hasFixedProps) {
    const setInputSchema = deriveSetInputSchema(z.object(fixedShape as z.ZodRawShape));

    tools.push({
      name: `set_${name}`,
      description: `Update ${description} settings (fixed-shape props only, use collection tools for arrays/records)`,
      inputSchema: setInputSchema,
      handler: async (input: Record<string, unknown>) => {
        const current = get() as Record<string, unknown>;

        // Merge only the fixed props
        const fixedUpdate: Record<string, unknown> = {};
        for (const key of Object.keys(fixedShape)) {
          if (key in input) {
            fixedUpdate[key] = input[key];
          }
        }

        const merged = deepMerge(current, fixedUpdate);
        const validated = schema.parse(merged);
        set(validated);

        // Return only the fixed props that were updated
        const result: Record<string, unknown> = {};
        for (const key of Object.keys(fixedShape)) {
          result[key] = (validated as Record<string, unknown>)[key];
        }

        return { success: true, value: result };
      },
    });
  }

  // COLLECTION TOOLS - generate for each dynamic field
  for (const { key, field } of dynamicFields) {
    const unwrappedField = unwrapSchema(field);

    const collectionOptions: ToolGenerationOptions = {
      name: `${name}_${key}`,
      description: `${key} in ${description}`,
      get: () => (get() as Record<string, unknown>)[key],
      set: (value: unknown) => {
        const current = get() as Record<string, unknown>;
        current[key] = value;
        set(current);
      },
      schema: field,
    };

    if (unwrappedField instanceof z.ZodArray) {
      tools.push(...generateArrayTools(collectionOptions));
    } else if (unwrappedField instanceof z.ZodRecord) {
      tools.push(...generateRecordTools(collectionOptions));
    }
  }

  return tools;
}
