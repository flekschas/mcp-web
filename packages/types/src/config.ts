import { z } from 'zod';

export const McpWebConfigSchema = z.object({
  /** The name of the server. This is used to identify the server and is displayed in your AI App (e.g., Claude Desktop) */
  name: z.string().min(1).describe('The name of the server. This is used to identify the server and is displayed in your AI App (e.g., Claude Desktop)'),
  /** The description of the server. This should describe the web app you want the AI App to control. */
  description: z.string().min(1).describe('The description of the server. This should describe the web app you want the AI App to control.'),
  /** The hostname of the bridge server. */
  host: z.string().optional().default('localhost').describe('The URL of the bridge server.'),
  /** The WebSocket port of the bridge server (for frontend connections) */
  wsPort: z.number().int().min(1).max(65535).optional().default(3001).describe('The port for the WebSocket server (for frontend connections)'),
  /** The MCP server port of the bridge server (for client connections) */
  mcpPort: z.number().int().min(1).max(65535).optional().default(3002).describe('The MCP server port of the bridge server (for client connections)'),
  /** Either a URL or a data URI like "data:image/png;base64,...". This is shown in the AI App. */
  icon: z.string().optional().describe('Either a URL or a data URI like "data:image/png;base64,...". This is shown in the AI App.'),
  /** The URL of the agent server for frontend-triggered queries. Required for query support. */
  agentUrl: z.string().optional().describe('The URL of the agent server for frontend-triggered queries. Required for query support.'),
  /** Authentication token for the agent. If not provided, will use auto-generated token. */
  authToken: z.string().optional().describe('Authentication token for the agent. If not provided, will use auto-generated token.'),
  /** Whether to persist the auth token in localStorage. */
  persistAuthToken: z.boolean().optional().default(true).describe('Whether to persist the auth token in localStorage.'),
  /** Whether to automatically connect to the MCP bridge on initialization. */
  autoConnect: z.boolean().optional().default(true).describe('Whether to automatically connect to the MCP bridge on initialization.'),
});

export type MCPWebConfig = z.infer<typeof McpWebConfigSchema>;
export type MCPWebConfigInput = z.input<typeof McpWebConfigSchema>;
