import type { ToolDefinition, ToolError, ToolResult } from '@mcp-web/types';
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

const runPythonSchema = z.object({ script: z.string().describe('Python script to run') });
type RunPythonSchema = z.infer<typeof runPythonSchema>;
const runPythonJsonSchema = z.toJSONSchema(runPythonSchema, { target: "draft-7" });

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
  let resolve: (value: ToolResult<T> | PromiseLike<ToolResult<T>>) => void;
  let reject: (error: ToolError) => void;
  const promise = new Promise<ToolResult<T>>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // @ts-expect-error: We know that the resolve and reject functions are defined
  return { promise, resolve, reject };
}

const createRunPython = (
  worker: Worker,
  getDatasets: () => Record<string, unknown> | Promise<Record<string, unknown>>
) => async (params: RunPythonSchema): Promise<ToolResult<string>> => {
  const parsedParams = runPythonSchema.safeParse(params);

  if (!parsedParams.success) {
    return {
      error: 'Invalid input parameters'
    }
  }

  const { script } = parsedParams.data;

  const { promise, resolve, reject } = getPromiseAndResolveReject<string>();
  const executionId = uuidv4();

  worker.addEventListener("message", function listener(event: MessageEvent<WorkerResponse>) {
    // Ignore messages from other executions
    if (event.data.id !== executionId) {
      return;
    }

    // This listener is done so remove it.
    worker.removeEventListener("message", listener);

    if ('error' in event.data) {
      reject(event.data satisfies ToolError);
      return;
    }

    resolve({ value: event.data.result } satisfies ToolResult<string>);
  });

  worker.postMessage({ id: executionId, script, datasets: await getDatasets() } satisfies WorkerMessageRunPython);

  return promise;
}

export class PythonTool extends BaseTool<RunPythonSchema, string> {
  public readonly name;
  public readonly description;
  public readonly inputSchema = runPythonJsonSchema;
  public readonly handler;
  private worker: Worker;

  constructor(getDatasets: () => Record<string, unknown>, options: Options) {
    super();
    this.name = options.name || 'python';
    this.description = options.description || 'Run Python code';
    this.worker = createWorker(options);
    this.handler = createRunPython(this.worker, getDatasets);
  }

  override toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      handler: this.handler,
      inputSchema: this.inputSchema
    };
  }
}
