import { MCPWeb } from '@mcp-web/core';
import baseConfig from '../../mcp-web.config';

// In dev mode, use the config's bridgeUrl (e.g., localhost:3011).
// In production, omit it so MCPWeb defaults to window.location.host.
const config = {
  ...baseConfig,
  ...(!import.meta.env.DEV && { bridgeUrl: undefined }),
};

// Create MCP instance with persistent auth token
// The auth token will be automatically persisted in localStorage
// and reused across sessions, eliminating the need to reconfigure
// the MCP client every time the app is reloaded
export const mcp = new MCPWeb(config);

// Helper function to get the current auth token for MCP client setup
export function getCurrentAuthToken(): string {
  return mcp.authToken;
}

// Helper function to get the MCP configuration
export function getMCPConfig() {
  return mcp.mcpConfig;
}
