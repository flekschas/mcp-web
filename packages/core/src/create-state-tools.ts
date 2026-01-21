import type { DecomposedSchema, SplitPlan } from '@mcp-web/decompose-zod-schema';
import { decomposeSchema } from '@mcp-web/decompose-zod-schema';
import type { ToolDefinitionZod } from '@mcp-web/types';
import { ZodObject, type z } from 'zod';
import { generateBasicStateTools } from './tool-generators/index.js';
import { generateToolsForSchema } from './tool-generators/index.js';

/**
 * Configuration for creating state tools.
 */
export interface CreateStateToolsConfig<T> {
  /** The name of the state (used as prefix for tool names). */
  name: string;
  /** Description of what this state represents. */
  description: string;
  /** Function to get the current state value. */
  get: () => T;
  /** Function to set the state value. */
  set: (value: T) => void;
  /** Zod schema for validating state values. */
  schema: z.ZodType<T>;
  /** Optional split plan for decomposing the schema into multiple setter tools. */
  schemaSplit?: SplitPlan;
  /** When true, generates expanded tools for arrays and records. */
  expand?: boolean;
}

/**
 * Result type for created state tools without schemaSplit or expand.
 * Returns a single getter and single setter.
 */
export interface CreatedStateToolsBasic<T> {
  /** Marker to identify this as created state tools. */
  readonly __brand: 'CreatedStateTools';
  /** The getter tool definition. */
  readonly getter: ToolDefinitionZod;
  /** The setter tool definition(s). Single setter for basic mode. */
  readonly setters: ToolDefinitionZod;
  /** All tool definitions as an array. */
  readonly tools: ToolDefinitionZod[];
  /** The original config. */
  readonly config: CreateStateToolsConfig<T>;
  /** Whether this uses expanded/decomposed tools. */
  readonly isExpanded: false;
}

/**
 * Result type for created state tools with schemaSplit or expand.
 * Returns a getter and array of setters.
 */
export interface CreatedStateToolsExpanded<T> {
  /** Marker to identify this as created state tools. */
  readonly __brand: 'CreatedStateTools';
  /** The getter tool definition. */
  readonly getter: ToolDefinitionZod;
  /** The setter tool definition(s). Array for expanded/decomposed mode. */
  readonly setters: ToolDefinitionZod[];
  /** All tool definitions as an array. */
  readonly tools: ToolDefinitionZod[];
  /** The original config. */
  readonly config: CreateStateToolsConfig<T>;
  /** Whether this uses expanded/decomposed tools. */
  readonly isExpanded: true;
}

/** Union type for created state tools. */
export type CreatedStateTools<T> = CreatedStateToolsBasic<T> | CreatedStateToolsExpanded<T>;

// Overload: No schemaSplit, no expand → single setter
export function createStateTools<T>(config: CreateStateToolsConfig<T> & {
  schemaSplit?: undefined;
  expand?: false;
}): CreatedStateToolsBasic<T>;

// Overload: With schemaSplit → array of setters
export function createStateTools<T>(config: CreateStateToolsConfig<T> & {
  schemaSplit: SplitPlan;
  expand?: boolean;
}): CreatedStateToolsExpanded<T>;

// Overload: With expand → array of setters
export function createStateTools<T>(config: CreateStateToolsConfig<T> & {
  schemaSplit?: SplitPlan;
  expand: true;
}): CreatedStateToolsExpanded<T>;

/**
 * Creates state tool definitions without registering them.
 * 
 * This follows the Jotai pattern of creating atoms outside React components.
 * State tools can be defined at module scope and registered when needed.
 * 
 * @example Basic state tools (module-level definition)
 * ```typescript
 * // tools.ts
 * import { createStateTools } from '@mcp-web/core';
 * import { z } from 'zod';
 * import { store, todosAtom } from './states';
 * 
 * const TodoSchema = z.object({
 *   id: z.string(),
 *   title: z.string(),
 *   completed: z.boolean(),
 * });
 * 
 * export const todoTools = createStateTools({
 *   name: 'todos',
 *   description: 'Todo list',
 *   get: () => store.get(todosAtom),
 *   set: (value) => store.set(todosAtom, value),
 *   schema: z.array(TodoSchema),
 *   expand: true, // Generates get_todos, add_todos, set_todos, delete_todos
 * });
 * ```
 * 
 * @example Registration options
 * ```typescript
 * // Option 1: Direct registration
 * mcpWeb.addStateTools(todoTools);
 * 
 * // Option 2: React hook (auto cleanup on unmount)
 * function App() {
 *   useTools(todoTools);
 *   return <div>...</div>;
 * }
 * ```
 * 
 * @example With schema decomposition
 * ```typescript
 * export const settingsTools = createStateTools({
 *   name: 'settings',
 *   description: 'App settings',
 *   get: () => store.get(settingsAtom),
 *   set: (value) => store.set(settingsAtom, value),
 *   schema: SettingsSchema,
 *   schemaSplit: ['theme', ['sortBy', 'sortOrder']], // Creates separate setter tools
 * });
 * ```
 */
