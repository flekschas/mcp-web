/**
 * Vite config for building the app as an MCP App view.
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
