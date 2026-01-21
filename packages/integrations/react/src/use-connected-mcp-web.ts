import type { MCPWeb } from "@mcp-web/core";
import { useEffect, useState } from "react";
import type { MCPWebContextValue } from "./mcp-web-context";

/**
 * Internal hook for managing MCPWeb connection lifecycle.
 * Connects on mount and disconnects on unmount.
 * Returns reactive connection state for triggering re-renders.
 *
 * @internal
 */
export function useConnectedMCPWeb(mcpInstance: MCPWeb): MCPWebContextValue {
  const [isConnected, setIsConnected] = useState(mcpInstance.connected);

  useEffect(() => {
    if (!mcpInstance.connected) {
      mcpInstance.connect().then(() => setIsConnected(true));
    } else {
      setIsConnected(true);
    }

    return () => {
      mcpInstance.disconnect();
    };
  }, [mcpInstance]);

  return { mcpWeb: mcpInstance, isConnected };
}
