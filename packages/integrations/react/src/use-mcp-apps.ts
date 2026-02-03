import type { MCPWeb } from '@mcp-web/core';
import type { AppDefinition, CreatedApp } from '@mcp-web/types';
import { isCreatedApp } from '@mcp-web/types';
import { useContext, useEffect, useRef } from 'react';
import { MCPWebContext } from './mcp-web-context';

/**
 * An app that can be registered with useApps.
 * Can be a CreatedApp or a raw AppDefinition.
 */
export type RegisterableApp = CreatedApp | AppDefinition;

/**
 * Hook for registering MCP Apps with automatic cleanup on unmount.
 *
 * This is the recommended way to register MCP Apps in React applications.
 * Apps are registered when the component mounts and automatically
 * unregistered when the component unmounts.
 *
 * MCP Apps are visual UI components that AI can render inline in chat
 * interfaces like Claude Desktop.
 *
 * @example Basic usage with createApp
 * ```tsx
 * // apps.ts
 * import { createApp } from '@mcp-web/app';
 *
 * export const statisticsApp = createApp({
 *   name: 'show_statistics',
 *   description: 'Display statistics visualization',
 *   handler: () => ({
 *     totalTasks: todos.length,
 *     completedTasks: completedTodos.length,
 *   }),
 * });
 *
 * // App.tsx
 * import { useMCPApps } from '@mcp-web/react';
 * import { statisticsApp } from './apps';
 *
 * function App() {
 *   useMCPApps(statisticsApp);
 *   return <div>...</div>;
 * }
 * ```
 *
 * @example Multiple apps
 * ```tsx
 * function App() {
 *   useMCPApps(statisticsApp, chartApp, dashboardApp);
 *   return <div>...</div>;
 * }
 * ```
 *
 * @example Conditional app registration
 * ```tsx
 * function Analytics() {
 *   // This app only exists while Analytics is mounted
 *   useMCPApps(analyticsApp);
 *   return <div>Analytics enabled</div>;
 * }
 * ```
 *
 * @param apps - Apps to register (variadic or array)
 */
export function useMCPApps(
  ...apps: (RegisterableApp | RegisterableApp[])[]
): void;

export function useMCPApps(
  mcpWeb: MCPWeb,
  ...apps: (RegisterableApp | RegisterableApp[])[]
): void;

export function useMCPApps(
  firstArg: MCPWeb | RegisterableApp | RegisterableApp[],
  ...rest: (RegisterableApp | RegisterableApp[])[]
): void {
  // Determine if first arg is MCPWeb instance or an app
  const isMCPWebInstance = (value: unknown): value is MCPWeb =>
    typeof value === 'object' &&
    value !== null &&
    'addApp' in value &&
    'removeApp' in value &&
    typeof (value as MCPWeb).addApp === 'function';

  let mcpWebProp: MCPWeb | undefined;
  let appsToRegister: RegisterableApp[];

  if (isMCPWebInstance(firstArg)) {
    mcpWebProp = firstArg;
    appsToRegister = rest.flat();
  } else {
    mcpWebProp = undefined;
    appsToRegister = [firstArg, ...rest].flat();
  }

  // Try to get from context if not provided
  const context = useContext(MCPWebContext);
  const mcpWeb = mcpWebProp ?? context?.mcpWeb;

  if (!mcpWeb) {
    throw new Error(
      'useApps requires either mcpWeb as first argument or MCPWebProvider in component tree'
    );
  }

  // Keep a stable reference to the apps array
  const appsRef = useRef(appsToRegister);
  appsRef.current = appsToRegister;

  // Keep a stable reference to mcpWeb
  const mcpWebRef = useRef(mcpWeb);
  mcpWebRef.current = mcpWeb;

  useEffect(() => {
    const cleanupFns: (() => void)[] = [];
    const mcp = mcpWebRef.current;

    for (const app of appsRef.current) {
      if (isCreatedApp(app)) {
        // Register CreatedApp
        mcp.addApp(app);
        cleanupFns.push(() => mcp.removeApp(app.definition.name));
      } else {
        // Register raw AppDefinition
        mcp.addApp(app);
        cleanupFns.push(() => mcp.removeApp(app.name));
      }
    }

    return () => {
      for (const cleanup of cleanupFns) {
        cleanup();
      }
    };
  }, []);
  // Note: Empty deps because we use refs - apps are registered once on mount
  // and cleaned up on unmount. If you need to re-register on app change,
  // use a key prop on the component.
}
