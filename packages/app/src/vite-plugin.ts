import * as fs from 'node:fs';
import * as path from 'node:path';
import { getAppFileName } from '@mcp-web/types';
import type {
  Plugin,
  ResolvedConfig,
  UserConfig,
  UserConfigExport,
} from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { findMCPAppPages } from './mcp-app-pages.js';
import { readStringLiteral, readTopLevelProperties } from './source-text.js';

/**
 * MCP-specific options for building MCP Apps.
 *
 * These options control how app definitions are discovered and where
 * the bundled HTML files are output.
 *
 * @example
 * ```typescript
 * defineMCPAppsConfig(
 *   { plugins: [react()] },
 *   {
 *     appsConfig: 'src/mcp-apps.ts',
 *     outDir: 'dist/apps',
 *     silenceOverrideWarnings: true,
 *   }
 * );
 * ```
 */
export interface MCPAppOptions {
  /**
   * Path to the apps configuration file (relative to project root).
   * This file should export apps created with `createApp()`.
   *
   * If not specified, will search for:
   * - `src/mcp-apps.ts`
   * - `src/mcp-apps.tsx`
   * - `src/mcp/apps.ts`
   * - `src/mcp/apps.tsx`
   *
   * @default auto-detected
   */
  appsConfig?: string;

  /**
   * Output directory for bundled app HTML files (relative to project root).
   * @default 'public/mcp-web-apps'
   */
  outDir?: string;

  /**
   * Silence warnings when MCP-required settings override user-provided values.
   * @default false
   */
  silenceOverrideWarnings?: boolean;
}

/**
 * Settings that must be overridden for single-file MCP App output to work.
 */
interface OverriddenSettings {
  key: string;
  required: unknown;
  reason: string;
}

const CRITICAL_OVERRIDES: OverriddenSettings[] = [
  {
    key: 'build.assetsInlineLimit',
    required: Number.MAX_SAFE_INTEGER,
    reason: 'All assets must be inlined for single-file output',
  },
  {
    key: 'build.cssCodeSplit',
    required: false,
    reason: 'CSS must be in a single file for inlining',
  },
  {
    key: 'base',
    required: './',
    reason: 'Relative paths required for self-contained HTML',
  },
];

/**
 * Virtual module prefix for generated app entries.
 */
const VIRTUAL_PREFIX = 'virtual:mcp-app/';

/**
 * Get a nested property value from an object using dot notation.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Information about an app extracted from the config file.
 */
interface AppInfo {
  /** The app's name (from createApp config) */
  name: string;
  /** The app's version (from createApp config), if it is a string literal */
  version?: string;
  /** The exported variable name */
  exportName: string;
  /** The component identifier */
  componentName: string;
  /** How the apps config imports the component */
  componentImport: ComponentImport;
}

/** An import of a component: its path, and its exported name. */
interface ComponentImport {
  /** Relative or package path */
  path: string;
  /** Exported name, or `default` */
  exportName: string;
}

/**
 * Find the apps config file in the project.
 */
