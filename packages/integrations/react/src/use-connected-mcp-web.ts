import type { MCPWeb } from "@mcp-web/core";
import { useEffect, useRef, useState } from "react";
import type { MCPWebContextValue } from "./mcp-web-context";

/**
 * Internal hook for managing MCPWeb connection lifecycle.
 * Connects on mount and disconnects on unmount.
 * Returns reactive connection state for triggering re-renders.
 *
 * Handles React StrictMode's double-mount behavior by using a ref to track
 * whether we should actually disconnect on cleanup.
 *
 * @internal
 */
export function useConnectedMCPWeb(mcpInstance: MCPWeb): MCPWebContextValue {
  const [isConnected, setIsConnected] = useState(mcpInstance.connected);
  // Track if the effect has been cleaned up to handle StrictMode double-mount
  const cleanedUpRef = useRef(false);

  useEffect(() => {
    // Reset the cleanup flag on mount
    cleanedUpRef.current = false;

    if (!mcpInstance.connected) {
      mcpInstance.connect().then(() => {
        // Only update state if we haven't been cleaned up
        if (!cleanedUpRef.current) {
          setIsConnected(true);
        }
      });
    } else {
      setIsConnected(true);
    }

    return () => {
      cleanedUpRef.current = true;
      // Use setTimeout to defer disconnect, allowing StrictMode's remount to cancel it
      // If the component remounts (StrictMode), the new effect will run before this timeout
      setTimeout(() => {
        // Only disconnect if we're still in a cleaned-up state (no remount happened)
        if (cleanedUpRef.current) {
          mcpInstance.disconnect();
        }
      }, 0);
    };
  }, [mcpInstance]);

  return { mcpWeb: mcpInstance, isConnected };
}
