/**
 * Runs programs in a Node worker thread, so a runaway one can be stopped.
 *
 * `FunctionExecutor` evaluates model-authored code on the caller's own event
 * loop. `CodeTool`'s timeout is a timer on that same loop, so a program that
 * never yields — `while (true) {}`, a pathological regex, an unbounded
 * allocation loop — prevents the timer from firing at all. Nothing after it
 * advances: not the timeout, not the outer deadline, not result flushing, not
 * any concurrent worker in the process. The run does not fail, it stops.
 *
 * A worker thread is the only thing in Node that can be stopped from outside,
 * because `terminate()` does not need the target's cooperation. That is the
 * whole reason this exists — it is not a security boundary any more than
 * `FunctionExecutor` is: a worker shares the process and can reach the
 * filesystem and network.
 *
 * Tool calls stay in the parent. The worker holds no application state and
 * proxies every call back over `postMessage`, which keeps `CodeTool`'s
 * started-call accounting, transactions and validation decorators exactly where
 * they were. It also means arguments and results cross a structured-clone
 * boundary: plain JSON-shaped values survive, functions and class instances do
 * not.
 *
 * Import from `@mcp-web/tools/code/worker` rather than the `code` barrel, so a
 * browser bundle never pulls in `node:worker_threads`.
 */
import { Worker } from 'node:worker_threads';
import type { CodeExecutor, ExecutionRequest } from './executor.js';

/**
 * The worker body, as source.
 *
 * Inlined rather than shipped as a file because the path would have to survive
 * the TypeScript build, bundlers, and being installed as a dependency — three
 * chances to resolve to nothing at the moment a program needs to run.
 */
const WORKER_SOURCE = `
const { parentPort } = require('node:worker_threads');
const pending = new Map();
let nextCallId = 0;

function callTool(name, args) {
  const id = nextCallId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    parentPort.postMessage({ type: 'call', id, name, args });
  });
}

async function run(message) {
  try {
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
    const names = message.functionNames;
    const program = new AsyncFunction(...names, message.code);
    const value = await program(...names.map((n) => (args) => callTool(n, args)));
    parentPort.postMessage({ type: 'done', value });
  } catch (err) {
    parentPort.postMessage({
      type: 'failed',
      message: err && err.message ? String(err.message) : String(err),
    });
  }
}

parentPort.on('message', (message) => {
  if (message.type === 'run') {
    run(message);
    return;
  }
  if (message.type === 'result') {
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error !== undefined) waiter.reject(new Error(message.error));
    else waiter.resolve(message.value);
  }
});
`;

type FromWorker =
  | { type: 'call'; id: number; name: string; args: unknown }
  | { type: 'done'; value: unknown }
  | { type: 'failed'; message: string };

export class WorkerExecutor implements CodeExecutor {
  #worker: Worker | null = null;

  /**
   * Reused across executions and replaced after `destroy()`.
   *
   * Spawning a thread costs tens of milliseconds, which is not worth paying per
   * program when the common case is a program that finishes.
   */
  #ensureWorker(): Worker {
    if (this.#worker) return this.#worker;
    // `stdout`/`stderr` true keeps the worker's output *on the worker* instead
    // of forwarding it to this process's streams. A model program is free to
    // `console.log`, and left forwarded that output interleaves with the run
    // log — illegibly so under `--parallel`, where several workers share one
    // terminal. Nothing shows the program its own stdout, so it is drained and
    // dropped rather than captured; an unread stream would eventually block the
    // worker's writes.
    const worker = new Worker(WORKER_SOURCE, {
      eval: true,
      stdout: true,
      stderr: true,
    });
    // Optional because Bun's `worker_threads` shim leaves both null; there the
    // streams cannot be redirected and this is a no-op.
    worker.stdout?.resume();
    worker.stderr?.resume();
    // Nothing else keeps the process alive on this thread's behalf; a live
    // worker must not be the reason a finished run does not exit.
    worker.unref();
    this.#worker = worker;
    return worker;
  }

  async execute(request: ExecutionRequest): Promise<unknown> {
    const worker = this.#ensureWorker();

    return new Promise<unknown>((resolve, reject) => {
      const settle = (fn: () => void) => {
        worker.off('message', onMessage);
        worker.off('error', onError);
        worker.off('exit', onExit);
        fn();
      };

      const onMessage = (message: FromWorker) => {
        if (message.type === 'done') return settle(() => resolve(message.value));
        if (message.type === 'failed') {
          return settle(() => reject(new Error(message.message)));
        }
        // A tool call. Routed through `request.callTool` so the core counts it
        // and tracks its promise, exactly as it does in-process.
        request
          .callTool(message.name, message.args)
          .then(
            (value) =>
              worker.postMessage({ type: 'result', id: message.id, value }),
            (err: unknown) =>
              worker.postMessage({
                type: 'result',
                id: message.id,
                error: err instanceof Error ? err.message : String(err),
              }),
          )
          // The worker is gone — the program that was waiting on this call has
          // already been rejected by `onExit`.
          .catch(() => {});
      };

      const onError = (err: Error) => settle(() => reject(err));

      // `terminate()` is how a timeout stops a program that will not yield, so
      // an exit with no result is the expected shape of that case rather than
      // an anomaly.
      const onExit = () =>
        settle(() =>
          reject(new Error('The sandbox was stopped before the program finished.')),
        );

      worker.on('message', onMessage);
      worker.on('error', onError);
      worker.on('exit', onExit);

      worker.postMessage({
        type: 'run',
        code: request.code,
        functionNames: [...request.functionNames],
      });
    });
  }

  /**
   * Stops the thread, whatever it is doing.
   *
   * `CodeTool` calls this when a timeout fires. Unlike the in-process executor,
   * this actually ends the program: the next execution gets a fresh thread with
   * nothing left running behind it.
   */
  destroy(): void {
    const worker = this.#worker;
    this.#worker = null;
    void worker?.terminate();
  }
}
