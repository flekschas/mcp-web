import { applyPartialUpdate, type DecomposedSchema, type DecompositionOptions, decomposeSchema, type SplitPlan } from '@mcp-web/decompose-zod-schema';
import { type Atom, type createStore, getDefaultStore, type PrimitiveAtom, type WritableAtom } from 'jotai';
import { ZodObject, z } from 'zod';
import type { MCPWeb } from '../web';
import { isObjectValue, isSupportedValue, isZodSchema, toToolSchema, validateInput } from './utils';

type Store = ReturnType<typeof createStore>;

// Type guard to check if atom is writable
function isWritableAtom<T>(atom: PrimitiveAtom<T> | Atom<T> | WritableAtom<T, unknown[], unknown>): atom is WritableAtom<T, unknown[], unknown> {
  return (atom as WritableAtom<T, unknown[], unknown>).write !== undefined;
}

// Base configuration interface for atoms holding primitive and array values
interface AtomToolConfig<T> {
  /** The MCPWeb instance to register tools with. */
  mcp: MCPWeb;
  /** The name of the tool. */
  name: string;
  /** The description of the tool. */
  description: string;
  /** The Jotai atom to create tools for (holding non-object values). */
  atom: PrimitiveAtom<T> | Atom<T> | WritableAtom<T, unknown[], unknown>;
  /** The schema for validating new atom values and informing tool use. Can be either a Zod or JSON Schema. */
  atomSchema: z.ZodType<T> | z.core.JSONSchema.JSONSchema;
  /** The Jotai store to use. If not provided, the default store will be used. */
  store?: Store;
}

// Configuration for atoms holding objects
interface ObjectAtomToolConfig<T extends object> extends AtomToolConfig<T> {
  /** The split plan or decomposition options for the atom schema. */
  atomSchemaSplit?: SplitPlan | DecompositionOptions;
}

/**
 * Adds MCP tools for getting and setting a non-object atom value (primitives and arrays).
 */
function addNonObjectAtomTool<T>({
  mcp,
  atom,
  store: customStore,
  name,
  description,
  atomSchema,
}: AtomToolConfig<T>): () => void {
  const store = customStore || getDefaultStore();

  console.log('adding non-object atom tools', name);

  // Always add a getter tool
  const getterToolName = `get_${name}`;
  mcp.addTool({
    name: getterToolName,
    description: `Get the current value of ${name}. ${description}`,
    handler: async () => await store.get(atom),
    outputSchema: toToolSchema(atomSchema),
  });

  const tools = [getterToolName];

  // Add setter tool if the atom is writable
  if (isWritableAtom(atom)) {
    const setterToolName = `set_${name}`;
    mcp.addTool({
      name: setterToolName,
      description: `Set the value of ${name}. ${description}`,
      handler: (newValue: unknown) => {
        try {
          const validatedValue = validateInput(newValue, atomSchema);
          store.set(atom, validatedValue);
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      },
      inputSchema: toToolSchema(atomSchema),
      outputSchema: z.object({
        success: z.boolean(),
        error: z.string().optional(),
      }),
    });
    tools.push(setterToolName);
  }

  return () => {
    tools.forEach((tool) => { mcp.removeTool(tool); });
  };
}

/**
 * Adds MCP tools for getting and setting an object atom value.
 */
function addObjectAtomTool<T extends object>({
  mcp,
  atom,
  store: customStore,
  name,
  description,
  atomSchema,
  atomSchemaSplit
}: ObjectAtomToolConfig<T>): () => void {
  const store = customStore || getDefaultStore();

  console.log('adding object atom tools', name);

  const isZodObjectSchema = atomSchema &&
    isZodSchema(atomSchema) &&
    atomSchema instanceof ZodObject;

  const shouldDecompose = isZodObjectSchema && atomSchemaSplit !== undefined;

  let decomposedSchemas: DecomposedSchema[] = [];

  if (shouldDecompose && atomSchemaSplit) {
    // Use type assertion to avoid version conflicts between different Zod installations
    decomposedSchemas = decomposeSchema(
      atomSchema as unknown as Parameters<typeof decomposeSchema>[0],
      atomSchemaSplit
    );
  }

  // Always add a getter tool
  const getterToolName = `get_${name}`;
  mcp.addTool({
    name: getterToolName,
    description: `Get the current value of ${name}. ${description}`,
    handler: async () => await store.get(atom),
    outputSchema: toToolSchema(atomSchema),
  });

  const tools = [getterToolName];

  // Add setter tools - either decomposed or single
  if (isWritableAtom(atom)) {
    if (decomposedSchemas.length > 0) {
      // Add decomposed setter tools
      decomposedSchemas.forEach((decomposed) => {
        const toolName = `set_${name}_${decomposed.name}`;
        mcp.addTool({
          name: toolName,
          description: `Set ${decomposed.name} properties of ${name}. ${description}`,
          handler: (partialValue: z.infer<typeof decomposed.schema>) => {
            try {
              const currentValue = store.get(atom);
              const updatedValue = applyPartialUpdate(currentValue, decomposed.targetPaths, partialValue);
              const validatedValue = validateInput(updatedValue, atomSchema);
              store.set(atom as WritableAtom<T, unknown[], unknown>, validatedValue);
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
      // Add single setter tool
      const toolName = `set_${name}`;
      mcp.addTool({
        name: toolName,
        description: `Set the value of ${name}. ${description}`,
        handler: (newValue: unknown) => {
          try {
            const validatedValue = validateInput(newValue, atomSchema);
            store.set(atom as WritableAtom<T, unknown[], unknown>, validatedValue);
            return { success: true };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        inputSchema: toToolSchema(atomSchema),
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
    tools.forEach((tool) => { mcp.removeTool(tool); });
  };
}

export function addAtomTool<T>(config: AtomToolConfig<T>): () => void;
export function addAtomTool<T extends object>(config: ObjectAtomToolConfig<T>): () => void;
export function addAtomTool(config: AtomToolConfig<unknown> | ObjectAtomToolConfig<Record<string, unknown>>): () => void {
  const { atomSchema } = config;

  // Validate the value type is supported
  if (!isSupportedValue(atomSchema)) {
    const configName = config.name || 'unknown';
    throw new Error(`Unsupported value type for atom '${configName}'. Only primitive values, arrays, and objects are supported.`);
  }

  // Determine value type and route to appropriate function
  if (isObjectValue(atomSchema)) {
    // It's an object value - route to object handler
    return addObjectAtomTool(config as ObjectAtomToolConfig<Record<string, unknown>>);
  } else {
    // It's a non-object value (primitive or array) - route to non-object handler
    return addNonObjectAtomTool(config as AtomToolConfig<unknown>);
  }
}
