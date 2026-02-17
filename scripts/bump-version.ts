#!/usr/bin/env tsx
/**
 * Bump all workspace package versions in lockstep.
 *
 * Usage:
 *   pnpm bump patch      # 0.1.0 -> 0.1.1
 *   pnpm bump minor      # 0.1.0 -> 0.2.0
 *   pnpm bump major      # 0.1.0 -> 1.0.0
 *   pnpm bump 1.2.3      # set exact version
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = dirname(__dirname);

const BUMP_TYPES = ['major', 'minor', 'patch'] as const;
type BumpType = (typeof BUMP_TYPES)[number];

function isBumpType(arg: string): arg is BumpType {
  return BUMP_TYPES.includes(arg as BumpType);
}

function isSemver(arg: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(arg);
}

function bumpVersion(current: string, type: BumpType): string {
  const [major, minor, patch] = current.split('.').map(Number);
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

function main() {
  const arg = process.argv[2];

  if (!arg || (!isBumpType(arg) && !isSemver(arg))) {
    console.error('Usage: pnpm bump <major|minor|patch|x.y.z>');
    process.exit(1);
  }

  const rootPkg = JSON.parse(
    readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8'),
  );
  const current = rootPkg.version;
  const next = isBumpType(arg) ? bumpVersion(current, arg) : arg;

  console.log(`Bumping all packages: ${current} -> ${next}\n`);

  // Bump root
  execSync(`npm version ${next} --no-git-tag-version`, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });

  // Bump all workspace packages
  execSync(`pnpm -r exec npm version ${next} --no-git-tag-version`, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });

  console.log(`\nAll packages bumped to ${next}`);
}

main();
