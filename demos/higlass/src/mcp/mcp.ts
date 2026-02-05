import { MCPWeb } from '@mcp-web/core';
import config from '../../mcp-web.config';

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
