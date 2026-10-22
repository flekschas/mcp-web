/**
 * How a program is run, separated from what the code tool does around it.
 *
 * `CodeTool` owns everything that is true regardless of where the code
 * executes: resolving a patch against the previous program, validating and
 * transforming the source, counting started tool calls, tracking in-flight
 * handlers, enforcing the timeout, rendering errors, and keeping the run log.
 * An executor owns only the two things that genuinely differ — how the program
 * is evaluated, and how a call from inside it reaches a tool handler.
 *
 * The line matters because the two are easy to conflate: an execution
 * environment that also owned patching or validation would have to reimplement
 * them, and the two implementations would drift.
 */

export interface ExecutionRequest {
  /** The validated, transformed program. */
  code: string;
  /** Identifies this run; late calls from an abandoned run carry an old id. */
  executionId: string;
  /** Function names to expose as callable globals inside the sandbox. */
  functionNames: readonly string[];
  /**
   * Route a call from inside the sandbox to its tool handler.
   *
   * Provided by `CodeTool`, which counts the call and tracks the promise, so an
   * executor must not invoke handlers directly — doing so would leave the
   * started-call count wrong, and that count is what decides whether a failed
   * program is safe to patch.
   */
  callTool(name: string, args: unknown): Promise<unknown>;
}

export interface CodeExecutor {
  /**
   * Run the program and resolve with its value.
   *
   * Rejecting is how an executor reports a program that threw; the message
   * reaches the model unchanged. The timeout is enforced by `CodeTool`, which
   * calls `destroy()` when it fires — an executor does not need its own.
   */
  execute(request: ExecutionRequest): Promise<unknown>;

  /**
   * Tear the sandbox down. Called on timeout and on `CodeTool.destroy()`, and
   * must leave the executor able to run again afterwards.
   */
  destroy(): void;
}
