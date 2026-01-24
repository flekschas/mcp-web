/**
 * Default CDN URL for fetching the @mcp-web/client standalone bundle.
 * Uses unpkg as the primary CDN.
 */
const DEFAULT_CDN_URL =
  'https://unpkg.com/@mcp-web/client@latest/dist/standalone.js';

/**
 * Fallback CDN URL using jsdelivr.
 */
const FALLBACK_CDN_URL =
  'https://cdn.jsdelivr.net/npm/@mcp-web/client@latest/dist/standalone.js';

/**
 * Fetches the pre-built @mcp-web/client standalone bundle from CDN.
 *
 * Tries the primary CDN (unpkg) first, then falls back to jsdelivr if that fails.
 * If a custom URL is provided, only that URL is tried.
 *
 * @param customUrl - Optional custom URL to fetch the bundle from
 * @returns The client bundle code as a string
 * @throws Error if all CDN attempts fail
 */
export async function fetchClientBundle(customUrl?: string): Promise<string> {
  const urls = customUrl ? [customUrl] : [DEFAULT_CDN_URL, FALLBACK_CDN_URL];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      // Try next URL
      console.warn(`Failed to fetch client bundle from ${url}:`, error);
    }
  }

  throw new Error(
    'Failed to fetch @mcp-web/client bundle from CDN. Please check your network connection or provide a custom clientBundleUrl.',
  );
}
