// Export query-related types

export { QueryResponse } from './query.js';
// Export schema helper functions for expanded tools
export { id, system } from './tool-generators/index.js';
// Export state grouping helper
export { groupState } from './group-state.js';
export type { StateTriple, StateTriples, GroupedState } from './group-state.js';
export type {
  ContextItem,
  EphemeralContext,
  QueryRequest,
  QueryResponseResult,
  QueryResponseResultAccepted,
  QueryResponseResultComplete,
  QueryResponseResultFailure,
  QueryResponseResultProgress,
} from './types.js';
export * from './utils.js';
export { MCPWeb } from './web.js';

// Export tool creation functions (Jotai-style pattern)
export { createTool, isCreatedTool } from './create-tool.js';
export type { CreateToolConfig, CreatedTool } from './create-tool.js';
export { createStateTools, isCreatedStateTools } from './create-state-tools.js';
export type {
  CreateStateToolsConfig,
  CreatedStateTools,
  CreatedStateToolsBasic,
  CreatedStateToolsExpanded,
} from './create-state-tools.js';

// Re-export app-related types from @mcp-web/types for convenience
export { isCreatedApp } from '@mcp-web/types';
export type { AppDefinition, CreatedApp } from '@mcp-web/types';
