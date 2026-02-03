import { useEffect, useState } from 'react';

declare global {
  interface Window {
    __MCP_APP_PROPS__: unknown;
    __MCP_APP_PROPS_LISTENERS__: Array<(props: unknown) => void>;
    __MCP_APP_SUBSCRIBE__: (listener: (props: unknown) => void) => () => void;
  }
}

/**
 * React hook to receive props from the MCP host.
 *
 * This hook subscribes to the props passed via postMessage from the
 * MCP host (e.g., Claude Desktop). The props are the values returned
 * by your app's handler function when the AI calls the tool.
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
  const [props, setProps] = useState<T | null>(() => {
    // Check if props are already available (e.g., from SSR or fast load)
    if (typeof window !== 'undefined' && window.__MCP_APP_PROPS__) {
      return window.__MCP_APP_PROPS__ as T;
    }
    return null;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.__MCP_APP_SUBSCRIBE__) {
      return;
    }

    const unsubscribe = window.__MCP_APP_SUBSCRIBE__((newProps) => {
      setProps(newProps as T);
    });

    return unsubscribe;
  }, []);

  return props;
}

/**
 * Get current MCP App props synchronously.
 *
 * This is useful for non-React code that needs to access props.
 * Returns null if props haven't been received yet.
 *
 * @template T - The type of props expected
 * @returns The props object, or null if not yet received
 *
 * @example
 * ```ts
 * const props = getMCPAppProps<MyAppProps>();
 * if (props) {
 *   console.log('Received props:', props);
 * }
 * ```
 */
export function getMCPAppProps<T>(): T | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return (window.__MCP_APP_PROPS__ as T) ?? null;
}

/**
 * Subscribe to MCP App props changes.
 *
 * This is useful for non-React code that needs to react to prop changes.
 *
 * @template T - The type of props expected
 * @param listener - Function called when props are received or updated
 * @returns Unsubscribe function
 *
 * @example
 * ```ts
 * const unsubscribe = subscribeMCPAppProps<MyAppProps>((props) => {
 *   console.log('Props updated:', props);
 * });
 *
 * // Later, to stop listening:
 * unsubscribe();
 * ```
 */
export function subscribeMCPAppProps<T>(listener: (props: T) => void): () => void {
  if (typeof window === 'undefined' || !window.__MCP_APP_SUBSCRIBE__) {
    return () => {};
  }
  return window.__MCP_APP_SUBSCRIBE__((props) => listener(props as T));
}
