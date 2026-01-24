import type { MCPWeb } from '@mcp-web/core';
import JSZip from 'jszip';
import { fetchClientBundle } from './fetch-client.js';
import { generateManifest } from './manifest.js';
import type { McpBundleOptions, McpBundleResult } from './types.js';

/**
 * Generates a pre-configured MCPB bundle for installation in Claude Desktop.
 *
 * This function creates a `.mcpb` file (which is a zip archive) containing:
 * - manifest.json with pre-baked MCP_SERVER_URL and AUTH_TOKEN
 * - server/index.js (the standalone @mcp-web/client bundle)
 * - icon.png (optional, if provided in options)
 *
 * The resulting bundle can be installed in Claude Desktop with a single click,
 * with no manual configuration required.
 *
 * @param mcpWeb - The MCPWeb instance to generate a bundle for
 * @param options - Optional customization options
 * @returns Promise resolving to the bundle result with blob, filename, and download helper
 *
 * @example
 * ```typescript
 * import { MCPWeb } from '@mcp-web/core';
 * import { getMcpBundle } from '@mcp-web/mcpb';
 *
 * const mcp = new MCPWeb({
 *   name: 'My Todo App',
 *   description: 'AI-controllable todo application',
 *   autoConnect: true,
 * });
 *
 * // Generate and download bundle
 * const bundle = await getMcpBundle(mcp, {
 *   displayName: 'My Todo App - Claude Extension',
 *   version: '1.0.0',
 *   author: { name: 'Acme Corp', url: 'https://acme.com' }
 * });
 *
 * bundle.download(); // Triggers browser download
 * ```
 */
export async function getMcpBundle(
  mcpWeb: MCPWeb,
  options: McpBundleOptions = {},
): Promise<McpBundleResult> {
  // Generate manifest with pre-baked auth token and bridge URL
  const manifest = generateManifest(mcpWeb, options);

  // Fetch the pre-built client bundle from CDN
  const clientCode = await fetchClientBundle(options.clientBundleUrl);

  // Create zip archive
  const zip = new JSZip();

  // Add manifest.json
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Add server/index.js (the client bundle)
  const serverFolder = zip.folder('server');
  if (!serverFolder) {
    throw new Error('Failed to create server folder in zip');
  }
  serverFolder.file('index.js', clientCode);

  // Add icon if provided
  // TODO: Consider adding validation for icon format (PNG) and size in future versions
  if (options.icon) {
    if (typeof options.icon === 'string') {
      // Fetch icon from URL
      try {
        const iconResponse = await fetch(options.icon);
        if (iconResponse.ok) {
          const iconBlob = await iconResponse.blob();
          zip.file('icon.png', iconBlob);
        } else {
          console.warn(
            `Failed to fetch icon from ${options.icon}: ${iconResponse.status}`,
          );
        }
      } catch (error) {
        console.warn(`Failed to fetch icon from ${options.icon}:`, error);
      }
    } else {
      // Blob provided directly
      zip.file('icon.png', options.icon);
    }
  }

  // Generate the .mcpb blob
  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = `${manifest.name}.mcpb`;

  // Create download helper
  const download = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return { blob, filename, download };
}
