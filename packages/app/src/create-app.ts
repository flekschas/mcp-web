import { AppDefinitionSchema } from '@mcp-web/types';
import type { ComponentType } from 'react';
import type { z } from 'zod';

/**
 * Extract props type from a React component.
 */
// biome-ignore lint/suspicious/noExplicitAny: Need any for component props extraction
type ComponentProps<T> = T extends ComponentType<infer P> ? P : any;

/**
 * Configuration for creating an MCP App.
 *
 * An MCP App combines a tool (that AI can call) with a visual component
 * (rendered in an iframe). The handler returns props that are passed to
 * your React component via postMessage.
 *
 * The component's props type is used to ensure type safety - the handler
 * must return props that match what the component expects.
 *
 * @template TComponent - React component type
 * @template TInput - Zod schema type for tool input parameters
 *
 * @example
 * ```typescript
 * import { Statistics } from './components/Statistics';
 *
 * const statsApp = createApp({
 *   name: 'show_stats',
 *   description: 'Display statistics visualization',
 *   component: Statistics,
 *   handler: () => ({
 *     completionRate: 0.75,
 *     totalTasks: 100,
 *   }),
 * });
 * ```
 */
export interface CreateAppConfig<
  // biome-ignore lint/suspicious/noExplicitAny: Component can have any props
  TComponent extends ComponentType<any> = ComponentType<any>,
  TInput extends z.ZodObject | undefined = undefined,
> {
  /** Unique name for the app (also used as tool name) */
  name: string;
  /** Description of what the app does (shown to AI) */
  description: string;
  /** React component to render - handler must return props matching this component */
  component: TComponent;
  /** Optional Zod schema for validating tool input */
  inputSchema?: TInput;
  /** Optional Zod schema for validating props output */
  propsSchema?: z.ZodType<ComponentProps<TComponent>>;
  /** Handler function that returns props for the component */
  handler: TInput extends z.ZodObject
    ? (
        input: z.infer<TInput>
      ) => ComponentProps<TComponent> | Promise<ComponentProps<TComponent>>
    : () => ComponentProps<TComponent> | Promise<ComponentProps<TComponent>>;
  /** URL to fetch the app HTML from (defaults to /mcp-web-apps/{kebab-case-name}.html) */
  url?: string;
  /** Resource URI for the app (defaults to ui://{name}/app.html) */
  resourceUri?: string;
}

/**
 * A created app ready for registration with MCPWeb.
 *
 * Created apps are validated at creation time but not yet active.
 * Register with `mcp.addApp(app)` or the `useMCPApps()` hook to make
 * the tool available to AI.
 *
 * @template TComponent - React component type
 * @template TInput - Zod schema type for tool input parameters
 *
 * @example
 * ```typescript
 * const statsApp = createApp({ ... });
 *
 * // Register directly
 * mcp.addApp(statsApp);
 *
 * // Or via React hook
 * useMCPApps(statsApp);
 * ```
 */
export interface CreatedApp<
  // biome-ignore lint/suspicious/noExplicitAny: Component can have any props
  TComponent extends ComponentType<any> = ComponentType<any>,
  TInput extends z.ZodObject | undefined = undefined,
> {
  /** Marker to identify this as a created app */
  readonly __brand: 'CreatedApp';
  /** The app definition for registration */
  readonly definition: {
    name: string;
    description: string;
    component: TComponent;
    inputSchema?: TInput;
    propsSchema?: z.ZodType<ComponentProps<TComponent>>;
    handler: CreateAppConfig<TComponent, TInput>['handler'];
    url?: string;
    resourceUri?: string;
  };
  /** The original config for type inference */
  readonly config: CreateAppConfig<TComponent, TInput>;
}

/**
 * Creates an MCP App definition without registering it.
 *
 * MCP Apps combine a tool (that AI can call to get props) with a visual
 * React component. When AI calls the tool, the handler returns props which
 * are passed to the component via postMessage.
 *
 * The Vite plugin automatically generates entry files for your apps, so you
 * only need to define the app configuration:
 *
 * ```typescript
 * // src/mcp-apps.ts
 * import { createApp } from '@mcp-web/app';
 * import { Statistics } from './components/Statistics';
 *
 * export const statisticsApp = createApp({
 *   name: 'show_statistics',
 *   description: 'Display statistics visualization',
 *   component: Statistics,
 *   handler: () => ({
 *     completionRate: 0.75,
 *     totalTasks: 100,
 *   }),
 * });
 * ```
 *
 * @example With Input Schema
 * ```typescript
 * import { createApp } from '@mcp-web/app';
 * import { z } from 'zod';
 * import { Chart } from './components/Chart';
 *
 * export const chartApp = createApp({
 *   name: 'show_chart',
 *   description: 'Display a chart with the given data',
 *   component: Chart,
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
export function createApp<
  // biome-ignore lint/suspicious/noExplicitAny: Component can have any props
  TComponent extends ComponentType<any>,
  TInput extends z.ZodObject | undefined = undefined,
>(
  config: CreateAppConfig<TComponent, TInput>
): CreatedApp<TComponent, TInput> {
  // Validate at creation time
  const validationResult = AppDefinitionSchema.safeParse(config);
  if (!validationResult.success) {
    throw new Error(
      `Invalid app definition: ${validationResult.error.message}`
    );
  }

  return {
    __brand: 'CreatedApp' as const,
    definition: {
      name: config.name,
      description: config.description,
      component: config.component,
      inputSchema: config.inputSchema,
      propsSchema: config.propsSchema,
      handler: config.handler,
      url: config.url,
      resourceUri: config.resourceUri,
    },
    config,
  };
}

/**
 * Type guard to check if a value is a CreatedApp.
 *
 * Useful for validating values passed to `addApp()` or for runtime checks.
 *
 * @param value - The value to check
 * @returns True if the value is a CreatedApp instance
 *
 * @example
 * ```typescript
 * import { createApp, isCreatedApp } from '@mcp-web/app';
 *
 * const maybeApp = getAppFromSomewhere();
 * if (isCreatedApp(maybeApp)) {
 *   mcp.addApp(maybeApp);
 * }
 * ```
 */
export function isCreatedApp(value: unknown): value is CreatedApp {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__brand' in value &&
    (value as CreatedApp).__brand === 'CreatedApp'
  );
}
