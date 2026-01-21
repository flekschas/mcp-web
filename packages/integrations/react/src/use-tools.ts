import type { CreatedStateTools, CreatedTool, MCPWeb } from '@mcp-web/core';
import { isCreatedStateTools, isCreatedTool } from '@mcp-web/core';
import type { ToolDefinition } from '@mcp-web/types';
import { useContext, useEffect, useRef } from 'react';
import { MCPWebContext } from './mcp-web-context';

/**
 * A tool that can be registered with useTools.
 * Can be a CreatedTool, CreatedStateTools, or a raw ToolDefinition.
 */
export type RegisterableTool =
  | CreatedTool
  // biome-ignore lint/suspicious/noExplicitAny: Need any to handle variance in generic state types
  | CreatedStateTools<any>
  | ToolDefinition;

/**
 * Hook for registering pre-created tools with automatic cleanup on unmount.
 *
 * This is the recommended way to register tools in React applications.
 * Tools are registered when the component mounts and automatically
 * unregistered when the component unmounts.
 *
 * @example Basic usage with created tools
 * ```tsx
 * // tools.ts
 * import { createTool, createStateTools } from '@mcp-web/core';
 *
 * export const timeTool = createTool({
 *   name: 'get_time',
 *   description: 'Get current time',
 *   handler: () => new Date().toISOString(),
 * });
 *
 * export const todoTools = createStateTools({
 *   name: 'todos',
 *   description: 'Todo list',
 *   get: () => store.get(todosAtom),
 *   set: (value) => store.set(todosAtom, value),
 *   schema: TodosSchema,
 *   expand: true,
 * });
 *
 * // App.tsx
 * import { useTools } from '@mcp-web/react';
 * import { timeTool, todoTools } from './tools';
 *
 * function App() {
 *   useTools(timeTool, todoTools);
 *   return <div>...</div>;
 * }
 * ```
 *
 * @example Conditional tool registration
 * ```tsx
 * function AdminPanel() {
 *   // These tools only exist while AdminPanel is mounted
 *   useTools(adminTools);
 *   return <div>Admin controls</div>;
 * }
 *
 * function App() {
 *   const [isAdmin, setIsAdmin] = useState(false);
 *   return (
 *     <div>
 *       {isAdmin && <AdminPanel />}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With array of tools
 * ```tsx
 * const allTools = [todoTools, projectTools, settingsTools];
 *
 * function App() {
 *   useTools(allTools);
 *   // or: useTools(...allTools);
 *   return <div>...</div>;
 * }
 * ```
 *
 * @param tools - Tools to register (variadic or array)
 */
export function useTools(
  ...tools: (RegisterableTool | RegisterableTool[])[]
): void;

export function useTools(
  mcpWeb: MCPWeb,
  ...tools: (RegisterableTool | RegisterableTool[])[]
): void;

export function useTools(
  firstArg: MCPWeb | RegisterableTool | RegisterableTool[],
  ...rest: (RegisterableTool | RegisterableTool[])[]
): void {
  // Determine if first arg is MCPWeb instance or a tool
  const isMCPWebInstance = (value: unknown): value is MCPWeb =>
    typeof value === 'object' &&
    value !== null &&
    'addTool' in value &&
    'addStateTools' in value &&
    typeof (value as MCPWeb).addTool === 'function';

  let mcpWebProp: MCPWeb | undefined;
  let toolsToRegister: RegisterableTool[];

  if (isMCPWebInstance(firstArg)) {
    mcpWebProp = firstArg;
    toolsToRegister = rest.flat();
  } else {
    mcpWebProp = undefined;
    toolsToRegister = [firstArg, ...rest].flat();
  }

  // Try to get from context if not provided
  const context = useContext(MCPWebContext);
  const mcpWeb = mcpWebProp ?? context?.mcpWeb;

  if (!mcpWeb) {
    throw new Error(
      'useTools requires either mcpWeb as first argument or MCPWebProvider in component tree'
    );
  }

  // Keep a stable reference to the tools array
  const toolsRef = useRef(toolsToRegister);
  toolsRef.current = toolsToRegister;

  // Keep a stable reference to mcpWeb
  const mcpWebRef = useRef(mcpWeb);
  mcpWebRef.current = mcpWeb;

  useEffect(() => {
    const cleanupFns: (() => void)[] = [];
    const mcp = mcpWebRef.current;

    for (const tool of toolsRef.current) {
      if (isCreatedTool(tool)) {
        // Register CreatedTool
        mcp.addTool(tool);
        cleanupFns.push(() => mcp.removeTool(tool.definition.name));
      } else if (isCreatedStateTools(tool)) {
        // Register CreatedStateTools
        const [, , cleanup] = mcp.addStateTools(tool);
        cleanupFns.push(cleanup);
      } else {
        // Register raw ToolDefinition
        // biome-ignore lint/suspicious/noExplicitAny: Internal addTool accepts ToolDefinition, but overloads are stricter
        mcp.addTool(tool as any);
        cleanupFns.push(() => mcp.removeTool(tool.name));
      }
    }

    return () => {
      for (const cleanup of cleanupFns) {
        cleanup();
      }
    };
  }, []);
  // Note: Empty deps because we use refs - tools are registered once on mount
  // and cleaned up on unmount. If you need to re-register on tool change,
  // use a key prop on the component.
}
