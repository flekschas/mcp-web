import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { join } from 'node:path';
import type { Condition, RunnerOptions } from './types.js';
import { run } from './runner.js';

// Load .env file if present (Node's --env-file may not always be used)
try {
  const envPath = join(import.meta.dirname, '..', '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // No .env file — that's fine, keys may be in environment already
}

const { values } = parseArgs({
  options: {
    models: { type: 'string', default: '' },
    apps: { type: 'string', default: '' },
    conditions: { type: 'string', default: 'normal-tools,code-tool' },
    reps: { type: 'string', default: '3' },
    'max-steps': { type: 'string', default: '20' },
    timeout: { type: 'string', default: '120000' },
    output: { type: 'string', default: '' },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: true,
});

if (values.help) {
  console.log(`
Usage: tsx evals/code-vs-tools/src/cli.ts [options]

Options:
  --models <ids>       Comma-separated model IDs (default: all)
  --apps <names>       Comma-separated app names (default: all)
  --conditions <c>     Comma-separated: normal-tools,code-tool (default: both)
  --reps <n>           Repetitions per case (default: 3)
  --max-steps <n>      Max ToolLoopAgent steps (default: 20)
  --timeout <ms>       Per-run timeout (default: 120000)
  --output <dir>       Results directory (default: evals/code-vs-tools/results)
  --dry-run            Print run matrix without executing
  -h, --help           Show this help message

Models:
  claude-opus-4.6, claude-sonnet-4.6, gpt-5.2, gemini-3.1-pro,
  kimi-k2.5, minimax-m2.5, glm-5, qwen-3.5, gpt-oss-120b

Environment variables:
  ANTHROPIC_API_KEY     For Claude models
  OPENAI_API_KEY        For GPT models
  GOOGLE_API_KEY        For Gemini models
  OPENROUTER_API_KEY    For Kimi, MiniMax, GLM, Qwen (via OpenRouter)
`);
  process.exit(0);
}

function splitCsv(s: string): string[] {
  return s
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

const defaultOutputDir = join(import.meta.dirname, '..', 'results');

const options: RunnerOptions = {
  models: splitCsv(values.models ?? ''),
  apps: splitCsv(values.apps ?? ''),
  conditions: splitCsv(values.conditions ?? 'normal-tools,code-tool') as Condition[],
  reps: Number.parseInt(values.reps ?? '3', 10),
  maxSteps: Number.parseInt(values['max-steps'] ?? '20', 10),
  timeout: Number.parseInt(values.timeout ?? '120000', 10),
  outputDir: values.output || defaultOutputDir,
  dryRun: values['dry-run'] ?? false,
};

// Validate conditions
for (const c of options.conditions) {
  if (c !== 'normal-tools' && c !== 'code-tool') {
    console.error(`Invalid condition: ${c}. Must be "normal-tools" or "code-tool".`);
    process.exit(1);
  }
}

console.log('=== Code vs Tools Eval ===\n');

run(options).then(
  () => process.exit(0),
  (err) => {
    console.error('\nFatal error:', err);
    process.exit(1);
  },
);