function findAppsConfigFile(projectRoot: string, customPath?: string): string | null {
  if (customPath) {
    const fullPath = path.resolve(projectRoot, customPath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    return null;
  }

  const candidates = [
    'src/mcp-apps.ts',
    'src/mcp-apps.tsx',
    'src/mcp/apps.ts',
    'src/mcp/apps.tsx',
  ];

  for (const candidate of candidates) {
    const fullPath = path.resolve(projectRoot, candidate);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Parse the apps config file to extract app definitions.
 *
 * Uses simple regex parsing to extract:
 * - Import statements for components
 * - createApp calls with name and component properties
 */
function parseAppsConfig(configPath: string): AppInfo[] {
  const content = fs.readFileSync(configPath, 'utf-8');
  const apps: AppInfo[] = [];

  // Maps the local name of each imported component to its import
  const importMap = new Map<string, ComponentImport>();
  const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[3];
    if (match[2]) {
      // Default import: import Foo from './foo'
      importMap.set(match[2], { path: importPath, exportName: 'default' });
    } else if (match[1]) {
      // Named imports: import { Foo, Bar as Baz } from './foo'
      for (const namedImport of match[1].split(',')) {
        const [exportName, localName = exportName] = namedImport
          .trim()
          .split(/\s+as\s+/);
        if (!exportName) continue;
        importMap.set(localName, { path: importPath, exportName });
      }
    }
  }

  // Find createApp calls - match the start, then find balanced braces
  const createAppStartRegex =
    /export\s+(?:const|let|var)\s+(\w+)\s*=\s*createApp\s*\(\s*\{/g;

  while ((match = createAppStartRegex.exec(content)) !== null) {
    const exportName = match[1];
    const startIndex = match.index + match[0].length - 1; // Position of opening {

    // Find the matching closing brace using brace counting
    let braceCount = 1;
    let endIndex = startIndex + 1;

    while (braceCount > 0 && endIndex < content.length) {
      const char = content[endIndex];
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      endIndex++;
    }

    if (braceCount !== 0) {
      // Unbalanced braces, skip this match
      continue;
    }

    // Extract the config body (between the braces)
    const configBody = content.slice(startIndex + 1, endIndex - 1);

    const properties = readTopLevelProperties(configBody);
    const name = readStringLiteral(properties.get('name'));
    if (!name) continue;

    const componentName = properties.get('component')?.match(/^\w+$/)?.[0];
    if (!componentName) continue;

    const versionValue = properties.get('version');
    const version = readStringLiteral(versionValue);
    if (versionValue !== undefined && version === undefined) {
      console.warn(
        `[mcp-web-app] Warning: The version of app "${name}" is not a string literal, so its view uses the version from package.json`
      );
    }

    const componentImport = importMap.get(componentName);
    if (!componentImport) {
      console.warn(
        `[mcp-web-app] Warning: Could not find import for component "${componentName}" in app "${name}"`
      );
      continue;
    }

    apps.push({
      name,
      version,
      exportName,
      componentName,
      componentImport,
    });
  }

  return apps;
}

/**
 * Resolve a component import path to an absolute path.
 */
function resolveComponentPath(
  componentImportPath: string,
  configDir: string
): string {
  // If it starts with . or /, it's a relative/absolute path
  if (
    componentImportPath.startsWith('.') ||
    componentImportPath.startsWith('/')
  ) {
    // Resolve relative to the config file's directory
    const resolved = path.resolve(configDir, componentImportPath);

    // Try with common extensions
    const extensions = ['.tsx', '.ts', '.jsx', '.js'];
    for (const ext of extensions) {
      if (fs.existsSync(resolved + ext)) {
        return resolved + ext;
      }
    }
    if (fs.existsSync(resolved)) {
      return resolved;
    }
    // Check for index files
    for (const ext of extensions) {
      const indexPath = path.join(resolved, `index${ext}`);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
    return resolved;
  }

  // Otherwise, it's a package import - return as-is for Vite to resolve
  return componentImportPath;
}

/**
 * Version in the `package.json` closest to `dir`, or undefined if there is
 * none.
 */
function readPackageVersion(dir: string): string | undefined {
  let current = dir;
  while (true) {
    const packageJsonPath = path.join(current, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return typeof version === 'string' ? version : undefined;
    }
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

/**
 * Generate a virtual module that renders an MCP App.
 */
function generateVirtualModule(
  componentPath: string,
  componentName: string,
  exportName: string,
  appInfo: { name: string; version?: string }
): string {
  const imported =
    exportName === 'default'
      ? componentName
      : exportName === componentName
        ? `{ ${componentName} }`
        : `{ ${exportName} as ${componentName} }`;
  return `
import { renderMCPApp } from '@mcp-web/app/internal';
import ${imported} from '${componentPath}';

renderMCPApp(${componentName}, ${JSON.stringify(appInfo)});
`;
}

/**
 * Generate HTML content for an app entry.
 */
function generateHTMLContent(appName: string, virtualModulePath: string): string {
  return `<!DOCTYPE html>
<html lang="en" style="color-scheme: light dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appName}</title>
    <style>body { margin: 0; background: transparent; }</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${virtualModulePath}"></script>
  </body>
</html>`;
}

/** Directory, in the project root, of the generated HTML entries. */
const TEMP_HTML_DIR = path.join('node_modules', '.mcp-web-app-temp');

/** A view to build: an HTML entry, and the path of its output in `outDir`. */
interface ViewEntry {
  input: string;
  output: string;
  /** What asks for the view, as shown in messages. */
  source: string;
}

/** The views of a project, and the modules that render `createApp()` apps. */
interface Views {
  apps: AppInfo[];
  pages: string[];
  entries: ViewEntry[];
  virtualModules: Map<string, string>;
}

/** What every build of a view needs. */
interface ViewBuildContext {
  projectRoot: string;
  outDir: string;
  viteConfig: UserConfig;
  views: Views;
}

/**
 * Collects the views to build: one per `createApp()` app, rendered from a
 * generated HTML entry, and one per page opened through `mcpApp`.
 *
 * @throws If two views would be built to the same file.
 */
function collectViews(projectRoot: string, configPath: string | null): Views {
  const apps = configPath ? parseAppsConfig(configPath) : [];
  const entries: ViewEntry[] = [];
  const virtualModules = new Map<string, string>();

  if (configPath && apps.length > 0) {
    const configDir = path.dirname(configPath);
    const packageVersion = readPackageVersion(configDir);
    const tempHtmlDir = path.join(projectRoot, TEMP_HTML_DIR);
    fs.mkdirSync(tempHtmlDir, { recursive: true });

    for (const app of apps) {
      const fileName = getAppFileName(app.name);
      const virtualId = `${VIRTUAL_PREFIX}${path.basename(fileName, '.html')}`;
      virtualModules.set(
        `\0${virtualId}`,
        generateVirtualModule(
          resolveComponentPath(app.componentImport.path, configDir),
          app.componentName,
          app.componentImport.exportName,
          { name: app.name, version: app.version ?? packageVersion }
        )
      );
      const htmlPath = path.join(tempHtmlDir, fileName);
      fs.writeFileSync(htmlPath, generateHTMLContent(app.name, virtualId));
      entries.push({
        input: htmlPath,
        output: fileName,
        source: `the app "${app.name}"`,
      });
    }
  }

  const pages = findMCPAppPages(projectRoot);
  for (const page of pages) {
    entries.push({
      input: path.resolve(projectRoot, page),
      output: page,
      source: `the page ${page} that \`mcpApp\` opens`,
    });
  }

  const sources = new Map<string, string>();
  for (const entry of entries) {
    const otherSource = sources.get(entry.output);
    if (otherSource) {
      throw new Error(
        `[mcp-web-app] ${otherSource} and ${entry.source} would both be built to ${entry.output}. Rename one of them.`
      );
    }
    sources.set(entry.output, entry.source);
  }

  return { apps, pages, entries, virtualModules };
}

/** Serves the modules that render `createApp()` apps. */
function serveVirtualModules(views: Views) {
  return {
    resolveId(id: string) {
      return id.startsWith(VIRTUAL_PREFIX) ? `\0${id}` : null;
    },
    load(id: string) {
      return views.virtualModules.get(id) ?? null;
    },
  };
}

/**
 * Removes the page's icon links from a view. A view shows in a frame, where
 * browsers show no icon, and Vite would write the icon file next to it.
 */
const removeIconLinks = {
  transformIndexHtml: {
    order: 'pre' as const,
    handler: (html: string) =>
      html.replace(/<link\b[^>]*\brel=["']?[^"'>]*\bicon\b[^>]*>\s*/gi, ''),
  },
};

/**
 * Local files that a view loads by URL. Hosts get only the view's HTML, so
 * the view can't load them.
 */
function findLocalFiles(html: string): string[] {
  // Inlined code can contain text that looks like tags.
  const tags = html.replace(
    /<(script|style)\b([^>]*)>[\s\S]*?<\/\1>/gi,
    '<$1$2>'
  );
  const urls: string[] = [];
  for (const [tag, name] of tags.matchAll(/<(script|img|link)\b[^>]*>/gi)) {
    if (name.toLowerCase() === 'link' && !/\brel=["']?stylesheet\b/i.test(tag)) {
      continue;
    }
    const url = tag.match(/\s(?:src|href)=["']?([^"'\s>]+)/i)?.[1];
    if (url && !/^(data:|blob:|https?:|\/\/)/i.test(url)) urls.push(url);
  }
  return urls;
}

/**
 * Moves a built view from the path of its entry to its path in `outDir`, and
 * warns about local files it loads.
 */
function moveView(entry: ViewEntry, { projectRoot, outDir }: ViewBuildContext) {
  const built = path.join(outDir, path.relative(projectRoot, entry.input));
  const target = path.join(outDir, entry.output);
  if (built !== target && fs.existsSync(built)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.renameSync(built, target);
    // Removes the directories of the entry, if they are now empty.
    for (
      let dir = path.dirname(built);
      dir.startsWith(outDir + path.sep);
      dir = path.dirname(dir)
    ) {
      try {
        fs.rmdirSync(dir);
      } catch {
        break;
      }
    }
  }
  if (!fs.existsSync(target)) return;

  const files = findLocalFiles(fs.readFileSync(target, 'utf-8'));
  if (files.length > 0) {
    console.warn(
      `[mcp-web-app] Warning: ${entry.output} loads ${files.join(', ')}, but hosts get only the view's HTML. Import these files from code, so the build inlines them.`
    );
  }
}

type BuildWatcher = { close(): Promise<void> };

/**
 * Builds one view as a single HTML file. With `watch`, it resolves once the
 * first build is done, to a watcher that rebuilds the view on changes.
 */
async function buildView(
  entry: ViewEntry,
  context: ViewBuildContext,
  { mode, watch }: { mode: string; watch: ResolvedConfig['build']['watch'] }
): Promise<BuildWatcher | undefined> {
  const { projectRoot, outDir, viteConfig, views } = context;
  const { build } = await import('vite');
  const result = await build({
    ...viteConfig,
    configFile: false,
    mode,
    root: projectRoot,
    base: './',
    publicDir: false,
    logLevel: 'warn',
    plugins: [
      ...(viteConfig.plugins || []),
      viteSingleFile(),
      {
        name: 'mcp-web-app-view',
        ...serveVirtualModules(views),
        ...removeIconLinks,
        writeBundle: () => moveView(entry, context),
      },
    ],
    build: {
      ...viteConfig.build,
      outDir,
      emptyOutDir: false,
      watch,
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      cssCodeSplit: false,
      rollupOptions: { ...viteConfig.build?.rollupOptions, input: entry.input },
    },
  });
  if (!('on' in result)) return undefined;

  await new Promise<void>((resolve) => {
    const onEvent = (event: { code: string }) => {
      if (event.code !== 'END' && event.code !== 'ERROR') return;
      result.off('event', onEvent);
      resolve();
    };
    result.on('event', onEvent);
  });
  return result;
}

/**
 * Internal plugin that serves the modules of `createApp()` apps, builds every
 * view after the first, which this build handles, and moves each view to its
 * path in `outDir`.
 */
function mcpAppPlugin(
  context: ViewBuildContext,
  configPath: string | null
): Plugin {
  const { projectRoot, views } = context;
  let config: ResolvedConfig;
  let isFirstBuild = true;
  let watchers: BuildWatcher[] = [];
  const closeWatchers = async () => {
    await Promise.all(watchers.map((watcher) => watcher.close()));
    watchers = [];
  };

  return {
    name: 'mcp-web-app',

    configResolved(resolvedConfig) {
      config = resolvedConfig;
      // Every view goes where this build goes, also with `--outDir`.
      context.outDir = path.resolve(config.root, config.build.outDir);
    },

    buildStart() {
      // The views are collected with the config. Later builds in watch mode
      // pick up changes.
      if (!isFirstBuild) {
        Object.assign(views, collectViews(projectRoot, configPath));
      }
      isFirstBuild = false;
      if (configPath) this.addWatchFile(configPath);
      if (views.entries.length === 0) {
        this.error(
          'No views to build. Add an app with createApp(), or open a page with the `mcpApp` option of MCPWeb.'
        );
      }
    },

    ...serveVirtualModules(views),
    ...removeIconLinks,

    writeBundle() {
      const [firstEntry] = views.entries;
      if (firstEntry) moveView(firstEntry, context);
    },

    async closeBundle() {
      // This build empties `outDir`, so the other views are built again. In
      // watch mode, each of them also rebuilds on changes of its own.
      await closeWatchers();
      for (const entry of views.entries.slice(1)) {
        const watcher = await buildView(entry, context, {
          mode: config.mode,
          watch: config.build.watch,
        });
        if (watcher) watchers.push(watcher);
      }

      if (views.entries.length === 0) return;
      const relOutDir = path.relative(projectRoot, context.outDir);
      console.log(`\n✓ Built ${views.entries.length} view(s) to ${relOutDir}/`);
      for (const entry of views.entries) {
        console.log(`   - ${entry.output}`);
      }
    },

    closeWatcher: closeWatchers,
  };
}

/**
 * Define a Vite configuration for building MCP Apps as single HTML files.
 *
 * This function creates a complete Vite config that auto-discovers app
 * definitions and bundles them into self-contained HTML files. These files
 * can be served as MCP App resources that render inline in AI chat interfaces.
 *
 * **How it works:**
 * 1. Scans for a config file (`src/mcp-apps.ts` or `src/mcp/apps.ts`)
 * 2. Parses `createApp()` calls to find app names and components
 * 3. Auto-generates entry files that render each component
 * 4. Bundles everything into single HTML files
 *
 * It also builds each page that an `MCPWeb` config opens through `mcpApp` as
 * a view, at the same path in `outDir`, such as `public/mcp-web-apps/index.html`.
 * The bridge serves that view when AI calls its `open_app` tool. Each view
 * gets a build of its own, so its HTML file holds all of its code.
 *
 * **Features:**
 * - No manual entry files needed - just define your apps!
 * - Full Vite config flexibility - pass any standard Vite options
 * - Automatic single-file bundling (JS, CSS, assets all inlined)
 * - Watch mode support for development
 * - PostMessage runtime for receiving props from the host
 *
 * **Critical settings that are always enforced:**
 * - `build.assetsInlineLimit` → Maximum (for inlining)
 * - `build.cssCodeSplit` → false (single CSS bundle)
 * - `base` → './' (relative paths)
 *
 * @param viteConfig - Standard Vite configuration options (plugins, build settings, etc.)
 * @param mcpOptions - MCP-specific options (appsConfig, outDir, silenceOverrideWarnings)
 * @returns A Vite UserConfigExport ready for use in vite.config.ts
 *
 * @example Basic Usage
 * ```typescript
 * // vite.apps.config.ts
 * import react from '@vitejs/plugin-react';
 * import { defineMCPAppsConfig } from '@mcp-web/app/vite';
 *
 * export default defineMCPAppsConfig({
 *   plugins: [react()],
 * });
 * ```
 *
 * @example With Custom Options
 * ```typescript
 * import react from '@vitejs/plugin-react';
 * import { defineMCPAppsConfig } from '@mcp-web/app/vite';
 *
 * export default defineMCPAppsConfig(
 *   {
 *     plugins: [react()],
 *     build: {
 *       sourcemap: true,
 *       minify: 'terser',
 *     },
 *   },
 *   {
 *     appsConfig: 'src/my-apps.ts',
 *     outDir: 'dist/apps',
 *   }
 * );
 * ```
 *
 * @example Apps Config File (src/mcp-apps.ts)
 * ```typescript
 * import { createApp } from '@mcp-web/app';
 * import { Statistics } from './components/Statistics';
 *
 * export const statisticsApp = createApp({
 *   name: 'show_statistics',
 *   description: 'Display statistics visualization',
 *   component: Statistics,
 *   handler: () => ({
 *     completionRate: 0.75,
 *     totalTasks: 100,
 *   }),
 * });
 * ```
 */
export function defineMCPAppsConfig(
  viteConfig: UserConfig = {},
  mcpOptions: MCPAppOptions = {}
): UserConfigExport {
  const {
    appsConfig,
    outDir = 'public/mcp-web-apps',
    silenceOverrideWarnings = false,
  } = mcpOptions;

  const projectRoot = process.cwd();
  const outDirPath = path.resolve(projectRoot, outDir);

  // Find the apps config file
  const configPath = findAppsConfigFile(projectRoot, appsConfig);

  // A single-file build inlines all code, including code shared between
  // views and code loaded on demand, only when it has one entry. So this
  // build handles the first view, and each other view gets a build of its own.
  const views = collectViews(projectRoot, configPath);
  const firstEntry = views.entries[0];
  // A project can have only pages that `mcpApp` opens, and no apps.
  if (!configPath && views.pages.length === 0) {
    console.log(
      '\n\u26A0 No MCP Apps config file found. Looking for src/mcp-apps.ts or src/mcp/apps.ts'
    );
  }
  if (views.pages.length > 0) {
    console.log(
      `\n\u2139 Found ${views.pages.length} page(s) that \`mcpApp\` opens: ${views.pages.join(', ')}`
    );
  }

  // Check for and warn about overridden settings
  if (!silenceOverrideWarnings) {
    const userConfig = viteConfig as Record<string, unknown>;
    for (const override of CRITICAL_OVERRIDES) {
      const userValue = getNestedValue(userConfig, override.key);
      if (userValue !== undefined && userValue !== override.required) {
        console.warn(
          `[mcp-web-app] Warning: Overriding ${override.key} ` +
            `(was: ${JSON.stringify(userValue)}, now: ${JSON.stringify(override.required)}). ` +
            `Reason: ${override.reason}`
        );
      }
    }
  }

  // Build the merged config
  const mergedConfig: UserConfig = {
    ...viteConfig,

    // These are always set by MCP Apps
    base: './',

    plugins: [
      // User plugins first
      ...(viteConfig.plugins || []),
      // Then our plugins
      viteSingleFile(),
      mcpAppPlugin(
        { projectRoot, outDir: outDirPath, viteConfig, views },
        configPath
      ),
    ],

    build: {
      ...viteConfig.build,

      outDir: outDirPath,
      emptyOutDir: true,
      // Hosts get only the HTML of a view, not the files next to it.
      copyPublicDir: false,

      // Critical overrides for single-file output
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      cssCodeSplit: false,

      rollupOptions: {
        ...viteConfig.build?.rollupOptions,
        input: firstEntry?.input,
      },
    },
  };

  return mergedConfig;
}

export default defineMCPAppsConfig;
