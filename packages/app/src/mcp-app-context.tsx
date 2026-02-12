import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { useApp, useHostStyles, useDocumentTheme } from '@modelcontextprotocol/ext-apps/react';
import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';

/**
 * Value provided by `MCPAppProvider`.
 *
 * Contains the ext-apps `App` instance, connection state, and the
 * current host context (theme, styles, display mode, locale, etc.).
 */
export interface MCPAppContextValue {
  /** The connected ext-apps `App` instance, null during initialization */
  app: App | null;
  /** Whether initialization completed successfully */
  isConnected: boolean;
  /** Connection error if initialization failed, null otherwise */
  error: Error | null;
  /** Current host context, undefined until connected */
  hostContext: McpUiHostContext | undefined;
}

const MCPAppContext = createContext<MCPAppContextValue | null>(null);

/**
 * Provider that creates the ext-apps `App` instance and applies host styles.
 *
 * This provider:
 * - Creates and manages the `App` connection via `useApp()`
 * - Automatically applies the host's CSS custom properties, theme, and fonts
 * - Tracks host context changes (theme toggles, display mode changes, etc.)
 * - Makes the app instance and host context available to child components
 *
 * @internal Used by `renderMCPApp` — not typically used directly.
 */
export function MCPAppProvider({ children }: { children: ReactNode }) {
  const [hostContext, setHostContext] = useState<
    McpUiHostContext | undefined
  >(undefined);

  const onAppCreated = useCallback((app: App) => {
    app.onhostcontextchanged = (params) => {
      setHostContext((prev) => ({ ...prev, ...params }));
    };
  }, []);

  const { app, isConnected, error } = useApp({
    appInfo: {
      name: 'mcp-web-app',
      version: '0.1.0',
    },
    capabilities: {},
    onAppCreated,
  });

  // Capture initial host context once connected
  const initialContext = app?.getHostContext();
  if (initialContext && !hostContext) {
    setHostContext(initialContext);
  }

  // Automatically apply host CSS variables, theme, and fonts
  useHostStyles(app, initialContext);

  return (
    <MCPAppContext.Provider
      value={{ app, isConnected, error, hostContext }}
    >
      {children}
    </MCPAppContext.Provider>
  );
}

/**
 * Access the full MCP App context including the app instance and host context.
 *
 * Must be called within an `MCPAppProvider` (which is set up automatically
 * by `renderMCPApp`).
 *
 * @returns The context value with app, connection state, and host context
 * @throws If called outside of an MCPAppProvider
 *
 * @internal Used by `useMCPAppProps` and `useMCPApp`.
 */
export function useMCPAppContext(): MCPAppContextValue {
  const ctx = useContext(MCPAppContext);
  if (!ctx) {
    throw new Error(
      'useMCPAppContext must be used within an MCPAppProvider. ' +
        'If you are using renderMCPApp(), this is set up automatically. ' +
        'Otherwise, wrap your component tree with <MCPAppProvider>.'
    );
  }
  return ctx;
}

/**
 * Get the current host context from the MCP host application.
 *
 * Returns the full `McpUiHostContext` from the host (e.g., Claude Desktop),
 * which includes theme, styles, display mode, locale, container dimensions,
 * and more. The value updates automatically when the host sends
 * `host-context-changed` notifications.
 *
 * Must be called within an `MCPAppProvider` (set up automatically
 * by `renderMCPApp`).
 *
 * @returns The current host context, or undefined if not yet connected
 *
 * @example Access host display mode
 * ```tsx
 * import { useMCPHostContext } from '@mcp-web/app';
 *
 * function MyApp() {
 *   const hostContext = useMCPHostContext();
 *
 *   return (
 *     <div>
 *       <p>Display mode: {hostContext?.displayMode}</p>
 *       <p>Platform: {hostContext?.platform}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMCPHostContext(): McpUiHostContext | undefined {
  return useMCPAppContext().hostContext;
}

/**
 * Get the current theme preference from the MCP host application.
 *
 * Returns `"light"` or `"dark"` based on the host's current theme.
 * Updates reactively when the user toggles theme in the host.
 *
 * This hook reads the theme from the `data-theme` attribute on
 * `document.documentElement`, which is set automatically by the
 * host styles system. It uses a `MutationObserver` internally so
 * it will re-render your component whenever the theme changes.
 *
 * Must be called within an `MCPAppProvider` (set up automatically
 * by `renderMCPApp`).
 *
 * @returns The current theme — `"light"` or `"dark"`
 *
 * @example Sync with Tailwind CSS dark mode
 * ```tsx
 * import { useMCPHostTheme } from '@mcp-web/app';
 * import { useEffect } from 'react';
 *
 * function MyApp(props: MyProps) {
 *   const theme = useMCPHostTheme();
 *
 *   useEffect(() => {
 *     document.documentElement.classList.toggle('dark', theme === 'dark');
 *   }, [theme]);
 *
 *   return (
 *     <div className="bg-white dark:bg-gray-900">
 *       {props.children}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Conditional rendering based on theme
 * ```tsx
 * import { useMCPHostTheme } from '@mcp-web/app';
 *
 * function Logo() {
 *   const theme = useMCPHostTheme();
 *   return <img src={theme === 'dark' ? '/logo-light.svg' : '/logo-dark.svg'} />;
 * }
 * ```
 */
export function useMCPHostTheme() {
  return useDocumentTheme();
}
