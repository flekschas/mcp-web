import { ZodArray, ZodEnum, ZodObject, ZodRecord, type ZodSchema, type ZodType, z } from 'zod';
import { suggestDecompositionPlan } from './split-suggestions.js';
import type { DecomposedSchema, DecompositionOptions, SizeBasedOptions, SplitPlan } from './types.js';
import {
  evenChunk,
  extractSchemaForPaths,
  getSchemaAtPath,
  parseEnumSplit,
} from './utils.js';
import { validatePlan } from './validate.js';

/**
 * Decomposes a Zod schema into smaller schemas based on a split plan or options.
 *
 * This function supports two modes:
 * 1. **Manual decomposition**: Pass a SplitPlan array to control exactly how the schema is split
 * 2. **Automatic decomposition**: Pass options to automatically suggest splits based on size
 *
 * @param schema - The Zod object schema to decompose
 * @param planOrOptions - Either a SplitPlan for manual decomposition or DecompositionOptions for automatic
 * @returns Array of decomposed schemas with their target paths
 *
 * @example Manual decomposition with SplitPlan
 * ```typescript
 * const decomposed = decomposeSchema(GameStateSchema, [
 *   'board',
 *   ['currentPlayer', 'turn'],
 *   'settings',
 * ]);
 * ```
 *
 * @example Automatic decomposition with options
 * ```typescript
 * const decomposed = decomposeSchema(LargeSchema, {
 *   maxTokensPerSchema: 2000,
 *   maxOptionsPerEnum: 200,
 * });
 * ```
 */
export function decomposeSchema(
  schema: ZodObject<Record<string, ZodType>>,
  planOrOptions: SplitPlan | DecompositionOptions,
): DecomposedSchema[] {
  // Check if it's a split plan (array) or options (object with specific properties)
  if (Array.isArray(planOrOptions)) {
    // Manual decomposition with split plan
    return decomposeSchemaWithPlan(schema, planOrOptions);
  } else {
    // Automatic decomposition with size-based suggestions
    // Provide defaults for missing options
    const sizeBasedOptions: SizeBasedOptions = {
      maxTokensPerSchema: planOrOptions.maxTokensPerSchema ?? 2000,
      maxOptionsPerEnum: planOrOptions.maxOptionsPerEnum ?? 200,
    };
    const suggestedPlan = suggestDecompositionPlan(schema, sizeBasedOptions);
    return decomposeSchemaWithPlan(schema, suggestedPlan);
  }
}


/**
 * Manually decompose a schema using a predefined split plan.
 * This function takes a schema and a split plan that defines exactly how to split it.
 *
 * @param schema - The Zod schema to decompose
 * @param plan - Array of path specifications defining how to split the schema
 * @returns Array of decomposed schemas with their target paths
 */
