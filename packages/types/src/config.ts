import { z } from 'zod';

export const McpWebConfigSchema = z.object({
  /** The name of the server. This is used to identify the server and is displayed in your AI App (e.g., Claude Desktop) */
  name: z.string().min(1).describe('The name of the server. This is used to identify the server and is displayed in your AI App (e.g., Claude Desktop)'),
  /** The description of the server. This should describe the web app you want the AI App to control. */
  description: z.string().min(1).describe('The description of the server. This should describe the web app you want the AI App to control.'),
  /** The bridge server address as host:port (e.g., 'localhost:3001' or 'bridge.example.com'). Protocol is determined automatically based on page context. */
  bridgeUrl: z
    .string()
    .optional()
    .default('localhost:3001')
    .transform((url) => url.replace(/^(wss?|https?):\/\//, ''))
    .describe('The bridge server address as host:port (e.g., \'localhost:3001\' or \'bridge.example.com\'). Protocol is determined automatically.'),
  /** Either a URL or a data URI like "data:image/png;base64,...". This is shown in the AI App. */
  icon: z.string().optional().describe('Either a URL or a data URI like "data:image/png;base64,...". This is shown in the AI App.'),
  /** The agent server address with optional path (e.g., 'localhost:3000' or 'localhost:3000/api/v1/query'). Protocol is determined automatically. Required for query support. */
  agentUrl: z
    .string()
    .optional()
    .transform((url) => url?.replace(/^(wss?|https?):\/\//, ''))
    .describe('The agent server address with optional path (e.g., \'localhost:3000\' or \'localhost:3000/api/v1/query\'). Protocol is determined automatically.'),
  /** Authentication token for the agent. If not provided, will use auto-generated token. */
  authToken: z.string().optional().describe('Authentication token for the agent. If not provided, will use auto-generated token.'),
  /** Whether to persist the auth token in localStorage. */
  persistAuthToken: z.boolean().optional().default(true).describe('Whether to persist the auth token in localStorage.'),
  /** Whether to automatically connect to the MCP bridge on initialization. */
  autoConnect: z.boolean().optional().default(true).describe('Whether to automatically connect to the MCP bridge on initialization.'),
  /** Maximum sessions allowed per auth token. When exceeded, behavior is determined by `onSessionLimitExceeded`. */
  maxSessionsPerToken: z.number().int().positive().optional().describe('Maximum sessions allowed per auth token.'),
  /** Behavior when session limit is exceeded. "reject" rejects new connections, "close_oldest" closes the oldest session. */
  onSessionLimitExceeded: z.enum(['reject', 'close_oldest']).optional().default('reject').describe('Behavior when session limit is exceeded.'),
  /** Maximum concurrent in-flight queries across all sessions for a token. Prevents resource exhaustion. */
  maxInFlightQueriesPerToken: z.number().int().positive().optional().describe('Maximum concurrent in-flight queries per token.'),
  /** Maximum session duration in milliseconds. Sessions older than this are automatically closed. */
  sessionMaxDurationMs: z.number().int().positive().optional().describe('Maximum session duration in milliseconds.'),
});

export type MCPWebConfig = z.input<typeof McpWebConfigSchema>;
export type MCPWebConfigOutput = z.infer<typeof McpWebConfigSchema>;
