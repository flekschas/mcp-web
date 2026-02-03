import { describe, expect, test } from 'bun:test';
import { defineMCPAppsConfig } from '../src/vite-plugin';
import type { UserConfig } from 'vite';

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