export function createStateTools<T>(
  config: CreateStateToolsConfig<T>
): CreatedStateTools<T> {
  const { name, description, get, set, schema, schemaSplit, expand } = config;
  const allTools: ToolDefinitionZod[] = [];

  // Determine if we're expanding (schemaSplit or expand flag)
  const isZodObjectSchema = schema instanceof ZodObject;
  const shouldDecompose = schemaSplit && isZodObjectSchema;

  // Step 1: Apply schemaSplit if provided
  let decomposedSchemas: DecomposedSchema[] = [];
  if (shouldDecompose) {
    decomposedSchemas = decomposeSchema(schema, schemaSplit);
  }

  // Step 2: Generate tools based on mode
  if (expand) {
    // Expanded mode: generate targeted tools for collections
    if (decomposedSchemas.length > 0) {
      // Generate expanded tools for each decomposed part
      for (const decomposed of decomposedSchemas) {
        const result = generateToolsForSchema({
          name: `${name}_${decomposed.name}`,
          description: `${decomposed.name} in ${description}`,
          get: () => {
            const fullState = get() as Record<string, unknown>;
            const extracted: Record<string, unknown> = {};
            for (const path of decomposed.targetPaths) {
              extracted[path] = fullState[path];
            }
            return Object.keys(extracted).length === 1
              ? extracted[decomposed.targetPaths[0]]
              : extracted;
          },
          set: (value: unknown) => {
            const current = get() as Record<string, unknown>;
            if (decomposed.targetPaths.length === 1) {
              current[decomposed.targetPaths[0]] = value;
            } else {
              Object.assign(current, value);
            }
            set(current as T);
          },
          schema: decomposed.schema as z.ZodTypeAny,
        });

        allTools.push(...result.tools);

        // Log warnings if any
        for (const warning of result.warnings) {
          console.warn(warning);
        }
      }
    } else {
      // Generate expanded tools for full schema
      const result = generateToolsForSchema({
        name,
        description,
        get: get as () => unknown,
        set: set as (value: unknown) => void,
        schema: schema as z.ZodTypeAny,
      });

      allTools.push(...result.tools);

      // Log warnings if any
      for (const warning of result.warnings) {
        console.warn(warning);
      }
    }

    // For expanded mode, first tool is getter, rest are setters
    const getter = allTools[0];
    const setters = allTools.slice(1);

    return {
      __brand: 'CreatedStateTools' as const,
      getter,
      setters,
      tools: allTools,
      config,
      isExpanded: true,
    };
  } else if (shouldDecompose) {
    // Decompose mode without expand: use basic state tools with decomposition
    const basicResult = generateBasicStateTools({
      name,
      description,
      get,
      set,
      schema: schema as z.ZodType<T>,
      schemaSplit,
    });

    allTools.push(basicResult.getter, ...basicResult.setters);

    return {
      __brand: 'CreatedStateTools' as const,
      getter: basicResult.getter,
      setters: basicResult.setters,
      tools: allTools,
      config,
      isExpanded: true,
    };
  } else {
    // Basic mode: simple get/set tools
    const basicResult = generateBasicStateTools({
      name,
      description,
      get,
      set,
      schema: schema as z.ZodType<T>,
    });

    allTools.push(basicResult.getter, ...basicResult.setters);

    return {
      __brand: 'CreatedStateTools' as const,
      getter: basicResult.getter,
      setters: basicResult.setters[0], // Single setter for basic mode
      tools: allTools,
      config,
      isExpanded: false,
    };
  }
}

/**
 * Type guard to check if a value is CreatedStateTools.
 */
export function isCreatedStateTools(value: unknown): value is CreatedStateTools<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__brand' in value &&
    (value as CreatedStateTools<unknown>).__brand === 'CreatedStateTools'
  );
}
