#!/usr/bin/env tsx
/**
 * Bundle script for MCP-Web demo servers
 *
 * Uses esbuild to create self-contained bundles for Deno Deploy.
 * Bundles all dependencies except Deno std library imports.
 *
 * Usage:
 *   pnpm bundle:servers
 *   tsx scripts/bundle-servers.ts
 *
 * Outputs:
 *   - demos/deploy/higlass/server.bundle.js
 *   - demos/deploy/todo/server.bundle.js
 *   - demos/deploy/checkers/server.bundle.js
 *   - demos/deploy/checkers/agent.bundle.js
 */

import * as esbuild from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = dirname(__dirname);

const SERVERS = [
  { entry: 'demos/deploy/higlass/main.ts', out: 'demos/deploy/higlass/server.bundle.js' },
  { entry: 'demos/deploy/todo/main.ts', out: 'demos/deploy/todo/server.bundle.js' },
  { entry: 'demos/deploy/checkers/main.ts', out: 'demos/deploy/checkers/server.bundle.js' },
  { entry: 'demos/deploy/checkers/serve-agent.ts', out: 'demos/deploy/checkers/agent.bundle.js' },
];

/**
 * esbuild plugin to resolve @mcp-web/* workspace packages
 *
 * For Deno Deploy, we need to avoid bundling Node-specific adapters
 * (which include 'ws' that uses require('events'), etc.)
 *
 * Instead of importing from the main index.js (which re-exports everything),
 * we resolve to specific submodules:
 * - @mcp-web/bridge → core.js and runtime/index.js (no Node adapter)
 * - @mcp-web/types → index.js
 * - @mcp-web/client → index.js
 */
function mcpWebResolverPlugin(): esbuild.Plugin {
  return {
    name: 'mcp-web-resolver',
    setup(build) {
      // Handle @mcp-web/bridge - use a virtual module that only exports what we need
      build.onResolve({ filter: /^@mcp-web\/bridge$/ }, () => {
        return {
          path: '@mcp-web/bridge',
          namespace: 'mcp-web-bridge-shim',
        };
      });

      // Create a virtual module that only imports the Deno-compatible parts
      build.onLoad({ filter: /.*/, namespace: 'mcp-web-bridge-shim' }, () => {
        return {
          contents: `
            export { MCPWebBridge } from '${join(ROOT_DIR, 'packages/bridge/dist/core.js')}';
            export { TimerScheduler, NoopScheduler } from '${join(ROOT_DIR, 'packages/bridge/dist/runtime/index.js')}';
          `,
          loader: 'js',
          resolveDir: ROOT_DIR,
        };
      });

      // Handle @mcp-web/types - use the full index
      build.onResolve({ filter: /^@mcp-web\/types$/ }, () => {
        return {
          path: join(ROOT_DIR, 'packages/types/dist/index.js'),
        };
      });

      // Handle @mcp-web/client - use the full index
      build.onResolve({ filter: /^@mcp-web\/client$/ }, () => {
        return {
          path: join(ROOT_DIR, 'packages/client/dist/index.js'),
        };
      });
    },
  };
}

async function main() {
  console.log('Bundling MCP-Web demo servers for Deno Deploy...\n');

  for (const server of SERVERS) {
    const entryPoint = join(ROOT_DIR, server.entry);
    const outfile = join(ROOT_DIR, server.out);

    console.log(`Bundling ${server.entry}...`);

    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: 'node', // Deno supports node: imports
      format: 'esm',
      target: 'esnext',
      outfile,
      plugins: [mcpWebResolverPlugin()],
      // Externalize Deno std library - Deno Deploy can resolve these
      external: ['https://deno.land/*'],
      // Keep node: imports external - Deno handles these natively
      // But bundle everything else (npm packages like ajv, ws, etc.)
      // Actually, we need to be smarter here - mark node built-ins as external
      // so Deno can handle them via its Node compat layer
      banner: {
        js: '// Auto-generated bundle - do not edit directly\n// Source: ' + server.entry,
      },
    });

    console.log(`  -> ${server.out}`);
  }

  console.log('\nAll servers bundled successfully!');
}

main().catch((error) => {
  console.error('Bundle failed:', error);
  process.exit(1);
});
