import type { DecomposedSchema, SplitPlan } from '@mcp-web/decompose-zod-schema';
import { decomposeSchema, getSchemaAtDeepPath } from '@mcp-web/decompose-zod-schema';
import type { ToolDefinitionZod } from '@mcp-web/types';
import { ZodObject, type ZodType, z } from 'zod';
import { generateBasicStateTools } from './zod-schema-to-tools/index.js';
import { generateToolsForSchema } from './zod-schema-to-tools/index.js';
import { createMutex } from './serialize.js';

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
    if (decomposedSchemas.length > 0) {
      // Expanded + decomposed: root getter + per-segment tools
      const rootGetter: ToolDefinitionZod = {
        name: `get_${name}`,
        description: `Get the current ${description}`,
        inputSchema: z.object({}),
        handler: async () => get(),
      };
      allTools.push(rootGetter);

      const zodObjSchema = schema as ZodObject<Record<string, ZodType>>;

      for (const decomposed of decomposedSchemas) {
        const targetPath = decomposed.targetPaths[0];
        const segments = targetPath.split('.');
        const toolName = `${name}_${decomposed.name.replace(/-/g, '_')}`;

        // Check if this is a deep path (traverses through collections)
        const deepResult = getSchemaAtDeepPath(zodObjSchema, targetPath);
        const parentCollections = deepResult
          ? deepResult.segments.filter((s) => s.collectionType !== 'none')
          : [];

        if (parentCollections.length === 0) {
          // Simple top-level path (e.g., 'views', 'settings')
          const topLevelKey = segments[0];
          const rawSchema = zodObjSchema.shape[topLevelKey] as z.ZodTypeAny;
          if (!rawSchema) continue;

          const result = generateToolsForSchema({
            name: toolName,
            description: `${decomposed.name} in ${description}`,
            get: () => (get() as Record<string, unknown>)[topLevelKey],
            set: (value: unknown) => {
              const current = get() as Record<string, unknown>;
              set({ ...current, [topLevelKey]: value } as T);
            },
            schema: rawSchema,
          });

          allTools.push(...result.tools);
          for (const warning of result.warnings) {
            console.warn(warning);
          }
        } else {
          // Deep path with intermediate collections (e.g., 'views.tracks.top')
          // Build parent index schema for intermediate collections
          const parentIndexFields: Record<string, z.ZodTypeAny> = {};
          for (const parent of parentCollections) {
            if (parent.collectionType === 'array') {
              parentIndexFields[`${parent.key}Index`] = z
                .number()
                .int()
                .min(0)
                .describe(
                  `Zero-based index in the ${parent.key} array`,
                );
            } else if (parent.collectionType === 'record') {
              parentIndexFields[`${parent.key}Key`] = z
                .string()
                .describe(`Key in the ${parent.key} record`);
            }
          }
          const parentIndexSchema = z.object(parentIndexFields);

          /**
           * Which element of each intermediate collection this call addresses.
           *
           * Shared rather than passed, because `generateToolsForSchema` builds
           * one `get`/`set` pair for the whole path and has no channel for a
           * per-call argument. `runExclusive` below is what makes that safe.
           */
          let currentParentIndices: Record<string, number | string> = {};

          /**
           * One handler at a time on this path, so a call that suspends cannot
           * have its indices overwritten by the next one. Per path rather than
           * global: two paths share nothing.
           */
          const runExclusive = createMutex();

          const allSegments = deepResult!.segments;

          const nestedGet = () => {
            let current: unknown = get();
            for (const seg of allSegments) {
              current = (current as Record<string, unknown>)[seg.key];
              if (seg.collectionType === 'array') {
                current = (current as unknown[])[
                  currentParentIndices[`${seg.key}Index`] as number
                ];
              } else if (seg.collectionType === 'record') {
                current = (current as Record<string, unknown>)[
                  currentParentIndices[`${seg.key}Key`] as string
                ];
              }
            }
            return current;
          };

          /** Immutably set a value at the deep path. */
          const nestedSet = (value: unknown) => {
            const state = structuredClone(get()) as Record<string, unknown>;
            let current: unknown = state;

            for (let i = 0; i < allSegments.length - 1; i++) {
              const seg = allSegments[i];
              current = (current as Record<string, unknown>)[seg.key];
              if (seg.collectionType === 'array') {
                current = (current as unknown[])[
                  currentParentIndices[`${seg.key}Index`] as number
                ];
              } else if (seg.collectionType === 'record') {
                current = (current as Record<string, unknown>)[
                  currentParentIndices[`${seg.key}Key`] as string
                ];
              }
            }

            const lastSeg = allSegments[allSegments.length - 1];
            (current as Record<string, unknown>)[lastSeg.key] = value;
            set(state as T);
          };

          const result = generateToolsForSchema({
            name: toolName,
            description: `${decomposed.name} in ${description}`,
            get: nestedGet,
            set: nestedSet,
            schema: deepResult!.schema as z.ZodTypeAny,
          });

          // Each tool gains the indices that say which element it addresses.
          for (const tool of result.tools) {
            const originalHandler = tool.handler;
            const originalInputSchema = tool.inputSchema;

            allTools.push({
              ...tool,
              inputSchema: originalInputSchema
                ? parentIndexSchema.merge(
                    originalInputSchema as z.ZodObject<z.ZodRawShape>,
                  )
                : parentIndexSchema,
              handler: async (input: Record<string, unknown>) =>
                runExclusive(async () => {
                  currentParentIndices = {};
                  for (const key of Object.keys(parentIndexFields)) {
                    if (key in input) {
                      currentParentIndices[key] = input[key] as number | string;
                    }
                  }
                  // The indices address the path; the rest is the value, and
                  // the underlying handler validates against a schema that does
                  // not declare them.
                  const remaining: Record<string, unknown> = {};
                  for (const [k, v] of Object.entries(input)) {
                    if (!(k in parentIndexFields)) {
                      remaining[k] = v;
                    }
                  }
                  return originalHandler(remaining);
                }),
            });
          }

          for (const warning of result.warnings) {
            console.warn(warning);
          }
        }
      }

      const setters = allTools.slice(1);
      return {
        __brand: 'CreatedStateTools' as const,
        getter: rootGetter,
        setters,
        tools: allTools,
        config,
        isExpanded: true,
      };
    } else {
      // Expanded without decomposition: generate tools for full schema
      const result = generateToolsForSchema({
        name,
        description,
        get: get as () => unknown,
        set: set as (value: unknown) => void,
        schema: schema as z.ZodTypeAny,
      });

      allTools.push(...result.tools);
      for (const warning of result.warnings) {
        console.warn(warning);
      }

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
    }
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