export function decomposeSchemaWithPlan(
  schema: ZodObject<Record<string, ZodType>>,
  plan: SplitPlan,
): DecomposedSchema[] {
  // Validate the split plan first
  const validationErrors = validatePlan(plan, schema);
  if (validationErrors.length > 0) {
    throw new Error(`Invalid split plan: ${validationErrors.join(', ')}`);
  }

  const result: DecomposedSchema[] = [];
  const processedPaths = new Set<string>();
  const processedItems = new Set<string>();

  const parsedSplits = plan.map(split => ({
    original: split,
    ...parseArrayNotation(split)
  }));

  // Group splits by type
  const arrayGroups = new Map<string, string[]>();
  const recordGroups = new Map<string, string[]>();
  const regularSplits: string[] = [];

  parsedSplits.forEach(({ original, path, isArrayElement }) => {
    const parsed = parseEnumSplit(original);
    if (parsed.isArraySplit) {
      // Handle nested array splits like 'views[].tracks.top[]'
      if (original.includes('[].') && original.match(/^(.+)\[\]\.(.+)\[\]$/)) {
        // This is a nested array split - handle it specially
        if (!arrayGroups.has('nested')) arrayGroups.set('nested', []);
        arrayGroups.get('nested')?.push(original);
      } else {
        // Regular array split like 'views[]'
        if (!arrayGroups.has(parsed.path)) arrayGroups.set(parsed.path, []);
        arrayGroups.get(parsed.path)?.push(original);
      }
    } else if (parsed.isRecordSplit) {
      if (!recordGroups.has(parsed.path)) recordGroups.set(parsed.path, []);
      recordGroups.get(parsed.path)?.push(original);
    } else if (isArrayElement) {
      if (!arrayGroups.has(path)) arrayGroups.set(path, []);
      arrayGroups.get(path)?.push(original);
    } else {
      regularSplits.push(original);
    }
  });

  // Handle array splits
  arrayGroups.forEach((splits, arrayPath) => {
    if (arrayPath === 'nested') {
      // Handle nested array splits like 'views[].tracks.top[]'
      splits.forEach(splitPath => {
        const nestedMatch = splitPath.match(/^(.+)\[\]\.(.+)\[\]$/);
        if (nestedMatch) {
          const [, basePath, subPath] = nestedMatch;

          // Get the base array schema (e.g., 'views')
          const baseArraySchema = getSchemaAtPath(schema, basePath);
          if (!(baseArraySchema instanceof ZodArray)) {
            console.warn(`Expected array at path: ${basePath}`);
            return;
          }

          // Get the element schema and navigate to the sub-array
          const elementSchema = baseArraySchema.element;
          if (!(elementSchema instanceof ZodObject)) {
            console.warn(`Expected object element in array at path: ${basePath}`);
            return;
          }

          // Get the sub-array schema (e.g., 'tracks.top')
          let subArraySchema = getSchemaAtPath(elementSchema as ZodObject<Record<string, ZodType>>, subPath);

          // Unwrap optional schemas
          if (subArraySchema && typeof subArraySchema === 'object' && 'unwrap' in subArraySchema) {
            subArraySchema = (subArraySchema as { unwrap: () => ZodType }).unwrap();
          }

          if (!(subArraySchema instanceof ZodArray)) {
            console.warn(`Expected array at nested path: ${basePath}[].${subPath}`);
            return;
          }

          // Create the schema for the nested array element
          const nestedElementSchema = createArrayElementSchema(subArraySchema as ZodArray<ZodType>);
          result.push({
            name: `${basePath.replace(/\./g, '-')}-${subPath.replace(/\./g, '-')}-item`,
            schema: nestedElementSchema,
            targetPaths: [splitPath]
          });
        }
      });
    } else {
      // Handle regular array splits
      const arraySchema = getSchemaAtPath(schema, arrayPath);

      if (!(arraySchema instanceof ZodArray)) {
        console.warn(`Expected array at path: ${arrayPath}`);
        return;
      }

      splits.forEach(splitPath => {
        const parsed = parseEnumSplit(splitPath);
        if (parsed.isArraySplit) {
          const elementSchema = createArrayElementSchema(arraySchema as ZodArray<ZodType>);
          result.push({
            name: `${arrayPath.replace(/\./g, '-')}-item`,
            schema: elementSchema,
            targetPaths: [splitPath]
          });
        } else {
          // Handle legacy array notation with exclusions
          const { excludedSubArrays } = parseArrayNotation(splitPath);
          const elementSchema = createArrayElementSchema(arraySchema as ZodArray<ZodType>, excludedSubArrays);
          result.push({
            name: `${arrayPath.replace(/\./g, '-')}-item`,
            schema: elementSchema,
            targetPaths: [splitPath]
          });
        }
      });
    }
  });

  // Handle record splits
  recordGroups.forEach((splits, recordPath) => {
    const recordSchema = getSchemaAtPath(schema, recordPath);

    if (!(recordSchema instanceof ZodRecord)) {
      console.warn(`Expected record at path: ${recordPath}`);
      return;
    }

    splits.forEach(splitPath => {
      const elementSchema = createRecordElementSchema(recordSchema as ZodRecord);
      result.push({
        name: `${recordPath.replace(/\./g, '-')}-entry`,
        schema: elementSchema,
        targetPaths: [splitPath]
      });
    });
  });

  for (const item of plan) {
    const parsed = parseEnumSplit(item);

    // Skip if we've already processed this exact item
    if (processedItems.has(item)) {
      continue;
    }

    // Skip array and record splits as they're handled above
    if (parsed.isArraySplit || parsed.isRecordSplit) {
      processedItems.add(item);
      continue;
    }

    const schemaAtPath = getSchemaAtPath(schema, parsed.path);
    if (!schemaAtPath) {
      continue; // Skip invalid paths (already validated above)
    }

    // Handle enum splitting
    if (schemaAtPath instanceof ZodEnum && parsed.chunkSize) {
      const enumOptions = schemaAtPath.options as string[];
      const chunks = evenChunk(enumOptions, parsed.chunkSize);

      chunks.forEach((chunk, index) => {
        const chunkName =
          chunks.length > 1 ? `${parsed.path}-${index + 1}` : parsed.path;
        const startIndex =
          index * Math.ceil(enumOptions.length / chunks.length);
        const endIndex = Math.min(
          startIndex + chunk.length,
          enumOptions.length,
        );
        const slicePath = `${parsed.path}[${startIndex}:${endIndex}]`;

        // Create schema with just this enum chunk
        const chunkSchema = z.object({
          [parsed.path.split('.').pop() || parsed.path]: z.enum(
            chunk as [string, ...string[]],
          ),
        });

        result.push({
          name: chunkName,
          schema: chunkSchema,
          targetPaths: [slicePath],
        });
      });

      processedItems.add(item);
    }
    // Handle slice notation (including shorthand)
    else if (schemaAtPath instanceof ZodEnum && parsed.start !== undefined) {
      const enumOptions = schemaAtPath.options as string[];
      const end = parsed.end !== undefined ? parsed.end : enumOptions.length;
      const slicedOptions = enumOptions.slice(parsed.start, end);

      if (slicedOptions.length > 0) {
        const sliceSchema = z.object({
          [parsed.path.split('.').pop() || parsed.path]: z.enum(
            slicedOptions as [string, ...string[]],
          ),
        });

        // Generate appropriate name for the slice
        const sliceName =
          parsed.end !== undefined
            ? `${parsed.path}-${parsed.start}-${parsed.end}`
            : `${parsed.path}-${parsed.start}-end`;

        result.push({
          name: sliceName,
          schema: sliceSchema,
          targetPaths: [item],
        });
      }

      processedItems.add(item);
    }
    // Handle regular path extraction
    else {
      // Group paths that share the same root for better organization
      const pathsToInclude = plan
        .filter((planItem) => {
          const planParsed = parseEnumSplit(planItem);
          return (
            planParsed.path === parsed.path ||
            planParsed.path.startsWith(`${parsed.path}.`)
          );
        })
        .map((planItem) => parseEnumSplit(planItem).path)
        .filter((path) => !processedPaths.has(path));

      if (pathsToInclude.length > 0) {
        try {
          const extractedSchema = extractSchemaForPaths(schema, pathsToInclude);

          result.push({
            name: parsed.path.replace(/\./g, '-'),
            schema: extractedSchema,
            targetPaths: pathsToInclude,
          });

          // Mark all included paths as processed
          pathsToInclude.forEach((path) => processedPaths.add(path));
        } catch (_error) {
          // If extraction fails, create a simple schema with just this path
          const shape: Record<string, ZodType> = {};
          const parts = parsed.path.split('.');
          const leafKey = parts[parts.length - 1];

          if (parts.length === 1) {
            shape[leafKey] = schemaAtPath;
          } else {
            // For nested paths, create the nested structure
            let current = shape;
            for (let i = 0; i < parts.length - 1; i++) {
              const part = parts[i];
              current[part] = z.object({});
              current = (current[part] as ZodObject<Record<string, ZodType>>)
                .shape;
            }
            current[leafKey] = schemaAtPath;
          }

          result.push({
            name: parsed.path.replace(/\./g, '-'),
            schema: z.object(shape),
            targetPaths: [parsed.path],
          });

          processedPaths.add(parsed.path);
        }
      }
    }
  }

  return result;
}

