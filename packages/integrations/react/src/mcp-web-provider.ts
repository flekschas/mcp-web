import { MCPWeb } from "@mcp-web/core";
import type { MCPWebConfig } from "@mcp-web/types";
import React, { type ReactNode, useMemo } from "react";
import { MCPWebContext } from "./mcp-web-context";
import { useConnectedMCPWeb } from "./use-connected-mcp-web";

export interface MCPWebProviderPropsWithConfig {
  children: ReactNode;
  config: MCPWebConfig;
}

export interface MCPWebProviderPropsWithInstance {
  children: ReactNode;
  mcpWeb: MCPWeb;
}

export type MCPWebProviderProps = MCPWebProviderPropsWithConfig | MCPWebProviderPropsWithInstance;

/**
 * Provider component for sharing MCPWeb instance across component tree.
 * Handles MCPWeb instantiation and connection lifecycle automatically.
 *
 * @example
 * ```tsx
 * function Root() {
 *   return (
 *     <MCPWebProvider config={{ name: 'My App', description: 'My app description' }}>
 *       <App />
 *     </MCPWebProvider>
 *   );
 * }
 * ```
 */
export function MCPWebProvider({ children, ...props }: MCPWebProviderProps) {
  const mcpWeb = 'mcpWeb' in props ? props.mcpWeb : undefined;
  const config = 'config' in props ? props.config : undefined;

  const mcpInstance = useMemo(() => {
    if (mcpWeb) {
      return mcpWeb;
    }
    if (config) {
      return new MCPWeb(config);
    }
    throw new Error('MCPWebProvider requires either mcpWeb or config prop');
  }, [mcpWeb, config]);
  const mcpState = useConnectedMCPWeb(mcpInstance);

  return React.createElement(
    MCPWebContext.Provider,
    { value: mcpState },
    children
  );
}
