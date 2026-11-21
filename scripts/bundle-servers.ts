#!/usr/bin/env tsx
/**
 * Bundle script for MCP-Web demo servers
 *
 * Uses esbuild to create self-contained Node.js bundles for deployment
 * (Render, Railway, etc.). Bundles everything including ws and sirv.
 *
 * Usage:
 *   pnpm bundle:servers
 *   tsx scripts/bundle-servers.ts
 *
 * Outputs:
 *   - demos/deploy/higlass/server.node.bundle.js
 *   - demos/deploy/todo/server.node.bundle.js
 *   - demos/deploy/checkers/server.node.bundle.js
 *   - demos/deploy/checkers/agent.node.bundle.js
 */

import * as esbuild from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = dirname(__dirname);

interface ServerEntry {
  entry: string;
  out: string;
  /** Extra node_modules directories to search for dependencies */
  extraNodePaths?: string[];
}

const SERVERS: ServerEntry[] = [
  { entry: 'demos/deploy/todo/main-node.ts', out: 'demos/deploy/todo/server.node.bundle.js' },
  { entry: 'demos/deploy/higlass/main-node.ts', out: 'demos/deploy/higlass/server.node.bundle.js' },
  { entry: 'demos/deploy/checkers/main-node.ts', out: 'demos/deploy/checkers/server.node.bundle.js' },
  { entry: 'demos/deploy/checkers/serve-agent-node.ts', out: 'demos/deploy/checkers/agent.node.bundle.js', extraNodePaths: ['demos/checkers/node_modules'] },
];

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

    console.log(`Bundling ${server.entry}...`);

    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'esnext',
      outfile,
      plugins: [mcpWebNodeResolverPlugin()],
      // Add package node_modules so esbuild can resolve transitive
      // dependencies like `ws` (which lives in packages/bridge/node_modules/)
      nodePaths: [
        join(ROOT_DIR, 'packages/bridge/node_modules'),
        join(ROOT_DIR, 'node_modules'),
        ...(server.extraNodePaths ?? []).map((p) => join(ROOT_DIR, p)),
      ],
      banner: {
        js: [
          '// Auto-generated bundle - do not edit directly',
          `// Source: ${server.entry}`,
          // Create a proper require() function for CJS interop.
          // esbuild generates a __require shim that throws when CommonJS modules
          // (like ws) use require('events'), require('stream'), etc. This banner
          // provides a real require() via createRequire() so those calls work.
          `import { createRequire as __bundleCreateRequire } from 'node:module';`,
          `const require = __bundleCreateRequire(import.meta.url);`,
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
