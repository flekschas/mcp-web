import type {
  ListPromptsResult,
  ListResourcesResult,
  ListToolsResult
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const McpRequestMetaParamsSchema = z.object({
  sessionId: z.string().optional(),
  queryId: z.string().optional(),
});

export type McpRequestMetaParams = z.infer<typeof McpRequestMetaParamsSchema>;

export interface AvailableSession {
  session_id: string;
  origin: string;
  page_title: string | undefined;
  connected_at: string;
  last_activity: string;
  available_tools: string[];
}

/**
 * Fatal error with no recoverable data.
 * These should be thrown/sent as JSON-RPC errors.
 */
export interface FatalError {
  error: string;              // Error code (e.g., "SessionNotFound")
  errorMessage: string;       // Human-readable description
  errorIsFatal: true;         // Discriminant
  errorDetails?: string;      // Optional additional context
}

/**
 * Recoverable error with partial data.
 * These should be returned in the JSON-RPC result with isError: true.
 * Includes [key: string]: unknown for context like availableSessions.
 */
export interface RecoverableError {
  isError: true;              // MCP-style soft error flag
  error: string;              // Error code (e.g., "SessionNotSpecified")
  errorMessage: string;       // Human-readable description
  errorIsFatal: false;        // Discriminant
  [key: string]: unknown;     // Context fields at top level for discoverability
}

/**
 * List tools result with recoverable error and session context.
 */
export type ErroredListToolsResult = ListToolsResult & RecoverableError & {
  availableSessions: AvailableSession[];
};

/**
 * List resources result with recoverable error and session context.
 */
export type ErroredListResourcesResult = ListResourcesResult & RecoverableError & {
  availableSessions: AvailableSession[];
};

/**
 * List prompts result with recoverable error and session context.
 */
export type ErroredListPromptsResult = ListPromptsResult & RecoverableError & {
  availableSessions: AvailableSession[];
};

/**
 * Type guard to check if a list result is an errored result.
 */
function hasIsError(result: ListToolsResult | ErroredListToolsResult | ListResourcesResult | ErroredListResourcesResult | ListPromptsResult | ErroredListPromptsResult) {
  return 'isError' in result && result.isError === true;
}

export function isErroredListToolsResult(result: ListToolsResult | ErroredListToolsResult): result is ErroredListToolsResult {
  return hasIsError(result);
}

export function isErroredListResourcesResult(result: ListResourcesResult | ErroredListResourcesResult): result is ErroredListResourcesResult {
  return hasIsError(result);
}

export function isErroredListPromptsResult(result: ListPromptsResult | ErroredListPromptsResult): result is ErroredListPromptsResult {
  return hasIsError(result);
}
