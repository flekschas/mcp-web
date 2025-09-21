import { ZodEnum, ZodObject, type ZodType } from 'zod';
import type {
  SizeBasedOptions,
  SplitPlan,
  SuggestionStrategy,
} from './types.js';
import { estimateTokensByJsonSchema } from './utils.js';

/**
 * Size-based suggestion strategy that splits schemas based on token count and enum size limits
 */
export class SizeBasedSuggestionStrategy implements SuggestionStrategy {
  name = 'size-based';

  suggest(
    schema: ZodObject<Record<string, ZodType>>,
    options: SizeBasedOptions,
  ): SplitPlan {
    const { maxTokensPerSchema, maxOptionsPerEnum } = options;
    const plan: SplitPlan = [];

    const processedPaths = new Set<string>();

    // First pass: identify all paths and their token costs
    const pathInfo: Array<{
      path: string;
      tokens: number;
      isEnum: boolean;
      enumSize?: number;
    }> = [];

    const collectPaths = (
      obj: ZodObject<Record<string, ZodType>>,
      prefix = '',
    ) => {
      Object.entries(obj.shape).forEach(([key, zodType]) => {
        const path = prefix ? `${prefix}.${key}` : key;

        if (zodType instanceof ZodObject) {
          // Recurse into nested objects
          collectPaths(zodType, path);
        } else {
          const tokens = estimateTokensByJsonSchema(zodType);
          const isEnum = zodType instanceof ZodEnum;
          const enumSize = isEnum
            ? (zodType.options as string[]).length
            : undefined;

          pathInfo.push({ path, tokens, isEnum, enumSize });
        }
      });
    };

    collectPaths(schema);

    // Sort by estimated tokens (largest first for better grouping)
    pathInfo.sort((a, b) => b.tokens - a.tokens);

    // Second pass: group paths into schemas that fit within token limits
    const groups: Array<{ paths: string[]; totalTokens: number }> = [];

    for (const info of pathInfo) {
      if (processedPaths.has(info.path)) continue;

      // Handle large enums that need splitting
      if (info.isEnum && info.enumSize && info.enumSize > maxOptionsPerEnum) {
        plan.push(`${info.path}[${maxOptionsPerEnum}]`);
        processedPaths.add(info.path);
        continue;
      }

      // Try to fit into an existing group
      let fitted = false;
      for (const group of groups) {
        if (group.totalTokens + info.tokens <= maxTokensPerSchema) {
          // Check if this path shares a common ancestor with paths in the group
          const hasCommonAncestor = group.paths.some((existingPath) => {
            const pathParts = info.path.split('.');
            const existingParts = existingPath.split('.');
            return pathParts[0] === existingParts[0]; // Same top-level property
          });

          if (hasCommonAncestor || group.paths.length === 0) {
            group.paths.push(info.path);
            group.totalTokens += info.tokens;
            fitted = true;
            break;
          }
        }
      }

      // Create new group if it didn't fit anywhere
      if (!fitted) {
        groups.push({
          paths: [info.path],
          totalTokens: info.tokens,
        });
      }

      processedPaths.add(info.path);
    }

    // Third pass: convert groups to split plan items
    for (const group of groups) {
      if (group.paths.length === 1) {
        plan.push(group.paths[0]);
      } else {
        // Find common ancestor for grouping
        const commonAncestor = findCommonAncestor(group.paths);
        if (commonAncestor) {
          plan.push(commonAncestor);
        } else {
          // No common ancestor, add each path individually
          plan.push(...group.paths);
        }
      }
    }

    return plan;
  }
}

/**
 * Find the deepest common ancestor path for a set of paths
 */
function findCommonAncestor(paths: string[]): string | null {
  if (paths.length === 0) return null;
  if (paths.length === 1) return paths[0];

  const pathParts = paths.map((path) => path.split('.'));
  const minLength = Math.min(...pathParts.map((parts) => parts.length));

  const commonParts: string[] = [];

  for (let i = 0; i < minLength; i++) {
    const part = pathParts[0][i];
    const allMatch = pathParts.every((parts) => parts[i] === part);

    if (allMatch) {
      commonParts.push(part);
    } else {
      break;
    }
  }

  return commonParts.length > 0 ? commonParts.join('.') : null;
}

/**
 * Default size-based suggestion function
 */
export function suggestDecompositionPlan(
  schema: ZodObject<Record<string, ZodType>>,
  options: SizeBasedOptions,
): SplitPlan {
  const strategy = new SizeBasedSuggestionStrategy();
  return strategy.suggest(schema, options);
}

/**
 * Registry of available suggestion strategies for future extensibility
 */
export class SuggestionStrategyRegistry {
  private strategies = new Map<string, SuggestionStrategy>();

  constructor() {
    // Register default strategies
    this.register(new SizeBasedSuggestionStrategy());
  }

  register(strategy: SuggestionStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  get(name: string): SuggestionStrategy | undefined {
    return this.strategies.get(name);
  }

  list(): string[] {
    return Array.from(this.strategies.keys());
  }

  suggest(
    strategyName: string,
    schema: ZodObject<Record<string, ZodType>>,
    options: unknown,
  ): SplitPlan {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown suggestion strategy: ${strategyName}`);
    }
    return strategy.suggest(schema, options);
  }
}

/**
 * Default registry instance
 */
export const defaultStrategyRegistry = new SuggestionStrategyRegistry();

/**
 * Convenience function that uses the default registry
 */
export function suggestWithStrategy(
  strategyName: string,
  schema: ZodObject<Record<string, ZodType>>,
  options: unknown,
): SplitPlan {
  return defaultStrategyRegistry.suggest(strategyName, schema, options);
}

/**
 * Future strategy example: Semantic-based suggestion
 * This could analyze schema property names, types, and relationships
 * to create more intelligent groupings
 */
export class SemanticSuggestionStrategy implements SuggestionStrategy {
  name = 'semantic';

  suggest(
    schema: ZodObject<Record<string, ZodType>>,
    _options?: unknown,
  ): SplitPlan {
    // TODO: Implement semantic analysis
    // Could analyze:
    // - Property name patterns (user*, profile*, settings*)
    // - Schema complexity and nesting depth
    // - Relationship indicators (foreign keys, references)
    // - Domain-specific patterns

    // For now, fall back to size-based strategy
    const sizeStrategy = new SizeBasedSuggestionStrategy();
    return sizeStrategy.suggest(schema, {
      maxTokensPerSchema: 1500,
      maxOptionsPerEnum: 50,
    });
  }
}
