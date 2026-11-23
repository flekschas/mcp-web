import { z } from 'zod';

/**
 * Zod schema for MCPWeb configuration.
 *
 * Validates and transforms configuration options for MCPWeb instances.
 * All URL fields are stripped of protocols as the protocol is determined
 * automatically based on the page context (http/https).
 */
export const McpWebConfigSchema = z.object({
  /** The name of the server. This is used to identify the server and is displayed in your AI App (e.g., Claude Desktop) */
  name: z
    .string()
    .min(1)
    .describe(
      'The name of the server. This is used to identify the server and is displayed in your AI App (e.g., Claude Desktop)',
    ),
  /** The description of the server. This should describe the web app you want the AI App to control. */
  description: z
    .string()
    .min(1)
    .describe(
      'The description of the server. This should describe the web app you want the AI App to control.',
    ),
  /** The bridge server address as host:port (e.g., 'localhost:3001' or 'bridge.example.com'). Protocol is determined automatically based on page context. */
  bridgeUrl: z
    .string()
    .optional()
    .transform((url) => url?.replace(/^(wss?|https?):\/\//, ''))
    .describe(
      "The bridge server address as host:port (e.g., 'localhost:3001' or 'bridge.example.com'). Protocol is determined automatically. Defaults to window.location.host in browser contexts, or localhost:3001 otherwise.",
    ),
  /** Either a URL or a data URI (e.g., "data:image/svg+xml;base64,..." or "data:image/png;base64,..."). This is shown in the AI App. */
  icon: z
    .string()
    .optional()
    .describe(
      'Either a URL or a data URI (e.g., "data:image/svg+xml;base64,..." or "data:image/png;base64,..."). This is shown in the AI App.',
    ),
  /**
   * The agent server address with optional path (e.g., 'localhost:3000',
   * 'localhost:3000/api/v1/query' or 'https://agent.example.com').
   *
   * Only the bridge calls this address, from the server side, where there is no
   * page context to take a protocol from. An explicit protocol is therefore
   * kept; a bare host falls back to `http://`.
   */
  agentUrl: z
    .string()
    .optional()
    .describe(
      "The agent server address with optional path (e.g., 'localhost:3000' or 'https://agent.example.com'). A bare host defaults to http://.",
    ),
  /** Authentication token for the agent. If not provided, will use auto-generated token. */
  authToken: z
    .string()
    .optional()
    .describe(
      'Authentication token for the agent. If not provided, will use auto-generated token.',
    ),
  /** Whether to persist the auth token in localStorage. */
  persistAuthToken: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to persist the auth token in localStorage.'),
  /** Whether to automatically connect to the MCP bridge on initialization. */
  autoConnect: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Whether to automatically connect to the MCP bridge on initialization.',
    ),
  /**
   * Disconnect from the bridge after this many milliseconds without requests
   * from AI or user interaction with the page. The next interaction reconnects.
   *
   * On hosted bridges, an open connection keeps the bridge running and billed,
   * so this stops a forgotten tab from running it all day. Best effort: a
   * browser can suspend a page's timers.
   */
  idleTimeoutMs: z
    .number()
    .int()
    .positive()
    // The longest delay `setTimeout` supports.
    .max(2 ** 31 - 1)
    .optional()
    .describe(
      'Disconnect after this many milliseconds without requests from AI or user interaction. The next interaction reconnects.',
    ),
  /** Maximum sessions allowed per auth token. When exceeded, behavior is determined by `onSessionLimitExceeded`. */
  maxSessionsPerToken: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum sessions allowed per auth token.'),
  /** Behavior when session limit is exceeded. "reject" rejects new connections, "close_oldest" closes the oldest session. */
  onSessionLimitExceeded: z
    .enum(['reject', 'close_oldest'])
    .optional()
    .default('reject')
    .describe('Behavior when session limit is exceeded.'),
  /** Maximum concurrent in-flight queries across all sessions for a token. Prevents resource exhaustion. */
  maxInFlightQueriesPerToken: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum concurrent in-flight queries per token.'),
  /** Maximum session duration in milliseconds. Sessions older than this are automatically closed. */
  sessionMaxDurationMs: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum session duration in milliseconds.'),
  /** Optional human-readable name for the session. Must be unique per auth token. Used to identify specific sessions when multiple are connected. */
  sessionName: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Optional human-readable name for the session. Must be unique per auth token. Used to identify specific sessions when multiple are connected.',
    ),
  /** Enable debug logging for MCP requests and responses. */
  debug: z
    .boolean()
    .optional()
    .default(false)
    .describe('Enable debug logging for MCP requests and responses.'),
});

/**
 * Input type for MCPWeb configuration.
 *
 * Use this type when creating new MCPWeb instances. All fields except
 * `name` and `description` have sensible defaults.
 *
 * @example
 * ```typescript
 * const config: MCPWebConfig = {
 *   name: 'My App',
 *   description: 'An AI-controllable web application',
 *   bridgeUrl: 'localhost:3001',
 * };
 * ```
 */
export type MCPWebConfig = z.input<typeof McpWebConfigSchema>;

/**
 * Output type for parsed MCPWeb configuration.
 *
 * This type represents the configuration after validation and transformation,
 * with all defaults applied. Used internally by MCPWeb instances.
 */
export type MCPWebConfigOutput = z.infer<typeof McpWebConfigSchema>;
