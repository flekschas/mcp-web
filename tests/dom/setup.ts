import { z } from 'zod';
import { CodeTool } from '@mcp-web/tools/code';

/**
 * Creates a CodeTool with test fixtures and exposes helpers on window
 * so Playwright can drive the tests.
 */

const doubleTool = {
  name: 'double',
  description: 'Doubles a number',
  inputSchema: z.object({ n: z.number() }),
  outputSchema: z.number(),
  handler: async (params: { n: number }) => params.n * 2,
};

const failingTool = {
  name: 'fail',
  description: 'Always throws an error',
  inputSchema: z.object({ message: z.string() }),
  handler: async (params: { message: string }) => {
    throw new Error(params.message);
  },
};

const silentFailTool = {
  name: 'silent_fail',
  description: 'Throws an error without a message',
  handler: async () => {
    throw new Error();
  },
};

const slowTool = {
  name: 'slow',
  description: 'Never resolves',
  handler: () => new Promise(() => {}),
};

// Standard CodeTool with normal timeout
const codeTool = new CodeTool({
  tools: [doubleTool, failingTool, silentFailTool],
});

// CodeTool with short timeout for timeout tests
const timeoutCodeTool = new CodeTool({
  name: 'code_timeout',
  tools: [slowTool],
  timeout: 1_000,
});

// CodeTool whose functions are callable only once looked up
const lookupCodeTool = new CodeTool({
  name: 'code_lookup',
  tools: [doubleTool],
  signatures: 'lookup',
});

// Expose to Playwright via window
declare global {
  interface Window {
    __test: {
      execute: (code: string) => Promise<{ result?: unknown; error?: string }>;
      executeTimeout: (
        code: string,
      ) => Promise<{ result?: unknown; error?: string }>;
      executeLookup: (
        code: string,
      ) => Promise<{ result?: unknown; error?: string }>;
      lookUp: (names: string[]) => unknown;
      destroy: () => void;
      iframeCount: () => number;
    };
  }
}

window.__test = {
  execute: (code: string) => codeTool.handler({ code }),
  executeTimeout: (code: string) => timeoutCodeTool.handler({ code }),
  executeLookup: (code: string) => lookupCodeTool.handler({ code }),
  lookUp: (names: string[]) => lookupCodeTool.lookupTool?.handler({ names }),
  destroy: () => codeTool.destroy(),
  iframeCount: () => document.querySelectorAll('iframe').length,
};
