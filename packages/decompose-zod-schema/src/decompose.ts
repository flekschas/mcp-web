import { ZodEnum, ZodObject, type ZodType, z } from 'zod';
import { suggestDecompositionPlan } from './split-suggestions.js';
import type {
  DecomposedSchema,
  DecompositionOptions,
  SizeBasedOptions,
  SplitPlan,
} from './types.js';
import {
  evenChunk,
  extractSchemaForPaths,
  getSchemaAtDeepPath,
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
  }
  // Automatic decomposition with size-based suggestions
  // Provide defaults for missing options
  const sizeBasedOptions: SizeBasedOptions = {
    maxTokensPerSchema: planOrOptions.maxTokensPerSchema ?? 2000,
    maxOptionsPerEnum: planOrOptions.maxOptionsPerEnum ?? 200,
  };
  const suggestedPlan = suggestDecompositionPlan(schema, sizeBasedOptions);
  return decomposeSchemaWithPlan(schema, suggestedPlan);
}

/**
 * Manually decompose a schema using a predefined split plan.
 *
 * For paths that traverse through collections (e.g., 'views.tracks.top' where
 * 'views' is an array), the decomposed schema extracts the top-level property
 * and preserves the full path in `targetPaths` for downstream consumers.
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

  for (const item of plan) {
    const parsed = parseEnumSplit(item);

    // Skip already-processed paths, but allow multiple enum slices for the same path
    if (processedPaths.has(parsed.path) && parsed.start === undefined && !parsed.chunkSize) continue;

    // Try shallow path first (top-level or nested within objects)
    let schemaAtPath = getSchemaAtPath(schema, parsed.path);
    let isDeepPath = false;

    if (!schemaAtPath) {
      // Try deep path (traverses through array elements / record values)
      const deepResult = getSchemaAtDeepPath(schema, parsed.path);
      if (!deepResult) continue; // Skip invalid paths (already validated)
      schemaAtPath = deepResult.schema;
      isDeepPath = true;
    }

    // Handle enum splitting (chunk notation)
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

      processedPaths.add(parsed.path);
    }
    // Handle slice notation
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
      // Don't add to processedPaths — multiple slices for the same path are expected
    }
    // Handle regular path extraction
    else {
      if (isDeepPath) {
        // For paths that traverse through collections (e.g., 'views.tracks.top'),
        // extract the top-level key from the root schema and preserve the full
        // path in targetPaths for the core package to handle nested traversal.
        const topLevelKey = parsed.path.split('.')[0];
        const topLevelSchema = schema.shape[topLevelKey] as ZodType;

        if (topLevelSchema) {
          result.push({
            name: parsed.path.replace(/\./g, '-'),
            schema: z.object({ [topLevelKey]: topLevelSchema }),
            targetPaths: [parsed.path],
          });
        }
      } else {
        // Shallow path — group paths that share the same root
        const pathsToInclude = plan
          .filter((planItem) => {
            const planParsed = parseEnumSplit(planItem);
            return (
              planParsed.path === parsed.path ||
              planParsed.path.startsWith(`${parsed.path}.`)
            );
          })
          .map((planItem) => parseEnumSplit(planItem).path)
          .filter(
            (path) =>
              !processedPaths.has(path) &&
              // Only include paths that resolve via shallow lookup
              getSchemaAtPath(schema, path) !== undefined,
          );

        if (pathsToInclude.length > 0) {
          try {
            const extractedSchema = extractSchemaForPaths(
              schema,
              pathsToInclude,
            );

            result.push({
              name: parsed.path.replace(/\./g, '-'),
              schema: extractedSchema,
              targetPaths: pathsToInclude,
            });

            // Mark all included paths as processed
            for (const path of pathsToInclude) {
              processedPaths.add(path);
            }
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
                current = (
                  current[part] as ZodObject<Record<string, ZodType>>
                ).shape;
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

      processedPaths.add(parsed.path);
    }
  }

  return result;
}
