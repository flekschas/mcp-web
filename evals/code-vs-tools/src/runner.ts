import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from '@playwright/test';
import { type ChildProcess, spawn } from 'node:child_process';
import type {
  Condition,
  EvalRun,
  ModelConfig,
  RunnerOptions,
  TestApp,
} from './types.js';
import { MODEL_REGISTRY, getModelConfig } from './models/registry.js';
import { createModel } from './models/create-model.js';
import { appList, apps } from './apps/index.js';
import { runNormalTools } from './conditions/normal-tools.js';
import { runCodeTool } from './conditions/code-tool.js';
import { collectRun } from './metrics/collector.js';

// ---------------------------------------------------------------------------
// Vite dev server management
// ---------------------------------------------------------------------------

async function startViteServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const vite = spawn('npx', ['vite', '--port', '5191'], {
      cwd: join(import.meta.dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timeout = setTimeout(() => {
      vite.kill();
      reject(new Error('Vite server failed to start within 15 seconds'));
    }, 15_000);

    vite.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('Local:') || output.includes('5191')) {
        clearTimeout(timeout);
        resolve(vite);
      }
    });

    vite.stderr?.on('data', (data: Buffer) => {
      console.error('[vite]', data.toString());
    });

    vite.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ---------------------------------------------------------------------------
// Results I/O
// ---------------------------------------------------------------------------

function initResultsFile(outputDir: string): string {
  mkdirSync(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return join(outputDir, `${timestamp}.jsonl`);
}

function appendResult(filePath: string, run: EvalRun): void {
  appendFileSync(filePath, JSON.stringify(run) + '\n');
}

function writeSummary(filePath: string, runs: EvalRun[]): void {
  const summaryPath = filePath.replace('.jsonl', '-summary.json');

  // Group by model x condition
  const groups: Record<string, EvalRun[]> = {};
  for (const run of runs) {
    const key = `${run.model}:${run.condition}`;
    (groups[key] ??= []).push(run);
  }

  const summary: Record<
    string,
    {
      model: string;
      condition: Condition;
      n: number;
      meanSuccessScore: number;
      exactMatchRate: number;
      meanWallClockMs: number;
      meanToolCalls: number;
      meanInnerToolCalls: number;
      meanTotalTokens: number;
      errorRate: number;
    }
  > = {};

  for (const [key, groupRuns] of Object.entries(groups)) {
    const [model, condition] = key.split(':') as [string, Condition];
    const n = groupRuns.length;
    const mean = (fn: (r: EvalRun) => number) =>
      groupRuns.reduce((s, r) => s + fn(r), 0) / n;

    summary[key] = {
      model: model!,
      condition: condition!,
      n,
      meanSuccessScore: mean((r) => r.success.normalizedScore),
      exactMatchRate: mean((r) => (r.success.exact ? 1 : 0)),
      meanWallClockMs: mean((r) => r.wallClockMs),
      meanToolCalls: mean((r) => r.toolCallCount),
      meanInnerToolCalls: mean((r) => r.innerToolCallCount),
      meanTotalTokens: mean((r) => r.tokens.total),
      errorRate: mean((r) => (r.error ? 1 : 0)),
    };
  }

  writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        meta: {
          timestamp: new Date().toISOString(),
          totalRuns: runs.length,
          models: [...new Set(runs.map((r) => r.model))],
          conditions: [...new Set(runs.map((r) => r.condition))],
          apps: [...new Set(runs.map((r) => r.app))],
        },
        byModelCondition: summary,
      },
      null,
      2,
    ),
  );

  console.log(`\nSummary written to ${summaryPath}`);
}

// ---------------------------------------------------------------------------
// Run matrix generation
// ---------------------------------------------------------------------------

interface RunSpec {
  model: ModelConfig;
  app: TestApp;
  caseId: string;
  condition: Condition;
  repetition: number;
}

