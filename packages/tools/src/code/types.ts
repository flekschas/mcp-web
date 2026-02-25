import type { ToolDefinitionZod } from '@mcp-web/types';

export interface CodeToolOptions {
  /** The tools to expose as callable globals in the sandbox. */
  tools: ToolDefinitionZod[];
  /** Custom name for the tool (default: 'code'). */
  name?: string;
  /** Custom description (default: auto-generated from tool schemas). */
  description?: string;
  /** Execution timeout in milliseconds (default: 30000). */
  timeout?: number;
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
