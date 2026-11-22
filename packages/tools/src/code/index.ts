import type { CodeMode, ToolDefinitionZod } from '@mcp-web/types';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { BaseTool } from '../base.js';
import { generateCodeToolDescription } from './description.js';
import type { CodeExecutor } from './executor.js';
import { IframeExecutor } from './iframe-executor.js';
import { SignatureLookupTool } from './lookup.js';
import {
  type PatchOp,
  PatchOpSchema,
  type PreviousRun,
  renderNumberedSource,
  resolvePatchedCode,
  summarizeOps,
} from './patch.js';
import { stateTransaction, type Transaction } from './transaction.js';
import type { CodeRunRecord, CodeToolOptions } from './types.js';
import { validateAndTransformCode } from './validate.js';

const DEFAULT_TIMEOUT = 30_000;
/** Groups of invalid calls shown with their problem; the rest by position only. */
const LISTED_GROUPS = 10;

/** An error's message, or its name when the message is empty. */
function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message || err.name : String(err);
}

/** Call numbers as ranges: `Call 3`, `Calls 1–5, 7`. */
function formatCalls(calls: number[]): string {
  const ranges: string[] = [];
  for (let i = 0; i < calls.length; i++) {
    const start = calls[i];
    while (calls[i + 1] === calls[i] + 1) i++;
    ranges.push(calls[i] === start ? `${start}` : `${start}–${calls[i]}`);
  }
  return `${calls.length === 1 ? 'Call' : 'Calls'} ${ranges.join(', ')}`;
}

/** A call skipped under `collect`, with the problem the model is shown. */
interface InvalidCall {
  call: number;
  name: string;
  problem: string;
}

const PatchableCodeInputSchema = z.object({
  code: z
    .union([z.string(), z.array(PatchOpSchema)])
    .describe(
      'Either a complete JavaScript program, or — after a failed run — a list ' +
        'of edits to the previous program. Prefer edits when fixing a few lines.',
    ),
});

const PlainCodeInputSchema = z.object({
  code: z.string().describe('JavaScript code to execute in the sandbox'),
});

/**
 * Per-call overrides.
 *
 * `timeoutMs` bounds this execution only, leaving the instance default in place
 * for later calls. A caller that owns a wall-clock budget for a whole
 * conversation — a harness with its own deadline, say — otherwise hands each
 * execution a fresh full timeout, so one budget becomes one budget *per call*.
 */
export interface CodeExecuteOptions {
  timeoutMs?: number;
}

type CodeInputSchema = typeof PatchableCodeInputSchema;
type CodeInput = z.infer<CodeInputSchema>;

const CodeOutputSchema = z.object({
  result: z.unknown().optional().describe('Return value of the code'),
  error: z.string().optional().describe('Error message if execution failed'),
});
type CodeOutput = z.infer<typeof CodeOutputSchema>;

export class CodeTool extends BaseTool<
  CodeInputSchema,
  typeof CodeOutputSchema
