import type { MCPWeb } from '@mcp-web/core';

/**
 * Options for generating an MCPB bundle.
 */
export interface McpBundleOptions {
  /**
   * Display name shown in Claude Desktop's extension list.
   * Defaults to the MCPWeb config name.
   */
  displayName?: string;

  /**
   * Bundle version (semantic version format).
   * Defaults to "1.0.0".
   */
  version?: string;

  /**
   * Bundle description.
   * Defaults to the MCPWeb config description.
   */
  description?: string;

  /**
   * Author information.
   */
  author?: {
    name: string;
    email?: string;
    url?: string;
  };

  /**
   * Icon for the extension. Can be:
   * - A URL to fetch the icon from
   * - A Blob containing the icon data
   *
   * Should be a PNG image. If provided, it will be included in the bundle as icon.png.
   */
  icon?: string | Blob;

  /**
   * Override the default CDN URL for fetching the @mcp-web/client bundle.
   * By default, fetches from unpkg with jsdelivr fallback.
   */
  clientBundleUrl?: string;
}

/**
 * Result of generating an MCPB bundle.
 */
export interface McpBundleResult {
  /**
   * The .mcpb file as a Blob, ready to be downloaded or processed.
   */
  blob: Blob;

  /**
   * Suggested filename for the bundle (e.g., "my-app.mcpb").
   */
  filename: string;

  /**
   * Helper function to trigger browser download of the bundle.
   * Creates a temporary download link and clicks it.
   */
  download: () => void;
}

/**
 * MCPB manifest.json structure (v0.3).
 */
export interface ManifestJson {
  manifest_version: string;
  name: string;
  display_name?: string;
  version: string;
  description: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  server: {
    type: 'node';
    entry_point: string;
    mcp_config: {
      command: string;
      args: string[];
      env: Record<string, string>;
    };
  };
  icon?: string;
  tools_generated: boolean;
  compatibility: {
    platforms: string[];
    runtimes: {
      node: string;
    };
  };
}
