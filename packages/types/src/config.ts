import { z } from 'zod';

/**
 * Domains an MCP App view may reach, which the host allows in its content
 * security policy. Without them, the view can't use the network.
 */
export const McpAppCspSchema = z.object({
  /** Origins for `fetch`, XHR and WebSocket, such as `'https://api.example.com'`. */
  connectDomains: z.array(z.string()).optional(),
  /** Origins for images, scripts, stylesheets, fonts and media. */
  resourceDomains: z.array(z.string()).optional(),
  /** Origins for frames in the view. */
  frameDomains: z.array(z.string()).optional(),
  /** Allowed base URIs of the view. */
  baseUriDomains: z.array(z.string()).optional(),
});

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
  /**
   * Version of the app, such as `version` from its `package.json`. Shown to
   * the host when the page runs as an MCP App view.
   */
  version: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Version of the app, shown to the host when the page runs as an MCP App view.',
    ),
  /**
   * Lets AI open the whole web app as an MCP App, for example in a Claude
   * chat. `true` opens `index.html`; for another page, pass its path as
   * `{ page: 'admin.html' }`. Write the value inline, in a plain config file
   * such as `mcp-web.config.ts`, as the Vite plugin of `@mcp-web/app` reads
   * it from the source to know which pages to build.
   *
   * The bridge then offers an `open_app` tool, also while no browser tab is
   * connected. In the opened view, MCP-Web offers its tools to the host as
   * app tools instead of connecting to the bridge.
   *
   * The view is a new copy of the app, separate from any browser tab:
   * - It starts from the app's initial state.
   * - It runs on the host's origin, so it has none of the site's cookies or
   *   storage, and relative URLs such as `/api/todos` point at the host.
   * - It can't reach the network, except for the domains listed in `csp`,
   *   such as `{ page: 'index.html', csp: { connectDomains:
   *   ['https://api.example.com'] } }`. Files it loads by URL, such as
   *   images in `public/`, need their domain in `csp.resourceDomains`; files
   *   it imports are part of the view.
   * - The page must not create its own ext-apps `App`, as MCP-Web already
   *   connects to the host.
   *
   * The view also sends the state of `addStateTools()` states to the host for
   * the model, after tool calls and after user input in the view. A state
   * that changes otherwise, such as when a fetch finishes, reaches the model
   * with the next of these.
   */
  mcpApp: z
    .union([
      z.boolean(),
      z.object({
        page: z
          .string()
          .regex(/\.html$/, 'Must be an HTML file, such as admin.html')
          .refine(
            (page) => !page.split('/').includes('..'),
            'Must be inside the project',
          ),
        /**
         * Domains the view may reach, such as
         * `{ connectDomains: ['https://api.example.com'] }`.
         */
        csp: McpAppCspSchema.optional(),
      }),
    ])
    .optional()
    .describe(
      "Lets AI open the whole web app as an MCP App. `true` opens index.html; `{ page: 'admin.html' }` opens another page.",
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
  /**
   * Whether to connect on initialization, to the bridge or, in an MCP App
   * view, to the host.
   */
  autoConnect: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Whether to connect on initialization, to the bridge or, in an MCP App view, to the host.',
    ),
  /**
   * In a view opened through `mcpApp`, MCP-Web offers its tools to the host
   * as app tools instead of connecting to the bridge. Set this to connect to
   * the bridge there too. The bridge is needed for `query()` and for tools
   * added with `addApp()`, which are not offered as app tools.
   *
   * The view runs on the host's origin, so it then needs `bridgeUrl`, the
   * bridge in `mcpApp.csp.connectDomains`, and the `authToken` of the MCP
   * client. The view still does the handshake with the host, but offers it
   * no tools.
   */
  disableAppTools: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Always connect to the bridge, even in a view opened through `mcpApp`.',
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

/** Domains an MCP App view may reach. See `McpAppCspSchema`. */
export type MCPAppCsp = z.infer<typeof McpAppCspSchema>;

/**
 * Output type for parsed MCPWeb configuration.
 *
 * This type represents the configuration after validation and transformation,
 * with all defaults applied. Used internally by MCPWeb instances.
 */
export type MCPWebConfigOutput = z.infer<typeof McpWebConfigSchema>;
