import type { ComponentType } from 'react';
import { z } from 'zod';

/**
 * MIME type for MCP App resources, per the ext-apps specification (SEP-1865).
 * @see https://github.com/modelcontextprotocol/ext-apps
 */
export const RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';

/**
 * Handler function for an MCP App tool.
 * Returns props that will be passed to the app component.
 */
// biome-ignore lint/suspicious/noExplicitAny: Handler can accept/return anything
export type AppToolHandler = (input?: any) => any | Promise<any>;

/**
 * Zod schema for app definition validation.
 */
export const AppDefinitionSchema = z.object({
  /** Unique name for the app (also used as tool name) */
  name: z.string().min(1, 'App name is required'),
  /** Description of what the app does (shown to AI) */
  description: z.string().min(1, 'App description is required'),
  /** React component to render in the app */
  // biome-ignore lint/suspicious/noExplicitAny: Component can have any props type
  component: z.custom<ComponentType<any>>(
    (val) => typeof val === 'function',
    { message: 'Component must be a React component' }
  ),
  /** Input schema for the tool (Zod or JSON Schema) */
  inputSchema: z.custom<z.ZodObject<z.ZodRawShape> | Record<string, unknown>>(
    (val) => val === undefined || (val && typeof val === 'object'),
    { message: 'Must be a Zod schema or JSON Schema object' }
  ).optional(),
  /** Props schema for validating handler output */
  propsSchema: z.custom<z.ZodType | Record<string, unknown>>(
    (val) => val === undefined || (val && typeof val === 'object'),
    { message: 'Must be a Zod schema or JSON Schema object' }
  ).optional(),
  /** Handler function that returns props for the app */
  handler: z.custom<AppToolHandler>(
    (val) => typeof val === 'function',
    { message: 'Handler must be a function' }
  ),
  /** URL to fetch the app HTML from (defaults to /mcp-web-apps/{kebab-case-name}.html) */
  url: z.string().optional(),
  /** Resource URI for the app (defaults to ui://{name}/app.html) */
  resourceUri: z.string().optional(),
});

/**
 * App definition for registering MCP Apps with MCPWeb.
 *
 * An MCP App is a combination of:
 * 1. A tool that AI can call (returns props)
 * 2. A resource that provides the UI (HTML)
 *
 * When AI calls the tool, the handler returns props which are included
 * in the tool response with `_meta.ui.resourceUri`. The host then fetches
 * the resource HTML and renders it in an iframe, communicating via the
 * ext-apps JSON-RPC protocol (`@modelcontextprotocol/ext-apps`).
 *
 * @example Basic App
 * ```typescript
 * mcp.addApp({
 *   name: 'show_statistics',
 *   description: 'Display statistics visualization',
 *   handler: () => ({
 *     completionRate: 0.75,
 *     totalTasks: 100,
 *     completedTasks: 75,
 *   }),
 *   url: '/mcp-web-apps/statistics.html',
 * });
 * ```
 *
 * @example With Input Schema
 * ```typescript
 * mcp.addApp({
 *   name: 'show_chart',
 *   description: 'Display a chart with the given data',
 *   inputSchema: z.object({
 *     chartType: z.enum(['bar', 'line', 'pie']).describe('Type of chart'),
 *     title: z.string().describe('Chart title'),
 *   }),
 *   handler: ({ chartType, title }) => ({
 *     chartType,
 *     title,
 *     data: getChartData(),
 *   }),
 * });
 * ```
 */
export interface AppDefinition {
  /** Unique name for the app (also used as tool name) */
  name: string;
  /** Description of what the app does (shown to AI) */
  description: string;
  /** React component to render in the app */
  // biome-ignore lint/suspicious/noExplicitAny: Component can have any props type
  component: ComponentType<any>;
  /** Input schema for the tool (Zod or JSON Schema) */
  inputSchema?: z.ZodObject | Record<string, unknown>;
  /** Props schema for validating handler output */
  propsSchema?: z.ZodType | Record<string, unknown>;
  /** Handler function that returns props for the app */
  handler: AppToolHandler;
  /** URL to fetch the app HTML from (defaults to /mcp-web-apps/{name}.html) */
  url?: string;
  /** Resource URI for the app (defaults to ui://{name}/app.html) */
  resourceUri?: string;
}

/**
 * Internal processed app definition with resolved defaults.
 * @internal
 */
export interface ProcessedAppDefinition extends AppDefinition {
  /** Resolved URL (with default applied) */
  resolvedUrl: string;
  /** Resolved resource URI (with default applied) */
  resolvedResourceUri: string;
}

/**
 * Get default URL for an app.
 */
export function getDefaultAppUrl(name: string): string {
  return `/mcp-web-apps/${getAppFileName(name)}`;
}

/**
 * Name of the HTML file the Vite plugin builds for an app:
 * `'show_stats'` → `'show-stats.html'`.
 */
export function getAppFileName(name: string): string {
  const kebabName = name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
  return `${kebabName}.html`;
}

/**
 * Get default resource URI for an app.
 */
export function getDefaultAppResourceUri(name: string): string {
  return `ui://${name}/app.html`;
}

/**
 * A created app that can be registered with MCPWeb.
 *
 * Created apps are validated at creation time but not yet registered.
 * Use `mcpWeb.addApp(createdApp)` to register.
 */
export interface CreatedApp {
  /** Marker to identify this as a created app */
  readonly __brand: 'CreatedApp';
  /** The app definition for registration */
  readonly definition: AppDefinition;
}

/**
 * Type guard to check if a value is a CreatedApp.
 */
export function isCreatedApp(value: unknown): value is CreatedApp {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__brand' in value &&
    (value as CreatedApp).__brand === 'CreatedApp'
  );
}

/** Name of the bridge tool that opens the whole web app as an MCP App. */
export const MCP_APP_TOOL_NAME = 'open_app';

/** Resource URI of the view that shows the whole web app as an MCP App. */
export const MCP_APP_RESOURCE_URI = 'ui://mcp-web/page.html';

/**
 * Name of the `<meta>` tag that the bridge adds to the view it serves for
 * `mcpApp`. Only a page with it offers its tools to the host around it. The
 * view file itself has no mark, so a site that frames its public URL can't
 * use the tools.
 */
export const MCP_APP_VIEW_META_NAME = 'mcp-web-view';

/**
 * The page that `mcpApp` opens as an MCP App, such as `'index.html'`, or
 * `undefined` when `mcpApp` is off.
 */
export function getMCPAppPage(
  mcpApp: boolean | { page: string } | undefined,
): string | undefined {
  if (!mcpApp) return undefined;
  if (mcpApp === true) return 'index.html';
  return mcpApp.page.replace(/^(\.\/|\/)+/, '');
}

/**
 * Path of a page's view, relative to the directory that serves the web app's
 * static files: `'admin.html'` → `'mcp-web-apps/admin.html'`.
 */
export function getMCPAppViewPath(page: string): string {
  return `mcp-web-apps/${page}`;
}
