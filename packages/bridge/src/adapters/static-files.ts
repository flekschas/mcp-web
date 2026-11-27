import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Reads static files of the web app from `publicDir`, relative to the
 * working directory. Resolves to `undefined` for a missing file.
 */
export function createStaticFileReader(publicDir = 'public') {
  return async (path: string): Promise<string | undefined> => {
    try {
      return await readFile(resolve(publicDir, path), 'utf-8');
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') return undefined;
      throw error;
    }
  };
}
