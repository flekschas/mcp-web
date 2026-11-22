/**
 * Starts wrangler dev, waits for its health check and includes stderr on
 * failure.
 *
 * A worker that never binds makes every request hang instead of failing, so the
 * wait is on `/health` rather than on the process.
 */

import { spawn } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { killProcess } from '../kill-process';

const WORKER_DIR = dirname(fileURLToPath(import.meta.url));

export interface RunningWorker {
  /** `host:port` the bridge is reachable on. */
  url: string;
  stop(): Promise<void>;
}

export async function startWorker(options: {
  port: number;
  /** Passed to wrangler as `--var NAME:value`. */
  vars?: Record<string, string>;
  readyTimeoutMs?: number;
}): Promise<RunningWorker> {
  const { port, vars = {}, readyTimeoutMs = 90_000 } = options;
  const url = `localhost:${port}`;

  const varArgs = Object.entries(vars).flatMap(([name, value]) => [
    '--var',
    `${name}:${value}`,
  ]);

  const worker = spawn(
    'npx',
    [
      'wrangler',
      'dev',
      '--port',
      String(port),
      '--inspector-port',
      '0',
      ...varArgs,
      '--log-level',
      'error',
    ],
    { cwd: WORKER_DIR, stdio: ['ignore', 'ignore', 'pipe'] },
  );

  let stderr = '';
  worker.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const deadline = Date.now() + readyTimeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`http://${url}/health`)).ok) {
        return {
          url,
          stop: async () => {
            await killProcess(worker);
          },
        };
      }
    } catch {
      // wrangler still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  await killProcess(worker);
  throw new Error(`wrangler dev did not become ready in time\n${stderr}`);
}
