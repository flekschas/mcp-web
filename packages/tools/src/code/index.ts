import type { ToolDefinitionZod } from '@mcp-web/types';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { BaseTool } from '../base.js';
import { generateCodeToolDescription } from './description.js';
import { generateSrcdoc } from './srcdoc.js';
import type {
  CodeToolOptions,
  FunctionCallMessage,
  IframeToParentMessage,
} from './types.js';
import { validateAndTransformCode } from './validate.js';

const DEFAULT_TIMEOUT = 30_000;

const CodeInputSchema = z.object({
  code: z.string().describe('JavaScript code to execute in the sandbox'),
});
type CodeInput = z.infer<typeof CodeInputSchema>;

const CodeOutputSchema = z.object({
  result: z.unknown().optional().describe('Return value of the code'),
  error: z.string().optional().describe('Error message if execution failed'),
});
type CodeOutput = z.infer<typeof CodeOutputSchema>;

export class CodeTool extends BaseTool<
  typeof CodeInputSchema,
  typeof CodeOutputSchema
> {
  #name: string;
  #description: string;
  #tools: ToolDefinitionZod[];
  #timeout: number;
  #iframe: HTMLIFrameElement | null = null;
  #readyPromise: Promise<void>;
  #resolveReady!: () => void;

  constructor(options: CodeToolOptions) {
    super();
    this.#name = options.name ?? 'code';
    this.#tools = options.tools;
    this.#timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.#description =
      options.description ?? generateCodeToolDescription(this.#tools);

    this.#readyPromise = new Promise<void>((resolve) => {
      this.#resolveReady = resolve;
    });
  }

  get name(): string {
    return this.#name;
  }

  get description(): string {
    return this.#description;
  }

  get inputSchema(): typeof CodeInputSchema {
    return CodeInputSchema;
  }

  get outputSchema(): typeof CodeOutputSchema {
    return CodeOutputSchema;
  }

  get handler(): (params: CodeInput) => Promise<CodeOutput> {
    return this.#execute.bind(this);
  }

  /** Creates the sandboxed iframe on first use. */
  #ensureIframe(): void {
    if (this.#iframe) return;

    const functionNames = this.#tools.map((t) => t.name);
    const srcdoc = generateSrcdoc(functionNames);

    const iframe = document.createElement('iframe');
    iframe.sandbox.add('allow-scripts');
    iframe.style.display = 'none';
    iframe.srcdoc = srcdoc;

    window.addEventListener('message', this.#handleMessage);

    document.body.appendChild(iframe);
    this.#iframe = iframe;
  }

  /** Handles all messages from the iframe. */
  #handleMessage = (event: MessageEvent<IframeToParentMessage>) => {
    if (event.source !== this.#iframe?.contentWindow) return;

    const msg = event.data;

    if (msg.type === 'ready') {
      this.#resolveReady();
      return;
    }

    if (msg.type === 'function_call') {
      this.#handleFunctionCall(msg);
    }

    // execution_result is handled by per-execution listeners in #execute
  };

  /** Executes a proxied function call from the iframe. */
  async #handleFunctionCall(msg: FunctionCallMessage): Promise<void> {
    const tool = this.#tools.find((t) => t.name === msg.name);

    if (!tool) {
      this.#iframe?.contentWindow?.postMessage(
        {
          type: 'function_result',
          id: msg.id,
          callId: msg.callId,
          error: `Unknown function: ${msg.name}`,
        },
        '*',
      );
      return;
    }

    try {
      const result = await tool.handler(msg.args);
      this.#iframe?.contentWindow?.postMessage(
        {
          type: 'function_result',
          id: msg.id,
          callId: msg.callId,
          result,
        },
        '*',
      );
    } catch (err) {
      this.#iframe?.contentWindow?.postMessage(
        {
          type: 'function_result',
          id: msg.id,
          callId: msg.callId,
          error: err instanceof Error ? err.message : String(err),
        },
        '*',
      );
    }
  }

  /** Validates, transforms, and executes code in the sandbox. */
  async #execute(params: CodeInput): Promise<CodeOutput> {
    const validation = validateAndTransformCode(params.code);

    if (!validation.valid) {
      return { error: `Validation error: ${validation.error}` };
    }

    this.#ensureIframe();
    await this.#readyPromise;

    const executionId = uuidv4();
    const code = validation.transformedCode ?? params.code;

    return new Promise<CodeOutput>((resolve) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve({ error: `Execution timed out after ${this.#timeout}ms` });
      }, this.#timeout);

      const listener = (event: MessageEvent) => {
        if (event.source !== this.#iframe?.contentWindow) return;
        const msg = event.data;

        if (msg.type === 'execution_result' && msg.id === executionId) {
          cleanup();
          if (msg.error) {
            resolve({ error: msg.error });
          } else {
            resolve({ result: msg.result });
          }
        }
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        window.removeEventListener('message', listener);
      };

      window.addEventListener('message', listener);

      this.#iframe?.contentWindow?.postMessage(
        { type: 'execute', id: executionId, code },
        '*',
      );
    });
  }

  /** Removes the iframe and cleans up event listeners. */
  destroy(): void {
    window.removeEventListener('message', this.#handleMessage);
    if (this.#iframe) {
      this.#iframe.remove();
      this.#iframe = null;
    }
    this.#readyPromise = new Promise<void>((resolve) => {
      this.#resolveReady = resolve;
    });
  }
}
