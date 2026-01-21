import { useContext } from "react";
import { MCPWebContext, type MCPWebContextValue } from "./mcp-web-context";

/**
 * Hook for accessing MCPWeb instance from context.
 * Must be used within MCPWebProvider.
 *
 * @returns Object containing the MCPWeb instance and connection state
 * @throws Error if used outside of MCPWebProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { mcpWeb, isConnected } = useMCPWeb();
 *   // Use mcpWeb...
 * }
 * ```
 */
export function useMCPWeb(): MCPWebContextValue {
  const context = useContext(MCPWebContext);
  if (!context) {
    throw new Error('useMCPWeb must be used within MCPWebProvider');
  }
  return context;
}