interface ArraySplit {
  path: string;
  isArrayElement: boolean;
  excludedSubArrays: string[]; // For handling nested exclusions
}

const parseArrayNotation = (splitPath: string): ArraySplit => {
  const arrayMatch = splitPath.match(/^(.+)\[\](.*)$/);
  if (arrayMatch) {
    const [, basePath, subPath] = arrayMatch;
    return {
      path: basePath,
      isArrayElement: true,
      excludedSubArrays: subPath ? [subPath.slice(1)] : [] // Remove leading dot
    };
  }
  return { path: splitPath, isArrayElement: false, excludedSubArrays: [] };
};

const createArrayElementSchema = (
  arraySchema: ZodArray<ZodType>,
  excludedPaths: string[] = []
): ZodObject<{ index: z.ZodNumber; value: ZodType }> => {
  let elementSchema = arraySchema.element;

  // Unwrap ZodLazy schemas
  if (elementSchema && typeof elementSchema === 'object' && '_def' in elementSchema &&
      (elementSchema as unknown as { _def: { type: string } })._def.type === 'lazy') {
    const lazySchema = elementSchema as unknown as { _def: { getter: () => ZodType } };
    elementSchema = lazySchema._def.getter();
  }

  // For array splits, we need either ZodObject or ZodUnion (for different track types)
  if (!(elementSchema instanceof ZodObject) && elementSchema?.constructor.name !== 'ZodUnion') {
    throw new Error(`Array element must be an object or union for array splitting, got ${elementSchema?.constructor.name}`);
  }

  // Create element schema with exclusions
  let finalElementSchema = elementSchema;

  if (elementSchema instanceof ZodObject) {
    const elementWithExclusions = createSchemaWithExclusions(
      elementSchema,
      '',
      excludedPaths
    );
    finalElementSchema = elementWithExclusions || elementSchema;
  }
  // For union schemas, we keep them as-is since they represent valid track types

  // Wrap with index
  return z.object({
    index: z.number().min(0),
    value: finalElementSchema
  });
};

