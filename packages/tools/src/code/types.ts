import type { ToolDefinitionZod } from '@mcp-web/types';
import type { PatchRejectionReason } from './patch.js';

export interface CodeToolOptions {
  /** The tools to expose as callable globals in the sandbox. */
  tools: ToolDefinitionZod[];
  /** Custom name for the tool (default: 'code'). */
  name?: string;
  /** Custom description (default: auto-generated from tool schemas). */
  description?: string;
  /** Execution timeout in milliseconds (default: 30000). */
  timeout?: number;
  /**
   * Opt-in line patching for the `code` argument (default: disabled).
   *
   * When enabled, `code` also accepts a list of edits against the previous
   * program, and failed runs echo that program with line numbers.
   *
   * Because tool calls commit as they run, an edited program may only be
   * re-run when the original committed nothing — so a run that failed after
   * making tool calls is refused, not patched. Once execution runs against a
   * shadow copy, that restriction can be lifted.
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
   * `transaction.ts`. Without one, behaviour is unchanged: each handler commits
   * as it runs, and a program that fails part-way leaves its prefix applied.
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

export type ParentToIframeMessage =
  | ExecuteMessage
  | FunctionResultMessage;
