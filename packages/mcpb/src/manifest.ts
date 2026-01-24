import type { MCPWeb } from '@mcp-web/core';
import type { ManifestJson, McpBundleOptions } from './types.js';

/**
 * Converts a string to kebab-case.
 * Examples: "My App" -> "my-app", "MyApp" -> "my-app"
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Generates a MCPB manifest.json from an MCPWeb instance and options.
 *
 * The manifest includes pre-baked environment variables (MCP_SERVER_URL and AUTH_TOKEN)
 * so the user doesn't need to configure anything after installation.
 *
 * @param mcpWeb - The MCPWeb instance to generate manifest for
 * @param options - Optional customization for the bundle
 * @returns A complete manifest.json object conforming to MCPB spec v0.3
 */
export function generateManifest(
  mcpWeb: MCPWeb,
  options: McpBundleOptions = {},
): ManifestJson {
  const config = mcpWeb.config;
  const mcpConfig = mcpWeb.mcpConfig;
  const serverName = Object.keys(mcpConfig)[0];
  const serverEnv = mcpConfig[serverName].env;

  return {
    manifest_version: '0.3',
    name: toKebabCase(config.name),
    display_name: options.displayName || config.name,
    version: options.version || '1.0.0',
    description: options.description || config.description,
    author: options.author || { name: 'MCP-Web App' },
    server: {
      type: 'node',
      entry_point: 'server/index.js',
      mcp_config: {
        command: 'node',
        args: ['${__dirname}/server/index.js'],
        env: {
          // Pre-baked values - no user_config needed!
          MCP_SERVER_URL: serverEnv.MCP_SERVER_URL,
          AUTH_TOKEN: serverEnv.AUTH_TOKEN,
        },
      },
    },
    icon:
      options.icon && typeof options.icon === 'string' ? 'icon.png' : undefined,
    tools_generated: true,
    compatibility: {
      platforms: ['darwin', 'win32', 'linux'],
      runtimes: {
        node: '>=22.0.0',
      },
    },
  };
}
