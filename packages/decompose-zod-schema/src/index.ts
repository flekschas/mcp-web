export { applyPartialUpdate } from './apply.js';
export { decomposeSchema } from './decompose.js';
export { PlanBuilder } from './plan-builder.js';
export {
  defaultStrategyRegistry,
  SemanticSuggestionStrategy,
  SizeBasedSuggestionStrategy,
  SuggestionStrategyRegistry,
  suggestDecompositionPlan,
  suggestWithStrategy,
} from './split-suggestions.js';
// Re-export all types
export type {
  DecomposedSchema,
  DecompositionOptions,
  SizeBasedOptions,
  Split,
  SplitPlan,
  SuggestionStrategy,
} from './types.js';
export { conditionalEnumSplit } from './utils.js';
export { validatePlan } from './validate.js';
