import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Plugin, UserConfig, UserConfigExport } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

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
const RESOLVED_VIRTUAL_PREFIX = `\0${VIRTUAL_PREFIX}`;

/**
 * The MCP App runtime is now handled by the ext-apps protocol
 * via `@modelcontextprotocol/ext-apps` React hooks bundled
 * into the app's JavaScript. No injected script is needed.
 *
 * Previously, this was a <script> tag that listened for
 * `postMessage({ props })` from the host. The ext-apps protocol
 * uses JSON-RPC 2.0 messages instead (ui/initialize, tool-result, etc.)
 */

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
 * Convert a name to kebab-case for HTML file output.
 */
function toKebabCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

/**
 * Information about an app extracted from the config file.
 */
interface AppInfo {
  /** The app's name (from createApp config) */
  name: string;
  /** The exported variable name */
  exportName: string;
  /** The component identifier */
  componentName: string;
  /** The component's import path (relative or package) */
  componentImportPath: string;
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

  // Parse imports to map component names to their paths
  const importMap = new Map<string, string>();
  const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[3];
    if (match[2]) {
      // Default import: import Foo from './foo'
      importMap.set(match[2], importPath);
    } else if (match[1]) {
      // Named imports: import { Foo, Bar as Baz } from './foo'
      const namedImports = match[1].split(',').map((s) => s.trim());
      for (const namedImport of namedImports) {
        const parts = namedImport.split(/\s+as\s+/);
        const localName = parts[1] || parts[0];
        importMap.set(localName.trim(), importPath);
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

    // Extract name property - look for the first name: '...' or name: "..."
    const nameMatch = configBody.match(/name\s*:\s*['"]([^'"]+)['"]/);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    // Extract component property - look for component: <identifier>
    const componentMatch = configBody.match(/component\s*:\s*(\w+)/);
    if (!componentMatch) continue;
    const componentName = componentMatch[1];

    // Look up the component's import path
    const componentImportPath = importMap.get(componentName);
    if (!componentImportPath) {
      console.warn(
        `[mcp-web-app] Warning: Could not find import for component "${componentName}" in app "${name}"`
      );
      continue;
    }

    apps.push({
      name,
      exportName,
      componentName,
      componentImportPath,
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
 * Generate a virtual module that renders an MCP App.
 */
function generateVirtualModule(
  componentPath: string,
  componentName: string
): string {
  return `
import { renderMCPApp } from '@mcp-web/app/internal';
import { ${componentName} } from '${componentPath}';

renderMCPApp(${componentName});
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

/**
 * Internal plugin that handles virtual modules and build process.
 */
function mcpAppPlugin(
  projectRoot: string,
  outDir: string,
  configPath: string | null
): Plugin {
  let apps: AppInfo[] = [];
  let configDir: string;
  const virtualModules = new Map<string, string>();
  const htmlEntries = new Map<string, string>();

  return {
    name: 'mcp-web-app',

    configResolved(_config) {
      // Store config for potential future use
    },

    buildStart() {
      // Clear previous state
      virtualModules.clear();
      htmlEntries.clear();

      if (!configPath) {
        console.log(
          '\n\u26A0 No MCP Apps config file found. Looking for src/mcp-apps.ts or src/mcp/apps.ts'
        );
        return;
      }

      configDir = path.dirname(configPath);
      apps = parseAppsConfig(configPath);

      if (apps.length === 0) {
        console.log(
          `\n\u26A0 No apps found in ${path.relative(projectRoot, configPath)}`
        );
        return;
      }

      // Generate virtual modules for each app
      for (const app of apps) {
        const kebabName = toKebabCase(app.name);
        const virtualId = `${VIRTUAL_PREFIX}${kebabName}`;
        const resolvedVirtualId = `${RESOLVED_VIRTUAL_PREFIX}${kebabName}`;

        // Resolve the component path
        const absoluteComponentPath = resolveComponentPath(
          app.componentImportPath,
          configDir
        );

        // Generate the virtual module content
        const moduleContent = generateVirtualModule(
          absoluteComponentPath,
          app.componentName
        );
        virtualModules.set(resolvedVirtualId, moduleContent);

        // Generate HTML entry
        const htmlContent = generateHTMLContent(kebabName, virtualId);
        const htmlPath = path.join(outDir, `${kebabName}.html`);
        htmlEntries.set(kebabName, htmlContent);

        // Write temporary HTML file for Vite to use as entry
        fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
      }

      console.log(
        `\n\u2139 Found ${apps.length} MCP App(s) in ${path.relative(projectRoot, configPath)}`
      );
    },

    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return `\0${id}`;
      }
      return null;
    },

    load(id) {
      // Handle virtual app modules
      if (id.startsWith(RESOLVED_VIRTUAL_PREFIX)) {
        return virtualModules.get(id) || null;
      }

      return null;
    },

    generateBundle() {
      // Don't emit additional HTML - let vite-plugin-singlefile handle the output
      // The inlined HTML will be at a nested path which we'll fix in closeBundle
    },

    closeBundle() {
      if (apps.length === 0) return;

      // The inlined HTML files are output to a nested path matching the temp directory structure
      // Move them to the root of the output directory
      const tempSubDir = path.join(outDir, 'node_modules', '.mcp-web-app-temp');

      if (fs.existsSync(tempSubDir)) {
        for (const app of apps) {
          const kebabName = toKebabCase(app.name);
          const srcPath = path.join(tempSubDir, `${kebabName}.html`);
          const destPath = path.join(outDir, `${kebabName}.html`);

          if (fs.existsSync(srcPath)) {
            // Move the inlined HTML to the root
            fs.copyFileSync(srcPath, destPath);
          }
        }

        // Clean up the nested directory
        fs.rmSync(path.join(outDir, 'node_modules'), { recursive: true, force: true });
      }

      const relOutDir = path.relative(projectRoot, outDir);
      console.log(`\n\u2713 Built ${apps.length} MCP App(s) to ${relOutDir}/`);
      for (const app of apps) {
        const kebabName = toKebabCase(app.name);
        console.log(`   - ${kebabName}.html (${app.exportName})`);
      }
    },
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

  // Parse apps to generate rollup inputs
  let apps: AppInfo[] = [];
  let tempHtmlDir: string | null = null;
  const input: Record<string, string> = {};

  if (configPath) {
    apps = parseAppsConfig(configPath);

    if (apps.length > 0) {
      // Create a temp directory for HTML entries
      tempHtmlDir = path.join(projectRoot, 'node_modules', '.mcp-web-app-temp');
      fs.mkdirSync(tempHtmlDir, { recursive: true });

      // Generate HTML entries for rollup input
      for (const app of apps) {
        const kebabName = toKebabCase(app.name);
        const htmlPath = path.join(tempHtmlDir, `${kebabName}.html`);
        const virtualModulePath = `${VIRTUAL_PREFIX}${kebabName}`;

        const htmlContent = generateHTMLContent(kebabName, virtualModulePath);
        fs.writeFileSync(htmlPath, htmlContent);

        input[kebabName] = htmlPath;
      }
    }
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
      mcpAppPlugin(projectRoot, outDirPath, configPath),
    ],

    build: {
      ...viteConfig.build,

      outDir: outDirPath,
      emptyOutDir: true,

      // Critical overrides for single-file output
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      cssCodeSplit: false,

      rollupOptions: {
        ...viteConfig.build?.rollupOptions,
        input: Object.keys(input).length > 0 ? input : undefined,
      },
    },
  };

  return mergedConfig;
}

export default defineMCPAppsConfig;
