import type { ToolDefinitionZod } from '@mcp-web/types';
import type { PatchRejectionReason } from './patch.js';

export interface CodeToolOptions {
  /**
   * The tools to expose as callable globals in the sandbox.
   *
   * Input schemas must be Zod schemas whose checks are synchronous.
   */
  tools: ToolDefinitionZod[];
  /** Custom name for the tool (default: 'code'). */
  name?: string;
  /**
   * Replaces the whole generated description, including the function
   * signatures or index, the hints, and the patching instructions.
   */
  description?: string;
  /** Execution timeout in milliseconds (default: 30000). */
  timeout?: number;
  /**
   * What happens when a call's arguments fail its input schema (default:
   * 'collect').
   *
   * - `collect`: the call is skipped and returns `undefined`, the program runs
   *   on, and every invalid call is reported together when it ends. The run
   *   counts as failed.
   * - `throw`: the call throws. The program can catch it; otherwise it stops
   *   the program at the first invalid call.
   *
   * Collecting is the default because a response that lists every problem
   * lets the model fix them in one attempt. Without a `transaction`, the
   * program's valid calls still apply, and the error says how many ran.
   */
  validationErrors?: 'collect' | 'throw';
  /**
   * Where the model reads function signatures (default: 'inline').
   *
   * - `inline`: every signature is in the tool description.
   * - `lookup`: the description lists functions by name, and the model looks
   *   signatures up with `CodeTool.lookupTool` (`get_<name>_signature`). A
   *   call to a function that has not been looked up counts as invalid.
   *
   * `lookup` keeps the description small for large tool sets.
   */
  signatures?: 'inline' | 'lookup';
  /**
   * Advice for mistakes models are known to make with these tools.
   *
   * `description` is added to the tool description. `onError` is offered each
   * problem a failed run reports and returns a hint to append below it. When the problem is an invalid call, `name` is the
   * function called: for a skipped call, and under `throw` for the invalid
   * call that stopped the program.
   */
  hints?: {
    description?: string;
    onError?: (problem: string, name?: string) => string | undefined;
  };
  /**
   * Opt-in line patching for the `code` argument (default: disabled).
   *
   * When enabled, `code` also accepts a list of edits against the previous
   * program, and failed runs echo that program with line numbers.
   *
   * A failed run can be edited only if it left nothing applied: no tool call
   * ran, or a `transaction` rolled the calls back.
   */
  patch?: { enabled: boolean };
  /**
   * Where programs run. Defaults to `IframeExecutor`.
   *
   * `FunctionExecutor` runs in-process for environments with no DOM, and is
   * explicitly not a security boundary — see its class comment.
   */
  executor?: import('./executor.js').CodeExecutor;
  /**
   * Makes execution atomic: a program's changes all land, or none do.
   *
   * Supplied by the application because `CodeTool` has tools, not state — see
   * `transaction.ts`. Without one, each handler's changes apply as it runs and
   * stay when the program fails, including those of valid calls made after an
   * invalid one was skipped.
   */
  transaction?: import('./transaction.js').Transaction;
}

/** What one `code` call sent and how it ended. */
export interface CodeRunRecord {
  /** Whether the call sent a complete program or a list of edits. */
  input: 'full' | 'patch';
  /** Number of edits sent (patch calls only). */
  opCount?: number;
  /** Previous-program lines covered by the edits (patch calls only). */
  linesCovered?: number;
  /** Lines of text the edits wrote in (patch calls only). */
  linesWritten?: number;
  /** Set when the edits were refused, naming why. */
  rejection?: PatchRejectionReason;
  /** Whether the call returned an error. */
  failed: boolean;
}

/** Message from parent to iframe: execute code */
export interface ExecuteMessage {
  type: 'execute';
  id: string;
  code: string;
}

/** Message from parent to iframe: function call result */
export interface FunctionResultMessage {
  type: 'function_result';
  id: string;
  callId: string;
  result?: unknown;
  error?: string;
}

/** Message from iframe to parent: ready signal */
export interface ReadyMessage {
  type: 'ready';
}

/** Message from iframe to parent: function call request */
export interface FunctionCallMessage {
  type: 'function_call';
  id: string;
  callId: string;
  name: string;
  args: unknown;
}

/** Message from iframe to parent: execution result */
export interface ExecutionResultMessage {
  type: 'execution_result';
  id: string;
  result?: unknown;
  error?: string;
}

export type IframeToParentMessage =
  | ReadyMessage
  | FunctionCallMessage
  | ExecutionResultMessage;

export type ParentToIframeMessage = ExecuteMessage | FunctionResultMessage;
