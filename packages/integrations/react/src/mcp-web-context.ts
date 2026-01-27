import type { MCPWeb } from "@mcp-web/core";
import { createContext } from "react";

/**
 * Context value provided by MCPWebProvider.
 */
export interface MCPWebContextValue {
  /** The MCPWeb instance for registering tools and making queries. */
  mcpWeb: MCPWeb;
  /** Whether the MCPWeb instance is connected to the bridge server. */
  isConnected: boolean;
}

/**
 * React context for sharing MCPWeb instance across component tree.
 * @internal Use MCPWebProvider and useMCPWeb instead of accessing directly.
 */
export const MCPWebContext = createContext<MCPWebContextValue | null>(null);
