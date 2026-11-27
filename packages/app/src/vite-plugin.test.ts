import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { UserConfig } from 'vite';
import { defineMCPAppsConfig } from '../src/vite-plugin';

describe('defineMCPAppsConfig', () => {
  test('returns a Vite config object', () => {
    const config = defineMCPAppsConfig() as UserConfig;

    expect(config).toBeDefined();
    expect(config.base).toBe('./');
    expect(config.build).toBeDefined();
  });

  test('sets critical build options for single-file output', () => {
    const config = defineMCPAppsConfig() as UserConfig;

    expect(config.build?.assetsInlineLimit).toBe(Number.MAX_SAFE_INTEGER);
    expect(config.build?.cssCodeSplit).toBe(false);
    expect(config.build?.emptyOutDir).toBe(true);
  });

  test('includes viteSingleFile and mcpAppPlugin plugins', () => {
    const config = defineMCPAppsConfig() as UserConfig;

    expect(config.plugins).toBeDefined();
    expect(Array.isArray(config.plugins)).toBe(true);

    const pluginNames = (config.plugins as Array<{ name?: string }>)
      .filter((p) => p && typeof p === 'object' && 'name' in p)
      .map((p) => p.name);

    expect(pluginNames).toContain('vite:singlefile');
    expect(pluginNames).toContain('mcp-web-app');
  });

  test('merges user plugins with internal plugins', () => {
    const userPlugin = { name: 'user-plugin' };
    const config = defineMCPAppsConfig({
      plugins: [userPlugin],
    }) as UserConfig;

    const pluginNames = (config.plugins as Array<{ name?: string }>)
      .filter((p) => p && typeof p === 'object' && 'name' in p)
      .map((p) => p.name);

    expect(pluginNames).toContain('user-plugin');
    expect(pluginNames).toContain('vite:singlefile');
    expect(pluginNames).toContain('mcp-web-app');
  });

  test('user plugins come before internal plugins', () => {
    const userPlugin = { name: 'user-plugin' };
    const config = defineMCPAppsConfig({
      plugins: [userPlugin],
    }) as UserConfig;

    const pluginNames = (config.plugins as Array<{ name?: string }>)
      .filter((p) => p && typeof p === 'object' && 'name' in p)
      .map((p) => p.name);

    const userIndex = pluginNames.indexOf('user-plugin');
    const singleFileIndex = pluginNames.indexOf('vite:singlefile');

    expect(userIndex).toBeLessThan(singleFileIndex);
  });

  test('accepts custom appsConfig and outDir', () => {
    const config = defineMCPAppsConfig(
      {},
      {
        appsConfig: 'custom/apps.ts',
        outDir: 'custom/output',
      }
    ) as UserConfig;

    expect(config).toBeDefined();
    expect(config.build?.outDir).toContain('custom/output');
  });

  test('preserves user build options that are not critical', () => {
    const config = defineMCPAppsConfig({
      build: {
        sourcemap: true,
        minify: 'terser',
      },
    }) as UserConfig;

    expect(config.build?.sourcemap).toBe(true);
    expect(config.build?.minify).toBe('terser');
  });

  test('overrides critical settings even if user provides them', () => {
    const config = defineMCPAppsConfig({
      build: {
        assetsInlineLimit: 100,
        cssCodeSplit: true,
      },
    }) as UserConfig;

    // Critical settings should be overridden
    expect(config.build?.assetsInlineLimit).toBe(Number.MAX_SAFE_INTEGER);
    expect(config.build?.cssCodeSplit).toBe(false);
  });

  test('default export is same as named export', async () => {
    const { default: defaultExport, defineMCPAppsConfig: namedExport } =
      await import('../src/vite-plugin');
    expect(defaultExport).toBe(namedExport);
  });
});

type TestPlugin = {
  name?: string;
  load?: (id: string) => string | null;
};

/**
 * Creates a project with `files`, and passes its directory to `run`, which
 * the plugin reads as the working directory.
 */
async function withProject(
  files: Record<string, string>,
  run: (projectDir: string) => unknown
) {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-web-app-'));
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(projectDir, file)), {
      recursive: true,
    });
    fs.writeFileSync(path.join(projectDir, file), content);
  }
  try {
    await run(projectDir);
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
}

/** Reads the config in `projectDir`, as `defineMCPAppsConfig` runs there. */
function defineConfigIn(projectDir: string, viteConfig: UserConfig = {}) {
  const workingDirectory = process.cwd();
  process.chdir(projectDir);
  try {
    return defineMCPAppsConfig(viteConfig, { outDir: 'out' }) as UserConfig;
  } finally {
    process.chdir(workingDirectory);
  }
}

function findPlugin(config: UserConfig) {
  return (config.plugins as TestPlugin[]).find(
    (plugin) => plugin?.name === 'mcp-web-app'
  );
}

