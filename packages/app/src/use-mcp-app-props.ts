import { useEffect, useState } from 'react';
import { useMCPAppContext } from './mcp-app-context.js';

/**
 * React hook to receive props from the MCP host via the ext-apps protocol.
 *
 * This hook connects to the host (e.g., Claude Desktop) using the
 * `@modelcontextprotocol/ext-apps` JSON-RPC protocol. It listens for
 * `tool-result` notifications, which contain the props returned by the
 * tool handler as JSON in `content[0].text`.
 *
 * Must be called within an {@link MCPAppProvider} (set up automatically
 * by {@link renderMCPApp}).
 *
 * @template T - The type of props expected from the handler
 * @returns The props object, or null if not yet received
 *
 * @example Basic Usage
 * ```tsx
 * import { useMCPAppProps } from '@mcp-web/app';
 *
 * interface MyAppProps {
 *   title: string;
 *   data: number[];
 * }
 *
 * function MyApp() {
 *   const props = useMCPAppProps<MyAppProps>();
 *
 *   if (!props) {
 *     return <div>Waiting for data...</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <h1>{props.title}</h1>
 *       <ul>
 *         {props.data.map((item, i) => (
 *           <li key={i}>{item}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With Default Props for Development
 * ```tsx
 * function MyApp() {
 *   const props = useMCPAppProps<MyAppProps>() ?? {
 *     title: 'Development Preview',
 *     data: [1, 2, 3],
 *   };
 *
 *   return <div>{props.title}</div>;
 * }
 * ```
 */
export function useMCPAppProps<T>(): T | null {
  const [props, setProps] = useState<T | null>(null);
  const { app } = useMCPAppContext();

  useEffect(() => {
    if (!app) return;

    // Listen for tool result - this is where our props come from.
    // The tool handler returns props which the bridge wraps into
    // CallToolResult.content[0].text as JSON.
    app.ontoolresult = async (result) => {
      if (result?.content) {
        for (const block of result.content) {
          if (block.type === 'text' && typeof block.text === 'string') {
            try {
              const parsed = JSON.parse(block.text);
              setProps(parsed as T);
            } catch {
              // If JSON parsing fails, treat the text as-is
              setProps(block.text as unknown as T);
            }
            return;
          }
        }
      }
    };

    // Also listen for tool input - useful for apps that need
    // the raw tool call arguments
    app.ontoolinput = async (input) => {
      // If we have arguments and no result yet, use them as initial props.
      // This enables apps to render immediately with the tool input
      // before the full result arrives.
      if (input?.arguments) {
        setProps((prev) => prev ?? (input.arguments as unknown as T));
      }
    };
  }, [app]);

  return props;
}

/**
 * Get the ext-apps `App` instance for advanced use cases.
 *
 * This hook provides access to the underlying `App` class from
 * `@modelcontextprotocol/ext-apps`, enabling bidirectional communication
 * with the host (e.g., calling server tools, sending messages).
 *
 * Must be called within an {@link MCPAppProvider} (set up automatically
 * by {@link renderMCPApp}).
 *
 * @returns The App state including app instance, connection status, and errors
 *
 * @example Calling a server tool from the app
 * ```tsx
 * import { useMCPApp } from '@mcp-web/app';
 *
 * function MyApp() {
 *   const { app, isConnected } = useMCPApp();
 *
 *   const handleClick = async () => {
 *     if (app) {
 *       const result = await app.callServerTool({
 *         name: 'update_data',
 *         arguments: { key: 'value' },
 *       });
 *       console.log('Server tool result:', result);
 *     }
 *   };
 *
 *   return <button onClick={handleClick}>Update</button>;
 * }
 * ```
 */
export function useMCPApp() {
  const { app, isConnected, error } = useMCPAppContext();
  return { app, isConnected, error };
}

/**
 * Get current MCP App props synchronously.
 *
 * @deprecated Use `useMCPAppProps` hook instead. This function is maintained
 * for backward compatibility but does not work with the ext-apps protocol.
 *
 * @template T - The type of props expected
 * @returns null (ext-apps protocol is async-only)
 */
export function getMCPAppProps<T>(): T | null {
  return null;
}

/**
 * Subscribe to MCP App props changes.
 *
 * @deprecated Use `useMCPAppProps` hook instead. This function is maintained
 * for backward compatibility but does not work with the ext-apps protocol.
 *
 * @template T - The type of props expected
 * @param _listener - Function called when props are received or updated
 * @returns No-op unsubscribe function
 */
export function subscribeMCPAppProps<T>(
  _listener: (props: T) => void
): () => void {
  return () => {};
}
