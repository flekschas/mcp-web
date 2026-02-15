import type { CreatedStateTools, CreatedTool, MCPWeb, ToolRegistrationError } from '@mcp-web/core';
import { isCreatedStateTools, isCreatedTool } from '@mcp-web/core';
import type { ToolDefinition } from '@mcp-web/types';
import { useContext, useEffect, useRef } from 'react';
import { MCPWebContext } from './mcp-web-context';

/**
 * A tool that can be registered with useMCPTools.
 * Can be a CreatedTool, CreatedStateTools, or a raw ToolDefinition.
 */
export type RegisterableTool =
  | CreatedTool
  // biome-ignore lint/suspicious/noExplicitAny: Need any to handle variance in generic state types
  | CreatedStateTools<any>
  | ToolDefinition;

/**
 * Options for the useMCPTools hook.
 */
export interface UseMCPToolsOptions {
  /** Called if the bridge rejects any tool registration (e.g., schema conflict with a sibling session). */
  onRegistrationError?: (error: ToolRegistrationError) => void;
}

/**
 * Hook for registering MCP tools with automatic cleanup on unmount.
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
 * import { useMCPTools } from '@mcp-web/react';
 * import { timeTool, todoTools } from './tools';
 *
 * function App() {
 *   useMCPTools(timeTool, todoTools);
 *   return <div>...</div>;
 * }
 * ```
 *
 * @example With registration error handling
 * ```tsx
 * function App() {
 *   useMCPTools(myTool, {
 *     onRegistrationError: (error) => {
 *       console.error(`Tool ${error.toolName} rejected: ${error.message}`);
 *     },
 *   });
 *   return <div>...</div>;
 * }
 * ```
 *
 * @example Conditional tool registration
 * ```tsx
 * function AdminPanel() {
 *   // These tools only exist while AdminPanel is mounted
 *   useMCPTools(adminTools);
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
 *   useMCPTools(allTools);
 *   // or: useMCPTools(...allTools);
 *   return <div>...</div>;
 * }
 * ```
 *
 * @param tools - Tools to register (variadic or array), optionally followed by an options object
 */
export function useMCPTools(
  ...tools: (RegisterableTool | RegisterableTool[])[]
): void;

export function useMCPTools(
  mcpWeb: MCPWeb,
  ...tools: (RegisterableTool | RegisterableTool[])[]
): void;

export function useMCPTools(
  ...args: [...(RegisterableTool | RegisterableTool[])[], UseMCPToolsOptions]
): void;

export function useMCPTools(
  mcpWeb: MCPWeb,
  ...args: [...(RegisterableTool | RegisterableTool[])[], UseMCPToolsOptions]
): void;

// biome-ignore lint/suspicious/noExplicitAny: Implementation signature must be broad to support all overloads
export function useMCPTools(...allRawArgs: any[]): void {
  const firstArg = allRawArgs[0];
  const rest = allRawArgs.slice(1);
  // Determine if first arg is MCPWeb instance or a tool
  const isMCPWebInstance = (value: unknown): value is MCPWeb =>
    typeof value === 'object' &&
    value !== null &&
    'addTool' in value &&
    'addStateTools' in value &&
    typeof (value as MCPWeb).addTool === 'function';

  const isOptions = (value: unknown): value is UseMCPToolsOptions =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !isMCPWebInstance(value) &&
    !isCreatedTool(value) &&
    !isCreatedStateTools(value) &&
    !('handler' in value) &&
    'onRegistrationError' in value;

  let mcpWebProp: MCPWeb | undefined;
  let toolsToRegister: RegisterableTool[];
  let options: UseMCPToolsOptions | undefined;

  // Extract options from the last argument if present
  const allArgs = [firstArg, ...rest];
  const lastArg = allArgs[allArgs.length - 1];
  if (isOptions(lastArg)) {
    options = lastArg;
    allArgs.pop();
  }

  if (isMCPWebInstance(allArgs[0])) {
    mcpWebProp = allArgs[0];
    toolsToRegister = (allArgs.slice(1) as (RegisterableTool | RegisterableTool[])[]).flat();
  } else {
    mcpWebProp = undefined;
    toolsToRegister = (allArgs as (RegisterableTool | RegisterableTool[])[]).flat();
  }

  // Try to get from context if not provided
  const context = useContext(MCPWebContext);
  const mcpWeb = mcpWebProp ?? context?.mcpWeb;

  if (!mcpWeb) {
    throw new Error(
      'useMCPTools requires either mcpWeb as first argument or MCPWebProvider in component tree'
    );
  }

  // Keep a stable reference to the tools array
  const toolsRef = useRef(toolsToRegister);
  toolsRef.current = toolsToRegister;

  // Keep a stable reference to mcpWeb
  const mcpWebRef = useRef(mcpWeb);
  mcpWebRef.current = mcpWeb;

  // Keep a stable reference to options
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const cleanupFns: (() => void)[] = [];
    const mcp = mcpWebRef.current;
    const opts = optionsRef.current;
    const addToolOptions = opts?.onRegistrationError
      ? { onRegistrationError: opts.onRegistrationError }
      : undefined;

    for (const tool of toolsRef.current) {
      if (isCreatedTool(tool)) {
        // Register CreatedTool
        mcp.addTool(tool, addToolOptions);
        cleanupFns.push(() => mcp.removeTool(tool.definition.name));
      } else if (isCreatedStateTools(tool)) {
        // Register CreatedStateTools
        const [, , cleanup] = mcp.addStateTools(tool);
        cleanupFns.push(cleanup);
      } else {
        // Register raw ToolDefinition
        // biome-ignore lint/suspicious/noExplicitAny: Internal addTool accepts ToolDefinition, but overloads are stricter
        mcp.addTool(tool as any, addToolOptions);
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
