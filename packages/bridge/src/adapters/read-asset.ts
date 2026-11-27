import type { AssetsBinding } from './cloudflare-types.js';

/**
 * Reads a static file from the `ASSETS` binding. Resolves to `undefined` for
 * a missing file, also when the binding answers it with another page, as it
 * does with `not_found_handling: 'single-page-application'`.
 */
export function readAsset(assets: AssetsBinding) {
  // The binding ignores the host, so any absolute URL works.
  const fetchText = async (path: string) => {
    const response = await assets.fetch(
      new Request(`https://assets.local/${path}`),
    );
    return response.ok ? response.text() : undefined;
  };
  return async (path: string): Promise<string | undefined> => {
    const [text, textOfMissingFile] = await Promise.all([
      fetchText(path),
      fetchText(`${path}.missing`),
    ]);
    return text === textOfMissingFile ? undefined : text;
  };
}