> {
  #name: string;
  #description: string;
  #tools: ToolDefinitionZod[];
  #timeout: number;
  #patchEnabled: boolean;
  #validationErrors: 'collect' | 'throw';
  #onError: ((problem: string, name?: string) => string | undefined) | null;
  /** Functions whose signatures were looked up; null when all are inline. */
  #lookedUp: Set<string> | null;
  #lookupTool: SignatureLookupTool | null;
  #inputSchema: CodeInputSchema;
  #executor: CodeExecutor;
  #transaction: Transaction | null;
  /** The run whose tool calls are still honoured; see `#callTool`. */
  #activeExecutionId: string | null = null;
  /**
   * Set when a timeout left handlers running that never settled.
   *
   * The snapshot cannot be trusted after that: a handler may mutate state at
   * any later point, so neither rollback nor patching is sound and both are
   * refused until a full program re-establishes a known state.
   */
  #transactionPoisoned = false;

  /** What the next patch anchors against. Null until a program has run. */
  #lastRun: PreviousRun | null = null;
  /**
   * Whether what the last run changed is known to be undone, by a rollback
   * then or a deferred one since. Only then can a run that started tool calls
   * be edited and run again without repeating them.
   */
  #lastRunUndone = false;
  #runLog: CodeRunRecord[] = [];
  /**
   * Settles when the previous execution has finished. Executions run one at a
   * time because the per-run fields below, the transaction snapshot, and the
   * patch buffer all describe a single run.
   */
  #queue: Promise<unknown> = Promise.resolve();

  /**
   * The execution currently allowed to make proxied calls, and how many it has
   * started. Calls tagged with any other id are refused — after a timeout the
   * old program is still live in the iframe, and the iframe tags its later
   * calls with whatever execution id arrived most recently.
   */
  #startedToolCalls = 0;

  /** Calls the running program has made, valid or not; numbers each call. */
  #callCount = 0;
  /** Invalid calls the running program made, under `collect`. */
  #invalidCalls: InvalidCall[] = [];
  /**
   * Errors thrown for invalid calls under `throw`, by function name. The error
   * that stops a program reaches the report as text, possibly with a prefix
   * from the sandbox, so it is matched by the message it contains.
   */
  #thrownInvalidCalls: { name: string; message: string }[] = [];

  /**
   * Tool handlers that have been invoked and have not settled.
   *
   * Tearing down the iframe stops the sandbox but cannot cancel a handler
   * already running in the parent page — these are the app's own functions and
   * the tool contract has no cancellation. So they are tracked and waited on
   * instead.
   */
  #inFlight = new Set<Promise<unknown>>();

  constructor(options: CodeToolOptions) {
    super();
    this.#name = options.name ?? 'code';
    this.#tools = options.tools;
    this.#timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.#patchEnabled = options.patch?.enabled ?? false;
    this.#validationErrors = options.validationErrors ?? 'collect';
    this.#onError = options.hints?.onError ?? null;
    this.#lookedUp = options.signatures === 'lookup' ? new Set() : null;
    this.#lookupTool = this.#lookedUp
      ? new SignatureLookupTool({
          name: `get_${this.#name}_signature`,
          tools: this.#tools,
          lookedUp: this.#lookedUp,
        })
      : null;
    this.#description =
      options.description ??
      generateCodeToolDescription(this.#tools, {
        patch: this.#patchEnabled,
        validationErrors: this.#validationErrors,
        hints: options.hints?.description,
        lookup: this.#lookupTool?.name,
      });

    // The plain schema is a narrowing of the patchable one — the handler
    // accepts both shapes — so declaring the wider type is safe.
    this.#inputSchema = this.#patchEnabled
      ? PatchableCodeInputSchema
      : (PlainCodeInputSchema as unknown as CodeInputSchema);

    // Iframe by default: it is the only executor that is a real sandbox, so
    // anything running untrusted code gets it without opting in.
    this.#executor = options.executor ?? new IframeExecutor();
    this.#transaction = options.transaction ?? null;
  }

  get name(): string {
    return this.#name;
  }

  get description(): string {
    return this.#description;
  }

  get inputSchema(): CodeInputSchema {
    return this.#inputSchema;
  }

  /**
   * The tool that returns signatures, when `signatures` is `'lookup'`.
   * Register it next to this one.
   */
  get lookupTool(): SignatureLookupTool | null {
    return this.#lookupTool;
  }

  /** One record per `code` call, in the order the calls were answered. */
  get runLog(): readonly CodeRunRecord[] {
    return this.#runLog;
  }

  get outputSchema(): typeof CodeOutputSchema {
    return CodeOutputSchema;
  }

  get handler(): (
    params: CodeInput,
    options?: CodeExecuteOptions,
  ) => Promise<CodeOutput> {
    return this.#enqueue.bind(this);
  }

  /**
   * Runs the execution after any earlier one has finished.
   *
   * The caller's budget starts now, so time spent waiting counts against it. A
   * caller whose budget runs out while it waits is answered then, and its
   * program never runs.
   */
  #enqueue(
    params: CodeInput,
    options?: CodeExecuteOptions,
  ): Promise<CodeOutput> {
    // Non-positive means the caller's budget is already spent; refuse rather
    // than fall back to the default, which would grant a full timeout to a
    // call that had none left.
    const timeoutMs = options?.timeoutMs ?? this.#timeout;
    if (timeoutMs <= 0) {
      this.#runLog.push({ ...this.#recordFor(params.code), failed: true });
      return Promise.resolve({
        error:
          'No time remained for this execution, so nothing was run. The ' +
          "caller's deadline had already passed.",
      });
    }
    const deadlineAt = performance.now() + timeoutMs;
    let phase: 'waiting' | 'running' | 'expired' = 'waiting';
    const run = this.#queue.then(() => {
      if (phase === 'expired') return null;
      phase = 'running';
      return this.#execute(params, timeoutMs, deadlineAt);
    });
    this.#queue = run.catch(() => {});

    // Once running, the execution keeps its own deadline.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expiry = new Promise<CodeOutput>((resolve) => {
      timer = setTimeout(() => {
        if (phase !== 'waiting') return;
        phase = 'expired';
        this.#runLog.push({ ...this.#recordFor(params.code), failed: true });
        resolve({
          error:
            `Execution timed out after ${timeoutMs}ms while waiting for an ` +
            'earlier execution of this tool to finish, so nothing was run.',
        });
      }, timeoutMs);
    });
    return Promise.race([run.then((out) => out ?? expiry), expiry]).finally(
      () => clearTimeout(timer),
    );
  }

  /** The run-log record for a `code` argument, before anything is resolved. */
  #recordFor(argument: string | PatchOp[]): CodeRunRecord {
    return typeof argument === 'string'
      ? { input: 'full', failed: false }
      : { input: 'patch', failed: false, ...summarizeOps(argument) };
  }

  /**
   * Routes a call from inside the sandbox to its handler.
   *
   * Passed to the executor so counting and in-flight tracking stay here: the
   * started-call count decides whether a failed program can be patched, and an
   * executor that called handlers directly would leave it wrong.
   */
  #callTool = async (
    name: string,
    args: unknown,
    executionId?: string,
  ): Promise<unknown> => {
    // Refuse calls from a run that is already over. The iframe executor filters
    // stale messages by id, but nothing stopped an in-process program that
    // outlived its timeout — it could resume mid-`await` and mutate state
    // during a *later* execution, after that run's snapshot had been taken.
    // Guarding here covers every executor rather than each one separately.
    if (executionId !== undefined && executionId !== this.#activeExecutionId) {
      throw new Error('This execution is no longer active.');
    }

    const tool = this.#tools.find((t) => t.name === name);
    if (!tool) throw new Error(`Unknown function: ${name}`);

    const call = ++this.#callCount;
    const schema = tool.inputSchema;
    let input = args;
    let problem: string | null = null;
    if (this.#lookupTool && !this.#lookedUp?.has(name)) {
      problem =
        `${name} has not been looked up. Get its signature with the ` +
        `${this.#lookupTool.name} tool, in its own tool call, before calling it.`;
    } else if (schema) {
      // A call with no arguments is checked as `{}`, so a schema whose fields
      // are all optional accepts it.
      let parsed: ReturnType<typeof schema.safeParse>;
      try {
        parsed = schema.safeParse(args === undefined ? {} : args);
      } catch (err) {
        if (!(err instanceof z.core.$ZodAsyncError)) throw err;
        throw new Error(
          `The input schema of ${name} has async checks, which the code ` +
            'tool does not support.',
        );
      }
      if (parsed.success) input = parsed.data;
      else problem = z.prettifyError(parsed.error);
    }
    if (problem !== null) {
      if (this.#validationErrors === 'throw') {
        const message = `Invalid call. Call ${call} to ${name}:\n${problem}`;
        this.#thrownInvalidCalls.push({ name, message });
        throw new Error(message);
      }
      this.#invalidCalls.push({ call, name, problem });
      return undefined;
    }

    // Counted before the handler runs: a call that throws may still have
    // mutated something, and this number decides whether a patch is safe.
    this.#startedToolCalls++;

    // Wrapped so a handler that throws synchronously is tracked too.
    const pending = (async () => tool.handler(input))();
    this.#inFlight.add(pending);
    try {
      return await pending;
    } finally {
      this.#inFlight.delete(pending);
    }
  };

  /**
   * Waits for handlers left running by an earlier execution.
   *
   * @param timeoutMs What is left of the call's budget. Zero or less means wait
   *   no longer: handlers that have not already settled are reported as still
   *   running rather than granted time the call does not have.
   * @returns False if handlers were still running when the budget ran out.
   */
  async #drainInFlight(timeoutMs: number): Promise<boolean> {
    if (this.#inFlight.size === 0) return true;
    if (timeoutMs <= 0) return false;

    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        Promise.allSettled([...this.#inFlight]).then(() => true),
        new Promise<boolean>((resolve) => {
          timer = setTimeout(() => resolve(false), timeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Turns the `code` argument into a program to run.
   *
   * A rejected patch leaves `#lastRun` untouched: nothing ran, so a corrected
   * patch anchors against the same line numbers.
   */
  #resolveCode(
    argument: string | PatchOp[],
  ):
    | { code: string; record: CodeRunRecord }
    | { error: string; record: CodeRunRecord } {
    if (typeof argument === 'string') {
      return { code: argument, record: this.#recordFor(argument) };
    }

    const record: CodeRunRecord = {
      ...this.#recordFor(argument),
      failed: true,
    };

    if (!this.#patchEnabled) {
      return {
        error: 'Editing is not enabled for this tool. Send a complete program.',
        record: { ...record, rejection: 'patching-disabled' },
      };
    }

    // A failed run whose changes were undone left nothing applied, so the
    // started-call restriction does not apply to it.
    const patched = resolvePatchedCode(
      this.#lastRun,
      argument,
      this.#lastRunUndone,
    );

    if (patched.error !== undefined) {
      return {
        error: patched.error,
        record: { ...record, rejection: patched.reason },
      };
    }

    return { code: patched.code, record: { ...record, failed: false } };
  }

  /**
   * Appends the program with line numbers, so the next attempt can anchor
   * edits to positions it reads rather than newlines it counts.
   *
   * Numbers are shown only when the program is actually patchable. Offering
   * them for a run that already started tool calls would invite an edit that
   * is certain to be refused, costing a turn to learn what this message can
   * say outright.
   */
  #renderError(message: string, run: PreviousRun | null): string {
    if (!this.#patchEnabled || run === null || !run.failed) return message;
    if (run.startedToolCalls > 0 && !this.#lastRunUndone) return message;

    return [
      message,
      '',
      'Program (edit against these line numbers):',
      renderNumberedSource(run.code),
    ].join('\n');
  }

  /**
   * The app's hint for a problem, as a line to append below it, or ''.
   *
   * @param name The function the problem is about, if it is an invalid call.
   */
  #hint(problem: string, name?: string): string {
    try {
      const hint = this.#onError?.(problem, name);
      return hint ? `\nHint: ${hint}` : '';
    } catch {
      // A failing hint must not hide the problem it was asked about.
      return '';
    }
  }

  /**
   * The skipped calls, with identical problems from one function grouped. Every
   * position is listed, since without a transaction the calls around them
   * stand; past the first groups, problems are left out.
   */
  #renderInvalidCalls(): string[] {
    const groups = new Map<string, InvalidCall[]>();
    for (const invalid of this.#invalidCalls) {
      const key = `${invalid.name}\n${invalid.problem}`;
      const group = groups.get(key);
      if (group) group.push(invalid);
      else groups.set(key, [invalid]);
    }

    const all = [...groups.values()];
    const entries = all.slice(0, LISTED_GROUPS).map((group) => {
      const { name, problem } = group[0];
      const calls = formatCalls(group.map((c) => c.call));
      const entry = `${calls} to ${name}:\n${problem}`;
      return entry + this.#hint(entry, name);
    });

    const rest = new Map<string, number[]>();
    for (const group of all.slice(LISTED_GROUPS)) {
      const calls = rest.get(group[0].name) ?? [];
      calls.push(...group.map((c) => c.call));
      rest.set(group[0].name, calls);
    }
    for (const [name, calls] of rest) {
      calls.sort((a, b) => a - b);
      entries.push(`${formatCalls(calls)} to ${name}: problems not shown.`);
    }
    return entries;
  }

  /** What a failed run left applied, so the model knows what to send next. */
  #outcome(drained: boolean, rollbackError: string | null): string {
    if (rollbackError !== null) {
      return (
        `Rolling back failed (${rollbackError}), so what the program ` +
        'changed is unknown.'
      );
    }
    if (!drained) {
      return (
        'A tool call was still running when time ran out, so what it ' +
        'changed is unknown.'
      );
    }
    const started = this.#startedToolCalls;
    if (started === 0) return 'No tool call ran, so nothing changed.';
    if (this.#transaction) {
      return `Its ${started} tool call(s) were rolled back, so nothing changed.`;
    }
    return (
      `${started} tool call(s) ran and what they changed stands. Send a ` +
      'complete program covering only the work that remains.'
    );
  }

  /**
   * Restores the snapshot. A rollback that throws leaves the transaction
   * poisoned, so it is retried before the next program runs.
   *
   * @returns Why the rollback failed, or null.
   */
  #rollback(): string | null {
    try {
      this.#transaction?.rollback();
      this.#transactionPoisoned = false;
      return null;
    } catch (err) {
      this.#transactionPoisoned = true;
      return errorMessage(err);
    }
  }

  /**
   * Releases a snapshot without restoring it, for a run that changed nothing.
   * A release that throws is ignored, since the state is as it was.
   */
  #release(): void {
    try {
      this.#transaction?.commit();
    } catch {}
  }

  /**
   * Buffers the program, records the run, and renders the error.
   *
   * @param undone Whether what the program changed was rolled back.
   */
  #fail(
    code: string,
    message: string,
    record: CodeRunRecord,
    undone = false,
  ): CodeOutput {
    this.#lastRun = {
      code,
      failed: true,
      startedToolCalls: this.#startedToolCalls,
    };
    this.#lastRunUndone = undone;
    this.#runLog.push({ ...record, failed: true });

    return { error: this.#renderError(message, this.#lastRun) };
  }

  /** Validates, transforms, and executes code in the sandbox. */
  async #execute(
    params: CodeInput,
    timeoutMs: number,
    deadlineAt: number,
  ): Promise<CodeOutput> {
    // The budget is one deadline for the whole call, so every phase below —
    // each drain and the execution timer — takes what is left of it. Handing
    // the duration to each phase instead would restart it each time, and a
    // poisoned call could then hold the caller for several budgets.
    const remaining = () =>
      Math.max(0, Math.ceil(deadlineAt - performance.now()));
    // Time spent waiting for an earlier execution of this tool to finish.
    const queuedMs = Math.floor(timeoutMs - (deadlineAt - performance.now()));

    if (remaining() === 0) {
      this.#runLog.push({ ...this.#recordFor(params.code), failed: true });
      return {
        error:
          'No time remained for this execution, so nothing was run. An ' +
          'earlier execution of this tool used up the time while it waited.',
      };
    }

    // A previous run may have left handlers running that never settled, or a
    // rollback that threw, so its snapshot is still held and state is unknown.
    // Recover before anything else, including deciding whether an edit is
    // allowed: the stray handlers may still be pending, and running now would
    // race them. If they settle, the deferred rollback can happen. If not,
    // nothing is safe to run, so a full program is refused too.
    if (this.#transactionPoisoned) {
      const waited = remaining();
      if (!(await this.#drainInFlight(waited))) {
        this.#runLog.push({ ...this.#recordFor(params.code), failed: true });
        return {
          error:
            `A tool call from an earlier execution is still running after ` +
            `${waited}ms. Nothing was run, because starting a program ` +
            'now could race whatever that call is still changing. Try again.',
        };
      }
      const rollbackError = this.#rollback();
      if (rollbackError !== null) {
        this.#runLog.push({ ...this.#recordFor(params.code), failed: true });
        return {
          error:
            `Rolling back an earlier execution failed (${rollbackError}). ` +
            'Nothing was run, because what that execution changed is unknown.',
        };
      }
      this.#lastRunUndone = this.#transaction !== null;
    }

    const resolved = this.#resolveCode(params.code);

    if ('error' in resolved) {
      this.#runLog.push(resolved.record);
      return { error: this.#renderError(resolved.error, this.#lastRun) };
    }

    const { code, record } = resolved;

    // This attempt has started nothing yet. Reset before validation so a
    // program that never reaches the sandbox records a clean zero.
    this.#startedToolCalls = 0;
    this.#callCount = 0;
    this.#invalidCalls = [];
    this.#thrownInvalidCalls = [];

    const validation = validateAndTransformCode(code);

    if (!validation.valid) {
      const problem = validation.error ?? 'Invalid program';
      return this.#fail(
        code,
        `Validation error: ${problem}${this.#hint(problem)}\n\n` +
          this.#outcome(true, null),
        record,
      );
    }

    // A previous execution may have timed out while one of its tool calls was
    // still running in the parent. Starting now would race it.
    const drainWait = remaining();
    if (!(await this.#drainInFlight(drainWait))) {
      this.#runLog.push({ ...record, failed: true });
      return {
        error:
          `A tool call from an earlier execution is still running after ` +
          `${drainWait}ms. Nothing was run, because starting a program ` +
          'now could race whatever that call is still changing. Try again.',
      };
    }

    const executionId = uuidv4();
    const transformedCode = validation.transformedCode ?? code;

    // Snapshot before anything runs. Taken here rather than earlier so a
    // program rejected by validation — which mutated nothing — does not pay for
    // a clone it will never use.
    try {
      this.#transaction?.begin();
    } catch (err) {
      // A combined transaction may have begun some parts before one threw.
      this.#release();
      return this.#fail(
        code,
        `Taking a snapshot failed (${errorMessage(err)}), so nothing was run.`,
        record,
      );
    }
    // Taking the snapshot can use up the budget, and a fast program could
    // finish before a zero-delay timer fires.
    if (remaining() === 0) {
      this.#release();
      return this.#fail(
        code,
        `Execution timed out after ${timeoutMs}ms before the program ` +
          'started, so nothing was run.',
        record,
      );
    }

    // The timer gets what is left of the budget, but the message names the
    // whole budget, because that is the deadline the program overran.
    const timeoutMessage =
      queuedMs > 0
        ? `Execution timed out after ${timeoutMs}ms, ${queuedMs}ms of which ` +
          'it waited for an earlier execution of this tool to finish'
        : `Execution timed out after ${timeoutMs}ms`;
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        reject(new Error(timeoutMessage));
      }, remaining());
    });

    this.#activeExecutionId = executionId;

    let result: unknown;
    let error: string | null = null;
    try {
      result = await Promise.race([
        this.#executor.execute({
          code: transformedCode,
          executionId,
          // Every function is defined, even one not looked up yet, so its name
          // never resolves to a JavaScript global; `#callTool` refuses it.
          functionNames: this.#tools.map((t) => t.name),
          callTool: (name, args) => this.#callTool(name, args, executionId),
        }),
        timeout,
      ]);
    } catch (err) {
      error = errorMessage(err);
    } finally {
      clearTimeout(timer);
      // Stop accepting calls from this run: a program that timed out is still
      // executing, and every call it makes from here is from a run already
      // answered.
      this.#activeExecutionId = null;
    }

    // A program that skipped invalid calls did not do what it was written to
    // do, so it fails like one that threw.
    if (error === null && this.#invalidCalls.length === 0) {
      // A program can return before a call it started without awaiting has
      // finished, and its changes are not final until that call is.
      if (!(await this.#drainInFlight(remaining()))) {
        error =
          'The program returned, but a tool call it started without awaiting ' +
          'was still running when time ran out.';
      } else {
        try {
          this.#transaction?.commit();
          this.#lastRun = {
            code,
            failed: false,
            startedToolCalls: this.#startedToolCalls,
          };
          this.#runLog.push(record);
          return { result };
        } catch (err) {
          // Not rolled back: a combined transaction may have released some
          // snapshots before one commit threw, so a rollback could restore
          // only part of the state.
          return this.#fail(
            code,
            `Committing the changes failed (${errorMessage(err)}), so what ` +
              'the program changed is unknown.',
            record,
          );
        }
      }
    }

    // Rolling back immediately would race handlers that already started — one
    // still awaiting I/O can write *after* the snapshot is restored. Wait for
    // them first, bounded by what is left of the call's budget, which after a
    // timeout is nothing. Handlers that have not settled by then leave the
    // transaction poisoned: restoring the snapshot could clobber a later write,
    // and not restoring leaves a partial application, so neither rollback nor
    // patching is allowed until they settle.
    const drained = await this.#drainInFlight(remaining());
    let rollbackError: string | null = null;
    if (drained) rollbackError = this.#rollback();
    else this.#transactionPoisoned = true;

    // A timed-out program is still running in there, and nothing else can stop
    // it. Left alive it would keep calling into the page, and a wedged sandbox
    // would time out every run after this one.
    if (timedOut) this.destroy();

    const report: string[] = [];
    if (this.#invalidCalls.length > 0) {
      report.push(
        `${this.#invalidCalls.length} call(s) were invalid and skipped:`,
        ...this.#renderInvalidCalls(),
      );
    }
    if (error !== null) {
      const prefix =
        report.length > 0 ? 'The program then stopped with an error: ' : '';
      const stoppedBy = this.#thrownInvalidCalls.find((c) =>
        error?.includes(c.message),
      );
      report.push(`${prefix}${error}${this.#hint(error, stoppedBy?.name)}`);
    }
    report.push(this.#outcome(drained, rollbackError));
    const undone =
      drained && rollbackError === null && this.#transaction !== null;
    return this.#fail(code, report.join('\n\n'), record, undone);
  }

  /**
   * Tears the sandbox down. The next execution builds a fresh one.
   *
   * The patch buffer survives: tearing down the sandbox does not undo whatever
   * the last program already committed.
   */
  destroy(): void {
    this.#executor.destroy();
  }
}

