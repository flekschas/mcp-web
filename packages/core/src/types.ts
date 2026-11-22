import type { ToolDefinition, ToolDefinitionZod } from '@mcp-web/types';
import type { z } from 'zod';
import type {
  ContextItemSchema,
  EphemeralContextSchema,
  QueryRequestSchema,
  QueryResponseResultAcceptedSchema,
  QueryResponseResultCompleteSchema,
  QueryResponseResultFailureSchema,
  QueryResponseResultProgressSchema,
  QueryResponseResultSchema,
} from './schemas.js';

export type QueryResponseResult = z.infer<typeof QueryResponseResultSchema>;
export type QueryRequest = Omit<z.input<typeof QueryRequestSchema>, 'responseTool' | 'tools' | 'context'> & {
  responseTool?: ToolDefinition;
  tools?: ToolDefinition[];
  context?: (ToolDefinition | EphemeralContext)[];
};
export type QueryRequestOutput = z.infer<typeof QueryRequestSchema>;
export type QueryResponseResultAccepted = z.infer<typeof QueryResponseResultAcceptedSchema>;
export type QueryResponseResultProgress = z.infer<typeof QueryResponseResultProgressSchema>;
export type QueryResponseResultComplete = z.infer<typeof QueryResponseResultCompleteSchema>;
export type QueryResponseResultFailure = z.infer<typeof QueryResponseResultFailureSchema>;
export type ContextItem = z.infer<typeof ContextItemSchema>;
export type EphemeralContext = z.infer<typeof EphemeralContextSchema>;

/**
 * A code tool, such as a `CodeTool` from `@mcp-web/tools/code`: a tool, with
 * the lookup tool that returns its function signatures when it has one.
 */
export type CodeToolLike = ToolDefinitionZod & {
  lookupTool?: ToolDefinitionZod | null;
};