const createRecordElementSchema = (
  recordSchema: ZodRecord
): ZodObject<{ key: ZodType; value: ZodType }> => {
  // Access internal properties of ZodRecord
  const keySchema = (recordSchema as unknown as { _def: { keyType?: ZodType } })._def.keyType || z.string();
  const valueSchema = (recordSchema as unknown as { _def: { valueType: ZodType } })._def.valueType;

  // Transform z.record(K, V) to z.object({ key: K, value: V })
  return z.object({
    key: keySchema,
    value: valueSchema
  });
};

const createSchemaWithExclusions = (
  rootSchema: ZodObject<Record<string, ZodType>>,
  basePath: string,
  exclusions: string[]
): ZodSchema | null => {
  const baseSchema = getSchemaAtPath(rootSchema, basePath);

  if (!(baseSchema instanceof ZodObject)) {
    return baseSchema || null;
  }

  // Filter exclusions to only those that are direct children of basePath
  const relevantExclusions = exclusions
    .filter(exc => {
      if (!basePath) {
        // For root level, exclude direct children
        return !exc.includes('.');
      } else {
        // For nested paths, exclude direct children of this path
        return exc.startsWith(`${basePath}.`) &&
               !exc.slice(basePath.length + 1).includes('.');
      }
    })
    .map(exc => basePath ? exc.slice(basePath.length + 1) : exc);

  if (relevantExclusions.length === 0) {
    return baseSchema;
  }

  // Create new shape excluding the specified properties
  const newShape: Record<string, ZodSchema> = {};
  Object.entries(baseSchema.shape).forEach(([key, schema]) => {
    if (!relevantExclusions.includes(key)) {
      newShape[key] = schema;
    }
  });

  // Return null if all properties were excluded
  if (Object.keys(newShape).length === 0) {
    return null;
  }

  return z.object(newShape);
};