describe('mcp-web-app plugin', () => {
  test('passes the name and version of each app to its view', async () => {
    await withProject(
      {
        'package.json': JSON.stringify({ name: 'todo', version: '1.4.2' }),
        'src/mcp-apps.ts': `import { Stats } from './stats';
export const statsApp = createApp({
  name: 'show_stats',
  description: 'Show statistics',
  component: Stats,
  // The version of a prop is not the app's version: version: '9.9.9'
  handler: () => ({ version: 'beta', name: 'other' }),
});
export const chartApp = createApp({
  name: 'show_chart',
  description: 'Show a chart',
  version: '2.0.0',
  component: Stats,
  handler: () => ({}),
});
export const tableApp = createApp({
  name: 'show_table',
  version: '2.' + '0',
  component: Stats,
});
`,
      },
      (projectDir) => {
        const plugin = findPlugin(defineConfigIn(projectDir));

        expect(plugin?.load?.('\0virtual:mcp-app/show-stats')).toContain(
          'renderMCPApp(Stats, {"name":"show_stats","version":"1.4.2"})'
        );
        expect(plugin?.load?.('\0virtual:mcp-app/show-chart')).toContain(
          'renderMCPApp(Stats, {"name":"show_chart","version":"2.0.0"})'
        );
        expect(plugin?.load?.('\0virtual:mcp-app/show-table')).toContain(
          'renderMCPApp(Stats, {"name":"show_table","version":"1.4.2"})'
        );
      }
    );
  });

  test('imports each component the way the apps config does', async () => {
    await withProject(
      {
        'src/mcp-apps.ts': `import Chart from './chart';
import { Table as DataTable, Stats } from './views';
export const chartApp = createApp({ name: 'chart', component: Chart });
export const tableApp = createApp({ name: 'table', component: DataTable });
export const statsApp = createApp({ name: 'stats', component: Stats });
`,
      },
      (projectDir) => {
        const plugin = findPlugin(defineConfigIn(projectDir));

        expect(plugin?.load?.('\0virtual:mcp-app/chart')).toContain(
          'import Chart from'
        );
        expect(plugin?.load?.('\0virtual:mcp-app/table')).toContain(
          'import { Table as DataTable } from'
        );
        expect(plugin?.load?.('\0virtual:mcp-app/stats')).toContain(
          'import { Stats } from'
        );
      }
    );
  });

  test('refuses two views that would be built to the same file', async () => {
    await withProject(
      {
        'index.html': '<html></html>',
        'src/config.ts': 'export default { mcpApp: true };',
        'src/mcp-apps.ts': `import { Home } from './home';
export const homeApp = createApp({ name: 'index', component: Home });
`,
      },
      (projectDir) => {
        expect(() => defineConfigIn(projectDir)).toThrow(
          'the app "index" and the page index.html that `mcpApp` opens would both be built to index.html'
        );
      }
    );
  });

  test(
    'builds every view in the mode and output folder of the build',
    async () => {
      const { build } = await import('vite');
      const page = (body: string) =>
        `<!DOCTYPE html><html><head><title>View</title><link rel="icon" type="image/svg+xml" href="./favicon.svg" /></head><body>${body}<script type="module" src="./src/main.ts"></script></body></html>`;
      await withProject(
        {
          'index.html': page(''),
          'admin.html': page('<img src="/logo.svg" />'),
          'public/logo.svg': '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
          'favicon.svg': '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
          'src/main.ts': 'document.title = import.meta.env.MODE;',
          'src/config.ts': `export const todo = { mcpApp: true };
export const admin = { mcpApp: { page: 'admin.html' } };
`,
        },
        async (projectDir) => {
          const warnings: string[] = [];
          const warn = console.warn;
          const log = console.log;
          console.warn = (message: string) => warnings.push(message);
          console.log = () => {};
          try {
            const config = defineConfigIn(projectDir) as UserConfig;
            await build({
              ...config,
              configFile: false,
              root: projectDir,
              mode: 'staging',
              // Like `--outDir chosen`
              build: { ...config.build, outDir: 'chosen' },
              logLevel: 'silent',
            });
          } finally {
            console.warn = warn;
            console.log = log;
          }

          for (const view of ['index.html', 'admin.html']) {
            const html = fs.readFileSync(
              path.join(projectDir, 'chosen', view),
              'utf-8'
            );
            expect(html).toContain('`staging`');
            expect(html).not.toContain('rel="icon"');
            expect(html).not.toContain('<script type="module" src=');
          }
          // Only the views, without the icon file
          expect(fs.readdirSync(path.join(projectDir, 'chosen')).sort()).toEqual([
            'admin.html',
            'index.html',
          ]);
          expect(warnings).toEqual([
            expect.stringContaining('admin.html loads /logo.svg'),
          ]);
        }
      );
    },
    30_000
  );

  test('stops a build without views', async () => {
    const { build } = await import('vite');
    await withProject({ 'index.html': '<html></html>' }, async (projectDir) => {
      await expect(
        build({
          ...defineConfigIn(projectDir),
          configFile: false,
          root: projectDir,
          logLevel: 'silent',
        })
      ).rejects.toThrow('No views to build');
      expect(fs.existsSync(path.join(projectDir, 'out'))).toBe(false);
    });
  });
});
