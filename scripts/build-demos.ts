#!/usr/bin/env tsx
/**
 * Builds the demo frontends the way the deploy workflow does.
 *
 * Each demo's own `mcp-web.config.ts` points at localhost. The deployed config
 * lives in `demos/deploy/<demo>/`, so it is swapped in for the build and put
 * back afterwards — building without the swap produces a bundle that talks to
 * localhost from the public demo.
 *
 * Wrangler serves `demos/<demo>/dist` directly, so nothing is copied.
 *
 * Usage:
 *   pnpm build:demos
 *
 * For local development use the demo directories directly:
 *   cd demos/todo && pnpm dev
 */

import { execSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const DEMOS = ['higlass', 'todo', 'checkers'] as const;
const CONFIG = 'mcp-web.config.ts';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}

function directorySize(dirPath: string): number {
  if (!existsSync(dirPath)) return 0;

  return readdirSync(dirPath, { withFileTypes: true }).reduce(
    (total, entry) => {
      const fullPath = join(dirPath, entry.name);
      return (
        total +
        (entry.isDirectory()
          ? directorySize(fullPath)
          : statSync(fullPath).size)
      );
    },
    0,
  );
}

function buildWithDeployConfig(demo: string): void {
  const demoDir = join(ROOT_DIR, 'demos', demo);
  const demoConfig = join(demoDir, CONFIG);
  const deployConfig = join(ROOT_DIR, 'demos', 'deploy', demo, CONFIG);
  const backup = `${demoConfig}.local`;

  copyFileSync(demoConfig, backup);
  try {
    copyFileSync(deployConfig, demoConfig);
    console.log(`> pnpm build (${demo})`);
    execSync('pnpm build', {
      cwd: demoDir,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    });
  } finally {
    copyFileSync(backup, demoConfig);
    rmSync(backup);
  }
}

function main(): void {
  console.log('Building MCP-Web demos with their deploy configs...\n');

  for (const demo of DEMOS) {
    console.log('==========================================');
    console.log(`Building ${demo}...`);
    console.log('==========================================');
    buildWithDeployConfig(demo);
  }

  console.log('\nBuilt:');
  for (const demo of DEMOS) {
    const dist = join(ROOT_DIR, 'demos', demo, 'dist');
    console.log(`  - demos/${demo}/dist (${formatSize(directorySize(dist))})`);
  }
  console.log('\nDeploy with: cd demos/deploy && pnpm deploy:<demo>');
}

try {
  main();
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
