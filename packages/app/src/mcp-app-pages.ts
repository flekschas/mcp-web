import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  blankStrings,
  findClosingBracket,
  readStringLiteral,
  readTopLevelProperties,
  stripComments,
} from './source-text.js';

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.js',
  '.jsx',
  '.mjs',
  '.vue',
  '.svelte',
]);

const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'build',
  'public',
  '__tests__',
  '__fixtures__',
]);

const TEST_FILE = /\.(test|spec)\.[^.]+$|\.d\.ts$/;

/**
 * Finds the pages that `MCPWeb` configs open as MCP Apps, by reading the
 * `mcpApp` option from the source files under `projectRoot`:
 * `mcpApp: true` is `index.html`, and `mcpApp: { page: 'admin.html' }` is
 * `admin.html`. The value must be written inline.
 *
 * @returns Page paths relative to `projectRoot`
 *
 * @internal
 */
export function findMCPAppPages(projectRoot: string): string[] {
  const pages = new Set<string>();
  const filesWithOtherValues: string[] = [];
  const unreadFiles: string[] = [];

  for (const file of listSourceFiles(projectRoot)) {
    const content = stripComments(fs.readFileSync(file, 'utf-8'));
    // Searched without strings, so text such as an error message that
    // mentions `mcpApp: true` doesn't count.
    const code = blankStrings(content);
    const relativeFile = path.relative(projectRoot, file);
    const matches = [...code.matchAll(/\bmcpApp\s*:\s*/g)];
    // A quote that starts no string, such as in JSX text, makes the rest of
    // the file look like a string.
    if (matches.length < (content.match(/\bmcpApp\s*:/g)?.length ?? 0)) {
      unreadFiles.push(relativeFile);
    }
    for (const match of matches) {
      const valueStart = match.index + match[0].length;
      const rest = code.slice(valueStart);
      if (/^false\b/.test(rest)) continue;
      if (/^true\b/.test(rest)) {
        pages.add('index.html');
        continue;
      }
      const valueEnd = rest.startsWith('{')
        ? findClosingBracket(code, valueStart)
        : -1;
      if (valueEnd === -1) {
        filesWithOtherValues.push(relativeFile);
        continue;
      }
      const properties = readTopLevelProperties(
        content.slice(valueStart + 1, valueEnd),
      );
      const page = readStringLiteral(properties.get('page'));
      if (!page) {
        console.warn(
          `[mcp-web-app] Warning: \`mcpApp\` in ${relativeFile} needs a \`page\` written as a string, such as { page: 'admin.html' }`,
        );
        continue;
      }
      pages.add(page.replace(/^(\.\/|\/)+/, ''));
    }
  }

  if (pages.size === 0 && unreadFiles.length > 0) {
    console.warn(
      `[mcp-web-app] Warning: Could not read \`mcpApp\` in ${unreadFiles.join(', ')}. Keep it in a plain config file, such as mcp-web.config.ts`,
    );
  }
  if (pages.size === 0 && filesWithOtherValues.length > 0) {
    console.warn(
      `[mcp-web-app] Warning: No page is built for \`mcpApp\` in ${filesWithOtherValues.join(', ')}. Write its value inline, as \`true\` or { page: 'admin.html' }`,
    );
  }

  return [...pages].filter((page) => {
    const relativePath = path.relative(
      projectRoot,
      path.resolve(projectRoot, page),
    );
    if (
      !page.endsWith('.html') ||
      relativePath.startsWith('..') ||
      path.isAbsolute(relativePath)
    ) {
      console.warn(
        `[mcp-web-app] Warning: \`mcpApp\` opens ${page}, but a page must be an HTML file in the project`,
      );
      return false;
    }
    if (fs.existsSync(path.resolve(projectRoot, page))) return true;
    console.warn(
      `[mcp-web-app] Warning: \`mcpApp\` opens ${page}, but there is no such page`,
    );
    return false;
  });
}

function* listSourceFiles(directory: string): Generator<string> {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) {
        yield* listSourceFiles(entryPath);
      }
    } else if (
      SOURCE_EXTENSIONS.has(path.extname(entry.name)) &&
      !TEST_FILE.test(entry.name)
    ) {
      yield entryPath;
    }
  }
}
