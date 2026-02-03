/**
 * Vite config for building MCP Apps as single HTML files.
 *
 * Usage:
 *   Build:  pnpm build:mcp-apps
 *   Watch:  pnpm dev:mcp-apps
 */
import { defineMCPAppsConfig } from '@mcp-web/app/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineMCPAppsConfig({
  plugins: [react(), tailwindcss()],
});