function buildRunMatrix(options: RunnerOptions): RunSpec[] {
  const specs: RunSpec[] = [];

  const selectedModels =
    options.models.length > 0
      ? options.models.map((id) => {
          const config = getModelConfig(id);
          if (!config) throw new Error(`Unknown model: ${id}`);
          return config;
        })
      : MODEL_REGISTRY;

  const selectedApps =
    options.apps.length > 0
      ? options.apps.map((name) => {
          const app = apps[name];
          if (!app) throw new Error(`Unknown app: ${name}`);
          return app;
        })
      : appList;

  for (const model of selectedModels) {
    for (const app of selectedApps) {
      for (const testCase of app.cases) {
        for (const condition of options.conditions) {
          for (let rep = 1; rep <= options.reps; rep++) {
            specs.push({
              model,
              app,
              caseId: testCase.id,
              condition,
              repetition: rep,
            });
          }
        }
      }
    }
  }

  return specs;
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export async function run(options: RunnerOptions): Promise<void> {
  const specs = buildRunMatrix(options);

  if (options.dryRun) {
    console.log('\n--- DRY RUN ---\n');
    console.log(`Total runs: ${specs.length}`);
    console.log(
      `Models: ${[...new Set(specs.map((s) => s.model.id))].join(', ')}`,
    );
    console.log(
      `Apps: ${[...new Set(specs.map((s) => s.app.name))].join(', ')}`,
    );
    console.log(
      `Conditions: ${[...new Set(specs.map((s) => s.condition))].join(', ')}`,
    );
    console.log(`Reps per case: ${options.reps}`);
    console.log(`Max steps: ${options.maxSteps}`);
    console.log(`Timeout: ${options.timeout}ms`);
    console.log('\nRun matrix:');
    for (const spec of specs) {
      console.log(
        `  ${spec.model.id} | ${spec.condition} | ${spec.app.name}/${spec.caseId} | rep ${spec.repetition}`,
      );
    }
    return;
  }

  // Check API keys
  const missingKeys = new Set<string>();
  for (const spec of specs) {
    if (!process.env[spec.model.envKey]) {
      missingKeys.add(`${spec.model.envKey} (for ${spec.model.id})`);
    }
  }
  if (missingKeys.size > 0) {
    console.error('Missing API keys:');
    for (const key of missingKeys) {
      console.error(`  - ${key}`);
    }
    process.exit(1);
  }

  // Start infrastructure
  const needsPlaywright = specs.some((s) => s.condition === 'code-tool');
  let viteProcess: ChildProcess | undefined;
  let browser: Browser | undefined;
  let page: Page | undefined;

  if (needsPlaywright) {
    console.log('Starting Vite dev server...');
    viteProcess = await startViteServer();
    console.log('Starting Playwright browser...');
    browser = await chromium.launch();
    page = await browser.newPage();
    await page.goto('http://localhost:5191');
    // Wait for harness to be ready
    await page.waitForFunction(() => window.__eval?.ready === true, null, {
      timeout: 10_000,
    });
    console.log('Browser harness ready.\n');
  }

  const resultsFile = initResultsFile(options.outputDir);
  const allRuns: EvalRun[] = [];

  console.log(`Running ${specs.length} evaluations...`);
  console.log(`Results: ${resultsFile}\n`);

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i]!;
    const testCase = spec.app.cases.find((c) => c.id === spec.caseId)!;
    const progress = `[${i + 1}/${specs.length}]`;

    console.log(
      `${progress} ${spec.model.id} | ${spec.condition} | ${spec.app.name}/${spec.caseId} | rep ${spec.repetition}`,
    );

    const model = createModel(spec.model);

    let result;
    if (spec.condition === 'normal-tools') {
      result = await runNormalTools({
        app: spec.app,
        testCase,
        model,
        maxSteps: options.maxSteps,
        timeout: options.timeout,
      });
    } else {
      // Reload page for clean state between runs
      await page!.reload();
      await page!.waitForFunction(
        () => window.__eval?.ready === true,
        null,
        { timeout: 10_000 },
      );

      result = await runCodeTool({
        app: spec.app,
        testCase,
        model,
        maxSteps: options.maxSteps,
        timeout: options.timeout,
        page: page!,
      });
    }

    const evalRun = collectRun({
      model: spec.model.id,
      condition: spec.condition,
      app: spec.app,
      testCase,
      repetition: spec.repetition,
      result,
    });

    appendResult(resultsFile, evalRun);
    allRuns.push(evalRun);

    // Log result summary
    const status = evalRun.error
      ? `ERROR: ${evalRun.error.slice(0, 60)}`
      : `score=${evalRun.success.normalizedScore.toFixed(2)} exact=${evalRun.success.exact} tools=${evalRun.toolCallCount} inner=${evalRun.innerToolCallCount} tokens=${evalRun.tokens.total} time=${Math.round(evalRun.wallClockMs)}ms`;
    console.log(`  -> ${status}`);
  }

  // Cleanup
  if (browser) await browser.close();
  if (viteProcess) viteProcess.kill();

  // Write summary
  writeSummary(resultsFile, allRuns);

  console.log(`\nDone! ${allRuns.length} runs completed.`);
}
