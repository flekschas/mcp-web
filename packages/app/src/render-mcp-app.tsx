import type { ComponentType } from 'react';
import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { useMCPAppProps } from './use-mcp-app-props.js';

/**
 * Options for rendering an MCP App.
 */
export interface RenderMCPAppOptions {
  /**
   * Component to show while waiting for props.
   * @default A simple "Loading..." div
   */
  loading?: ComponentType;

  /**
   * ID of the root element to mount the app.
   * @default 'root'
   */
  rootId?: string;

  /**
   * Whether to wrap the app in React.StrictMode.
   * @default true
   */
  strictMode?: boolean;
}

/**
 * Default loading component shown while waiting for props.
 */
function DefaultLoading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        fontFamily: 'system-ui, sans-serif',
        color: '#666',
      }}
    >
      Loading...
    </div>
  );
}

/**
 * Internal wrapper that handles props subscription.
 */
function MCPAppWrapper<P extends Record<string, unknown>>({
  Component,
  Loading,
}: {
  Component: ComponentType<P>;
  Loading: ComponentType;
}) {
  const props = useMCPAppProps<P>();

  if (!props) {
    return <Loading />;
  }

  return <Component {...props} />;
}

/**
 * Render a React component as an MCP App.
 *
 * This helper sets up the React root and handles props subscription,
 * so your component can be a regular React component that receives props -
 * no MCP-specific code required in your component.
 *
 * @param Component - Your React component (receives props from the MCP handler)
 * @param options - Optional configuration for loading state and root element
 *
 * @example Basic usage with an existing component
 * ```tsx
 * // src/apps/stats.tsx
 * import { renderMCPApp } from '@mcp-web/app';
 * import { Stats } from '../components/Stats';
 *
 * // Stats is a regular component: function Stats({ total, completed }: StatsProps) { ... }
 * renderMCPApp(Stats);
 * ```
 *
 * @example With custom loading component
 * ```tsx
 * import { renderMCPApp } from '@mcp-web/app';
 * import { Stats } from '../components/Stats';
 * import { Spinner } from '../components/Spinner';
 *
 * renderMCPApp(Stats, {
 *   loading: Spinner,
 * });
 * ```
 *
 * @example Inline component definition
 * ```tsx
 * import { renderMCPApp } from '@mcp-web/app';
 *
 * interface ChartProps {
 *   data: number[];
 *   title: string;
 * }
 *
 * renderMCPApp<ChartProps>(({ data, title }) => (
 *   <div>
 *     <h1>{title}</h1>
 *     <Chart data={data} />
 *   </div>
 * ));
 * ```
 */
export function renderMCPApp<P extends Record<string, unknown>>(
  Component: ComponentType<P>,
  options: RenderMCPAppOptions = {}
): void {
  const { loading: Loading = DefaultLoading, rootId = 'root', strictMode = true } = options;

  const rootElement = document.getElementById(rootId);
  if (!rootElement) {
    throw new Error(
      `[renderMCPApp] Could not find element with id "${rootId}". ` +
        `Make sure your HTML has <div id="${rootId}"></div>`
    );
  }

  const app = (
    <Suspense fallback={<Loading />}>
      <MCPAppWrapper Component={Component} Loading={Loading} />
    </Suspense>
  );

  createRoot(rootElement).render(strictMode ? <StrictMode>{app}</StrictMode> : app);
}
