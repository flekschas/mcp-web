#!/usr/bin/env tsx
/**
 * Build script for MCP-Web demos
 *
 * This script builds all demos and copies the output to the deploy directories.
 * It's primarily used by GitHub Actions for deployment to Deno Deploy Classic.
 *
 * Usage:
 *   pnpm build:demos        # Build all demos for deployment
 *   tsx scripts/build-demos.ts
 *
 * Note: For local development, use the demos/<demo> directories directly:
 *   cd demos/todo && pnpm dev
 *   cd demos/checkers && pnpm dev
 */

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = dirname(__dirname);

const DEMOS = ['higlass', 'todo', 'checkers'] as const;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}

function getDirectorySize(dirPath: string): number {
  let totalSize = 0;
  
  if (!existsSync(dirPath)) return 0;
  
  const entries = readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      totalSize += getDirectorySize(fullPath);
    } else {
      totalSize += statSync(fullPath).size;
    }
  }
  
  return totalSize;
}

function run(command: string, cwd?: string): void {
  console.log(`> ${command}`);
  execSync(command, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });
}

async function main() {
  console.log('Building MCP-Web demos for deployment...');
  console.log(`Root directory: ${ROOT_DIR}\n`);

  // Ensure deploy directories exist
  for (const demo of DEMOS) {
    const deployDir = join(ROOT_DIR, 'demos', 'deploy', demo, 'static');
    mkdirSync(deployDir, { recursive: true });
  }

  // Build each demo
  for (const demo of DEMOS) {
    console.log('');
    console.log('==========================================');
    console.log(`Building ${demo}...`);
    console.log('==========================================');

    const demoDir = join(ROOT_DIR, 'demos', demo);
    const distDir = join(demoDir, 'dist');
    const deployDir = join(ROOT_DIR, 'demos', 'deploy', demo, 'static');

    // Build with production environment
    console.log(`Building ${demo} with production config...`);
    run('pnpm build', demoDir);

    // Clear deploy directory and copy build output
    console.log(`Copying build to demos/deploy/${demo}/static/...`);
    
    if (existsSync(deployDir)) {
      rmSync(deployDir, { recursive: true });
    }
    mkdirSync(deployDir, { recursive: true });
    
    cpSync(distDir, deployDir, { recursive: true });

    console.log(`✅ Built ${demo} -> demos/deploy/${demo}/static/`);
  }

  console.log('');
  console.log('==========================================');
  console.log('All demos built successfully!');
  console.log('==========================================');
  console.log('');
  console.log('Deploy directories:');
  
  for (const demo of DEMOS) {
    const deployDir = join(ROOT_DIR, 'demos', 'deploy', demo, 'static');
    const size = formatSize(getDirectorySize(deployDir));
    console.log(`  - demos/deploy/${demo}/static/ (${size})`);
  }

  console.log('');
  console.log('These builds are used by GitHub Actions for deployment.');
  console.log('See .github/workflows/deploy-demos.yml for the deployment workflow.');
}

main().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
