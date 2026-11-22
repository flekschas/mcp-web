import type { CodeExecutor, ExecutionRequest } from './executor.js';

/**
 * Runs programs in-process via the `Function` constructor.
 *
 * For environments with no DOM, such as tests and other Node-side use.
 *
 * **This is not a security boundary.** The `Function` constructor evaluates in
 * the host realm, so a program can reach anything the process can. Only use it
 * for trusted code or test fixtures. For untrusted code use `IframeExecutor`,
 * which is why it remains the default.
 */
export class FunctionExecutor implements CodeExecutor {
  /**
   * Runs the program with tool functions bound as named parameters.
   *
   * The wrappers are async and go through `callTool`, so the core still counts
   * every started call and tracks its promise. That matters even here, where
   * nothing is proxied across a boundary: the started-call count is what
   * decides whether a failed program can be patched.
   */
  async execute(request: ExecutionRequest): Promise<unknown> {
    const names = [...request.functionNames];
    const fns = names.map(
      (name) =>
        async (args?: unknown) =>
          request.callTool(name, args),
    );

    // Async so the program may use `await` on the proxied calls, matching what
    // the generated signatures advertise and what the iframe executor allows.
    const AsyncFunction = Object.getPrototypeOf(async () => {})
      .constructor as new (...args: string[]) => (
      ...fns: unknown[]
    ) => Promise<unknown>;

    // biome-ignore lint/security/noGlobalEval: deliberate sandbox for model-authored code; see the class comment on why this is not a security boundary.
    const program = new AsyncFunction(...names, request.code);
    return program(...fns);
  }

  destroy(): void {
    // Nothing to tear down: there is no sandbox to reclaim, and a program that
    // is still running cannot be cancelled — the same limitation the iframe
    // executor has for handlers already in flight in the parent.
  }
}
