#!/usr/bin/env tsx
/**
 * Bundle script for MCP-Web demo servers
 *
 * Uses esbuild to create self-contained bundles for deployment.
 * Supports two targets:
 * - Deno Deploy: Bundles all deps except Deno std library imports.
 *   Uses a bridge shim to avoid Node-specific adapters (ws, etc.)
 * - Node.js (Render, Railway, etc.): Bundles everything including ws and sirv.
 *   Resolves the full @mcp-web/bridge package.
 *
 * Usage:
 *   pnpm bundle:servers
 *   tsx scripts/bundle-servers.ts
 *
 * Outputs:
 *   - demos/deploy/higlass/server.bundle.js    (Deno)
 *   - demos/deploy/todo/server.bundle.js       (Deno)
 *   - demos/deploy/todo/server.node.bundle.js  (Node.js)
 *   - demos/deploy/checkers/server.bundle.js   (Deno)
 *   - demos/deploy/checkers/agent.bundle.js    (Deno)
 */

import * as esbuild from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = dirname(__dirname);

type ServerTarget = 'deno' | 'node';

interface ServerEntry {
  entry: string;
  out: string;
  target: ServerTarget;
}

const SERVERS: ServerEntry[] = [
  // Deno Deploy targets
  { entry: 'demos/deploy/higlass/main.ts', out: 'demos/deploy/higlass/server.bundle.js', target: 'deno' },
  { entry: 'demos/deploy/todo/main.ts', out: 'demos/deploy/todo/server.bundle.js', target: 'deno' },
  { entry: 'demos/deploy/checkers/main.ts', out: 'demos/deploy/checkers/server.bundle.js', target: 'deno' },
  { entry: 'demos/deploy/checkers/serve-agent.ts', out: 'demos/deploy/checkers/agent.bundle.js', target: 'deno' },
  // Node.js targets (for Render, Railway, etc.)
  { entry: 'demos/deploy/todo/main-node.ts', out: 'demos/deploy/todo/server.node.bundle.js', target: 'node' },
];

/**
 * esbuild plugin to resolve @mcp-web/* workspace packages for Deno Deploy.
 *
 * For Deno Deploy, we need to avoid bundling Node-specific adapters
 * (which include 'ws' that uses require('events'), etc.)
 *
 * Instead of importing from the main index.js (which re-exports everything),
 * we resolve to specific submodules:
 * - @mcp-web/bridge -> core.js and runtime/index.js (no Node adapter)
 * - @mcp-web/types -> index.js
 * - @mcp-web/client -> index.js
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

/**
 * esbuild plugin to resolve @mcp-web/* workspace packages for Node.js.
 *
 * For Node.js targets, we resolve to the full dist/ output of each package,
 * which includes the Node adapter and all its dependencies (ws, etc.).
 */
function mcpWebNodeResolverPlugin(): esbuild.Plugin {
  return {
    name: 'mcp-web-node-resolver',
    setup(build) {
      // Handle @mcp-web/bridge - use the full package (includes Node adapter, ws, etc.)
      build.onResolve({ filter: /^@mcp-web\/bridge$/ }, () => {
        return {
          path: join(ROOT_DIR, 'packages/bridge/dist/index.js'),
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
  console.log('Bundling MCP-Web demo servers...\n');

  for (const server of SERVERS) {
    const entryPoint = join(ROOT_DIR, server.entry);
    const outfile = join(ROOT_DIR, server.out);
    const isDeno = server.target === 'deno';

    console.log(`Bundling ${server.entry} (${server.target})...`);

    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'esnext',
      outfile,
      plugins: [isDeno ? mcpWebResolverPlugin() : mcpWebNodeResolverPlugin()],
      // Deno: externalize Deno std library (resolved at runtime by Deno Deploy)
      // Node: no externals — bundle everything into a self-contained file
      external: isDeno ? ['https://deno.land/*'] : [],
      // For Node targets, add package node_modules so esbuild can resolve
      // transitive dependencies like `ws` (which lives in packages/bridge/node_modules/)
      nodePaths: isDeno ? [] : [
        join(ROOT_DIR, 'packages/bridge/node_modules'),
        join(ROOT_DIR, 'node_modules'),
      ],
      banner: {
        js: [
          '// Auto-generated bundle - do not edit directly',
          `// Source: ${server.entry}`,
          `// Target: ${server.target}`,
          // For Node targets, create a proper require() function for CJS interop.
          // esbuild generates a __require shim that throws when CommonJS modules
          // (like ws) use require('events'), require('stream'), etc. This banner
          // provides a real require() via createRequire() so those calls work.
          ...(!isDeno ? [
            `import { createRequire as __bundleCreateRequire } from 'node:module';`,
            `const require = __bundleCreateRequire(import.meta.url);`,
          ] : []),
        ].join('\n'),
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
