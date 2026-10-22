import type { ToolDefinitionZod } from '@mcp-web/types';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { BaseTool } from '../base.js';
import { generateCodeToolDescription } from './description.js';
import {
  PatchOpSchema,
  type PatchOp,
  type PreviousRun,
  renderNumberedSource,
  resolvePatchedCode,
  summarizeOps,
} from './patch.js';
import type { CodeExecutor } from './executor.js';
import type { Transaction } from './transaction.js';
import { IframeExecutor } from './iframe-executor.js';
import type {
  CodeRunRecord,
  CodeToolOptions,
  FunctionCallMessage,
  IframeToParentMessage,
} from './types.js';
import { validateAndTransformCode } from './validate.js';

const DEFAULT_TIMEOUT = 30_000;

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
  #runLog: CodeRunRecord[] = [];

  /**
   * The execution currently allowed to make proxied calls, and how many it has
   * started. Calls tagged with any other id are refused — after a timeout the
   * old program is still live in the iframe, and the iframe tags its later
   * calls with whatever execution id arrived most recently.
   */
  #startedToolCalls = 0;

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
    this.#description =
      options.description ??
      generateCodeToolDescription(this.#tools, { patch: this.#patchEnabled });

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

  /** One record per `code` call, in order. */
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
    return this.#execute.bind(this);
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

    // Counted before the handler runs: a call that throws may still have
    // mutated something, and this number decides whether a patch is safe.
    this.#startedToolCalls++;

    const tool = this.#tools.find((t) => t.name === name);
    if (!tool) throw new Error(`Unknown function: ${name}`);

    // Wrapped so a handler that throws synchronously is tracked too.
    const pending = (async () => tool.handler(args))();
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
  ): { code: string; record: CodeRunRecord } | { error: string; record: CodeRunRecord } {
    if (typeof argument === 'string') {
      return { code: argument, record: { input: 'full', failed: false } };
    }

    const record: CodeRunRecord = {
      input: 'patch',
      failed: true,
      ...summarizeOps(argument),
    };

    if (!this.#patchEnabled) {
      return {
        error: 'Editing is not enabled for this tool. Send a complete program.',
        record: { ...record, rejection: 'patching-disabled' },
      };
    }

    if (this.#transactionPoisoned) {
      return {
        error:
          'Cannot edit: an earlier program timed out with tool calls still ' +
          'running, so what it changed is unknown. Send a complete program ' +
          'that does not assume any particular starting state.',
        record: { ...record, rejection: 'previous-run-started-calls' },
      };
    }

    // A configured transaction means a failed run left nothing applied, so the
    // started-call restriction does not apply to it — unless the rollback
    // could not be trusted, handled above.
    const patched = resolvePatchedCode(
      this.#lastRun,
      argument,
      this.#transaction !== null,
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

    if (this.#transaction === null && run.startedToolCalls > 0) {
      return [
        message,
        '',
        `This program started ${run.startedToolCalls} tool call(s), so it ` +
          'cannot be edited — whatever they changed still stands. Send a ' +
          'complete program covering only the work that remains.',
      ].join('\n');
    }

    return [
      message,
      '',
      'Program (edit against these line numbers):',
      renderNumberedSource(run.code),
    ].join('\n');
  }

  /** Buffers the program, records the run, and renders the error. */
  #fail(code: string, message: string, record: CodeRunRecord): CodeOutput {
    this.#lastRun = {
      code,
      failed: true,
      startedToolCalls: this.#startedToolCalls,
    };
    this.#runLog.push({ ...record, failed: true });

    return { error: this.#renderError(message, this.#lastRun) };
  }

  /** Validates, transforms, and executes code in the sandbox. */
  async #execute(
    params: CodeInput,
    options?: CodeExecuteOptions,
  ): Promise<CodeOutput> {
    // Non-positive means the caller's budget is already spent; refuse rather
    // than fall back to the default, which would grant a full timeout to a
    // call that had none left.
    const timeoutMs = options?.timeoutMs ?? this.#timeout;
    if (timeoutMs <= 0) {
      return {
        error:
          'No time remained for this execution, so nothing was run. The ' +
          'caller\'s deadline had already passed.',
      };
    }

    // The budget is a duration for the whole call, so it is turned into one
    // deadline here and every phase below — each drain and the execution timer
    // — takes what is left of it. Handing the duration to each phase instead
    // would restart it three times over, and a poisoned call could then hold
    // the caller for three budgets while reporting one.
    const deadlineAt = performance.now() + timeoutMs;
    const remaining = () => Math.max(0, Math.ceil(deadlineAt - performance.now()));

    const resolved = this.#resolveCode(params.code);

    if ('error' in resolved) {
      this.#runLog.push(resolved.record);
      return { error: this.#renderError(resolved.error, this.#lastRun) };
    }

    const { code, record } = resolved;

    // This attempt has started nothing yet. Reset before validation so a
    // program that never reaches the sandbox records a clean zero.
    this.#startedToolCalls = 0;

    // A previous timeout may have left handlers running that never settled, so
    // the snapshot from that run is still held and state is unknown. Sending a
    // complete program is *not* enough to clear that on its own: the stray
    // handlers may still be pending, and running now would race them exactly as
    // before.
    //
    // So drain first. If they settle, the snapshot is finally trustworthy and
    // the rollback that was deferred can happen; only then is the doubt gone.
    // If they still will not settle, nothing is safe to run — a full program
    // would execute against state that can change under it — so it is refused
    // too, rather than only patches.
    if (this.#transactionPoisoned) {
      const waited = remaining();
      if (!(await this.#drainInFlight(waited))) {
        this.#runLog.push({ ...record, failed: true });
        // Same situation and same wording as the drain check below: a handler
        // from an earlier run is still live. The only difference is that a
        // snapshot is also still held, which is why nothing — not even a full
        // program — may run until it settles.
        return {
          error:
            `A tool call from an earlier execution is still running after ` +
            `${waited}ms. Nothing was run, because starting a program ` +
            'now could race whatever that call is still changing. Try again.',
        };
      }
      this.#transaction?.rollback();
      this.#transactionPoisoned = false;
    }

    const validation = validateAndTransformCode(code);

    if (!validation.valid) {
      return this.#fail(code, `Validation error: ${validation.error}`, record);
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
    this.#transaction?.begin();

    // What the drains above did not use. The message still names the caller's
    // full budget, because that is the deadline the program overran.
    const executionMs = remaining();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Execution timed out after ${timeoutMs}ms`)),
        executionMs,
      );
    });

    this.#activeExecutionId = executionId;

    try {
      const result = await Promise.race([
        this.#executor.execute({
          code: transformedCode,
          executionId,
          functionNames: this.#tools.map((t) => t.name),
          callTool: (name, args) => this.#callTool(name, args, executionId),
        }),
        timeout,
      ]);

      this.#activeExecutionId = null;
      this.#transaction?.commit();
      this.#lastRun = {
        code,
        failed: false,
        startedToolCalls: this.#startedToolCalls,
      };
      this.#runLog.push(record);
      return { result };
    } catch (err) {
      // Stop accepting calls from this run before anything else: a program that
      // timed out is still executing, and every call it makes from here is from
      // a run already answered.
      this.#activeExecutionId = null;

      // Rolling back immediately would race handlers that already started —
      // one still awaiting I/O can write *after* the snapshot is restored,
      // leaving state the rollback did not cover while the tool reports the
      // run as fully undone. Wait for them first.
      // Bounded by what is left of the call's budget, which after a timeout is
      // nothing: the wait is part of the call's cost, so it cannot extend past
      // the deadline the caller set. Handlers that have not settled by then
      // leave the transaction poisoned, which is the case below.
      const drained = await this.#drainInFlight(remaining());
      if (drained) {
        // Undoing what the program applied is also what makes a retry safe:
        // with nothing half-applied, a corrected program runs from the top
        // rather than having to skip the part that already landed.
        this.#transaction?.rollback();
      } else {
        // A handler that never settled may still mutate at any point, so the
        // snapshot describes a state that may no longer be reachable. Restoring
        // it could clobber a later write; not restoring leaves a partial
        // application. Neither is safe, so the transaction is marked unusable
        // and patching is refused until a full program re-establishes state.
        this.#transactionPoisoned = true;
      }

      const message = err instanceof Error ? err.message : String(err);
      // A timed-out program is still running in there — possibly mid-await on a
      // tool call, possibly looping — and nothing else can stop it. Left alive
      // it would keep mutating state behind the next execution's back, and a
      // wedged sandbox would time out every run after this one.
      if (message.startsWith('Execution timed out')) this.destroy();
      return this.#fail(code, message, record);
    } finally {
      clearTimeout(timer);
    }
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

export { IframeExecutor } from './iframe-executor.js';
export { stateTransaction, combineTransactions } from './transaction.js';
export type { Transaction } from './transaction.js';
export { FunctionExecutor } from './function-executor.js';
export type { CodeExecutor, ExecutionRequest } from './executor.js';
export { PatchOpSchema } from './patch.js';
export type {
  PatchOp,
  PatchRejectionReason,
  PatchResult,
  PreviousRun,
} from './patch.js';
export type { CodeRunRecord, CodeToolOptions } from './types.js';