/**
 * Code mode for `addStateTools` and `createStateTools`: their tools are offered
 * through one code tool, with a transaction over the state.
 *
 * The code tool is named `code_<name>` unless `options.name` says otherwise.
 * Its generated description asks AI to read the state with the getter first;
 * a custom `options.description` replaces that too.
 *
 * `options.executor` creates the executor for each code tool, so code tools
 * from one `createCodeMode` never share one.
 *
 * ```ts
 * mcp.addStateTools({
 *   name: 'app',
 *   description: 'Todo app',
 *   get: () => store.app,
 *   set: (value) => { store.app = value; },
 *   schema: AppSchema,
 *   expand: true,
 *   codeMode: createCodeMode(),
 * });
 * ```
 *
 * @param options - The `CodeTool` options other than the tools and the
 *   transaction, which come from the state. `executor` is a function that
 *   creates one, e.g. `() => new WorkerExecutor()`.
 */
export function createCodeMode(
  options: Omit<CodeToolOptions, 'tools' | 'transaction' | 'executor'> & {
    executor?: () => CodeExecutor;
  } = {},
): CodeMode {
  return ({ name, getter, tools, get, set }) => {
    const readFirst = `Read the current state with the \`${getter.name}\` tool before changing it.`;
    return new CodeTool({
      ...options,
      name: options.name ?? `code_${name}`,
      executor: options.executor?.(),
      hints: {
        ...options.hints,
        description: [readFirst, options.hints?.description]
          .filter(Boolean)
          .join('\n'),
      },
      tools,
      transaction: stateTransaction(get, set),
    });
  };
}

export type { CodeExecutor, ExecutionRequest } from './executor.js';
export { FunctionExecutor } from './function-executor.js';
export { IframeExecutor } from './iframe-executor.js';
export type { SignatureLookupTool } from './lookup.js';
export type {
  PatchOp,
  PatchRejectionReason,
  PatchResult,
  PreviousRun,
} from './patch.js';
export { PatchOpSchema } from './patch.js';
export type { Transaction } from './transaction.js';
export { combineTransactions, stateTransaction } from './transaction.js';
export type { CodeRunRecord, CodeToolOptions } from './types.js';
