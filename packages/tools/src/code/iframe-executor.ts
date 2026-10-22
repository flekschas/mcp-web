import { generateSrcdoc } from './srcdoc.js';
import type { CodeExecutor, ExecutionRequest } from './executor.js';
import type {
  FunctionCallMessage,
  IframeToParentMessage,
} from './types.js';

/**
 * Runs programs in a sandboxed iframe, proxying tool calls over `postMessage`.
 *
 * This is the browser executor and the default: `allow-scripts` only, so the
 * program cannot touch the host page, and every capability it has arrives as a
 * proxied function. Extracted from `CodeTool` unchanged in behaviour — the
 * message protocol, the ready handshake and the stale-execution guard are all
 * as they were.
 */
export class IframeExecutor implements CodeExecutor {
  #iframe: HTMLIFrameElement | null = null;
  #readyPromise: Promise<void>;
  #resolveReady!: () => void;
  /** Names the current iframe was built for; a change forces a rebuild. */
  #builtFor: string | null = null;
  /**
   * The run whose calls are still honoured.
   *
   * A program that timed out keeps running in there, and its calls keep
   * arriving. Answering them would let an abandoned run mutate state behind the
   * next one's back, so they are refused by id rather than by tearing
   * everything down and hoping.
   */
  #activeExecutionId: string | null = null;
  #callTool: ExecutionRequest['callTool'] | null = null;

  constructor() {
    this.#readyPromise = new Promise<void>((resolve) => {
      this.#resolveReady = resolve;
    });
  }

  #ensureIframe(functionNames: readonly string[]): void {
    const key = functionNames.join(',');
    if (this.#iframe && this.#builtFor === key) return;
    if (this.#iframe) this.destroy();

    const iframe = document.createElement('iframe');
    iframe.sandbox.add('allow-scripts');
    iframe.style.display = 'none';
    iframe.srcdoc = generateSrcdoc([...functionNames]);

    window.addEventListener('message', this.#handleMessage);

    document.body.appendChild(iframe);
    this.#iframe = iframe;
    this.#builtFor = key;
  }

  #handleMessage = (event: MessageEvent<IframeToParentMessage>) => {
    if (event.source !== this.#iframe?.contentWindow) return;
    const msg = event.data;

    if (msg.type === 'ready') {
      this.#resolveReady();
      return;
    }
    if (msg.type === 'function_call') {
      void this.#handleFunctionCall(msg);
    }
    // execution_result is handled by the per-execution listener in execute().
  };

  #post(message: unknown): void {
    this.#iframe?.contentWindow?.postMessage(message, '*');
  }

  async #handleFunctionCall(msg: FunctionCallMessage): Promise<void> {
    if (msg.id !== this.#activeExecutionId || !this.#callTool) {
      this.#post({
        type: 'function_result',
        id: msg.id,
        callId: msg.callId,
        error: 'This execution is no longer active.',
      });
      return;
    }

    try {
      const result = await this.#callTool(msg.name, msg.args);
      this.#post({
        type: 'function_result',
        id: msg.id,
        callId: msg.callId,
        result,
      });
    } catch (err) {
      this.#post({
        type: 'function_result',
        id: msg.id,
        callId: msg.callId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async execute(request: ExecutionRequest): Promise<unknown> {
    this.#ensureIframe(request.functionNames);
    await this.#readyPromise;

    this.#activeExecutionId = request.executionId;
    this.#callTool = request.callTool;

    return new Promise<unknown>((resolve, reject) => {
      const listener = (event: MessageEvent) => {
        if (event.source !== this.#iframe?.contentWindow) return;
        const msg = event.data;
        if (msg.type !== 'execution_result' || msg.id !== request.executionId) {
          return;
        }
        cleanup();
        if (msg.error) reject(new Error(msg.error));
        else resolve(msg.result);
      };

      const cleanup = () => {
        window.removeEventListener('message', listener);
        // Past this point the program is answered, so any further call it makes
        // is a stray from a run that is over.
        this.#activeExecutionId = null;
      };

      window.addEventListener('message', listener);
      this.#post({
        type: 'execute',
        id: request.executionId,
        code: request.code,
      });
    });
  }

  destroy(): void {
    this.#activeExecutionId = null;
    this.#callTool = null;
    window.removeEventListener('message', this.#handleMessage);
    if (this.#iframe) {
      this.#iframe.remove();
      this.#iframe = null;
    }
    this.#builtFor = null;
    this.#readyPromise = new Promise<void>((resolve) => {
      this.#resolveReady = resolve;
    });
  }
}
