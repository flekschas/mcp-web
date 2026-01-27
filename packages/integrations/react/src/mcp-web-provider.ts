import { MCPWeb } from "@mcp-web/core";
import type { MCPWebConfig } from "@mcp-web/types";
import React, { type ReactNode, useMemo } from "react";
import { MCPWebContext } from "./mcp-web-context";
import { useConnectedMCPWeb } from "./use-connected-mcp-web";

/**
 * Props for MCPWebProvider when creating a new MCPWeb instance from config.
 */
export interface MCPWebProviderPropsWithConfig {
  /** Child components that can access MCPWeb via useMCPWeb hook. */
  children: ReactNode;
  /** Configuration for creating a new MCPWeb instance. */
  config: MCPWebConfig;
}

/**
 * Props for MCPWebProvider when using an existing MCPWeb instance.
 */
export interface MCPWebProviderPropsWithInstance {
  /** Child components that can access MCPWeb via useMCPWeb hook. */
  children: ReactNode;
  /** Existing MCPWeb instance to provide to children. */
  mcpWeb: MCPWeb;
}

/**
 * Props for MCPWebProvider component.
 * Either provide a `config` to create a new instance, or `mcpWeb` to use an existing one.
 */
export type MCPWebProviderProps = MCPWebProviderPropsWithConfig | MCPWebProviderPropsWithInstance;

/**
 * Provider component that shares an MCPWeb instance across the component tree.
 *
 * Handles MCPWeb instantiation (if config provided) and connection lifecycle
 * automatically. All child components can access the MCPWeb instance via the
 * `useMCPWeb` hook.
 *
 * @example With config (creates new instance)
 * ```tsx
 * function Root() {
 *   return (
 *     <MCPWebProvider config={{
 *       name: 'My App',
 *       description: 'My app description',
 *     }}>
 *       <App />
 *     </MCPWebProvider>
 *   );
 * }
 * ```
 *
 * @example With existing instance
 * ```tsx
 * const mcpWeb = new MCPWeb(config);
 *
 * function Root() {
 *   return (
 *     <MCPWebProvider mcpWeb={mcpWeb}>
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
