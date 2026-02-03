import { MCPWeb } from '@mcp-web/core';

// Bridge server address (protocol determined automatically based on page context)
const bridgeHost = import.meta.env.VITE_BRIDGE_HOST ?? 'localhost';
const bridgePort = import.meta.env.VITE_BRIDGE_PORT
  ? Number(import.meta.env.VITE_BRIDGE_PORT)
  : import.meta.env.PROD ? 443 : 3001;

// Create MCP instance with persistent auth token
// The auth token will be automatically persisted in localStorage
// and reused across sessions, eliminating the need to reconfigure
// the MCP client every time the app is reloaded
export const mcp = new MCPWeb({
  name: 'HiGlass',
  description: 'Control the HiGlass web-based genome browser',
  bridgeUrl: `${bridgeHost}:${bridgePort}`,
  // persistAuthToken: true is the default, but shown here for clarity
  persistAuthToken: true,
});

// Helper function to get the current auth token for MCP client setup
export function getCurrentAuthToken(): string {
  return mcp.authToken;
}

// Helper function to get the MCP configuration
export function getMCPConfig() {
  return mcp.mcpConfig;
}
