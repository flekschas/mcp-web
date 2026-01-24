import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: 'dist/standalone.js',
  banner: {
    js: '#!/usr/bin/env node',
  },
  minify: false,
  sourcemap: false,
});

console.log('✓ Built standalone bundle: dist/standalone.js');
