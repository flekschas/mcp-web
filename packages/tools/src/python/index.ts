import type { ToolDefinition } from '@mcp-web/types';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { BaseTool } from '../base.js';

interface Options {
  /** The name of the tool. */
  name?: string;
  /** The description of the tool. */
  description?: string;
  /** The default packages to load on init. Can be useful if you expect many calls to use the same packages. E.g., `['numpy', 'pandas']`. */
  defaultPackages?: string[];
}

const RunPythonInputSchema = z.object({
  script: z.string().describe('Python script to run')
});
type RunPythonInput = z.infer<typeof RunPythonInputSchema>;

const RunPythonOutputSchema = z.object({ result: z.string().describe('The result of the Python script') });
type RunPythonOutput = z.infer<typeof RunPythonOutputSchema>;

const runPythonJsonSchema = z.toJSONSchema(RunPythonInputSchema, { target: "draft-7" });

export interface WorkerMessagePackages {
  packages: string[];
}

export interface WorkerMessageRunPython {
  id: string;
  script: string;
  datasets: Record<string, unknown>;
}

export type WorkerMessage = WorkerMessagePackages | WorkerMessageRunPython;

interface WorkerResponseSuccess {
  id: string;
  result: string;
}

interface WorkerResponseError {
  id: string;
  error: string;
}

type WorkerResponse = WorkerResponseSuccess | WorkerResponseError;

const workerCode = /* js */`
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.28.1/full/pyodide.mjs";

const TIMEOUT = 30000;

const state = {
  pyodide: null,
};

async function initPyodide() {
  const pyodide = await loadPyodide();
  state.pyodide = pyodide;
  self.postMessage({ init: true });
}

async function loadPackages(packages) {
  if (!state.pyodide) {
    self.postMessage({ error: 'Pyodide not initialized' });
    return;
  }

  const pyodide = state.pyodide;

  try {
    await pyodide.loadPackage(packages);
    self.postMessage({ packagesLoaded: true });
  } catch (error) {
    self.postMessage({ error });
  }
}

async function runPython(id, script, datasets) {
  if (!state.pyodide) {
    self.postMessage({ id, error: 'Pyodide not initialized' });
    return;
  }

  const pyodide = state.pyodide;

  try {
    await pyodide.loadPackagesFromImports(script);

    for (const [key, value] of Object.entries(datasets)) {
      pyodide.globals.set(key, value);
    }

    let result = '';

    const pythonExecution = pyodide.runPythonAsync(script).then((r) => {
      result = r?.toString() ?? '';
    });

    const timeout = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Python execution timed out"));
      }, TIMEOUT);
    });

    await Promise.race([pythonExecution, timeout]);
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
}

self.onmessage = async (event) => {
  if ('packages' in event.data) {
    await loadPackages(event.data.packages);
    return;
  }

  const { id, script, datasets } = event.data;
  await runPython(id, script, datasets);
};

initPyodide();
`;

const createWorker = (options: Options) => {
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const worker = new Worker(URL.createObjectURL(blob), { type: "module" });

  if (options.defaultPackages?.length) {
    worker.postMessage({ packages: options.defaultPackages } satisfies WorkerMessagePackages);
  }

  return worker;
}

const getPromiseAndResolveReject = <T>() => {
  let resolve: (value: T | PromiseLike<T>) => void;
  let reject: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // @ts-expect-error: We know that the resolve and reject functions are defined
  return { promise, resolve, reject };
}

const createRunPython = (
  worker: Worker,
  getDatasets: () => Record<string, unknown> | Promise<Record<string, unknown>>
) => async (params: RunPythonInput): Promise<RunPythonOutput> => {
  const parsedParams = RunPythonInputSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new Error(`PythonTool: Invalid input parameters: ${parsedParams.error.message}`);
  }

  const { script } = parsedParams.data;

  const { promise, resolve, reject } = getPromiseAndResolveReject<RunPythonOutput>();
  const executionId = uuidv4();

  worker.addEventListener("message", function listener(event: MessageEvent<WorkerResponse>) {
    // Ignore messages from other executions
    if (event.data.id !== executionId) {
      return;
    }

    // This listener is done so remove it.
    worker.removeEventListener("message", listener);

    if ('error' in event.data) {
      reject(new Error(event.data.error));
      return;
    }

    resolve({ result: event.data.result });
  });

  worker.postMessage(
    {
      id: executionId,
      script,
      datasets: await getDatasets()
    } satisfies WorkerMessageRunPython
  );

  return promise;
}

export class PythonTool extends BaseTool<typeof RunPythonInputSchema, typeof RunPythonOutputSchema> {
  public readonly name;
  public readonly description;
  public readonly inputSchema = RunPythonInputSchema;
  public readonly outputSchema = RunPythonOutputSchema;
  public readonly handler: (params: RunPythonInput) => Promise<RunPythonOutput>;
  private worker: Worker;

  constructor(getDatasets: () => Record<string, unknown>, options: Options) {
    super();
    this.name = options.name || 'python';
    this.description = options.description || 'Run Python code';
    this.worker = createWorker(options);
    this.handler = createRunPython(this.worker, getDatasets);
  }

  destroy() {
    this.worker.terminate();
  }
}
