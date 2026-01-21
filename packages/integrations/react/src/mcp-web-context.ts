import type { MCPWeb } from "@mcp-web/core";
import { createContext } from "react";

export interface MCPWebContextValue {
  mcpWeb: MCPWeb;
  isConnected: boolean;
}

export const MCPWebContext = createContext<MCPWebContextValue | null>(null);
