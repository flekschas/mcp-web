import { CodeTool } from '@mcp-web/tools/code';
import { zodSchemasToTools } from '@mcp-web/core';
import { apps } from '../src/apps/index.js';

/**
 * Browser harness for the CodeTool eval condition.
 *
 * Exposes setup/execute/getState on window so Playwright can drive
 * the CodeTool from Node.js via page.evaluate().
 *
 * Follows the pattern from tests/dom/setup.ts.
 */

let currentState: unknown;
let currentCodeTool: CodeTool | null = null;
let toolCallLog: Array<{ name: string; args: unknown }> = [];

declare global {
  interface Window {
    __eval: {
      setup: (appName: string, initialState: unknown) => void;
      execute: (code: string) => Promise<{ result?: unknown; error?: string }>;
      getState: () => unknown;
      getDescription: () => string;
      getToolCallLog: () => Array<{ name: string; args: unknown }>;
      getToolCallCount: () => number;
      ready: boolean;
    };
  }
}

window.__eval = {
  ready: true,

  setup(appName: string, initialState: unknown) {
    // Clean up previous instance
    currentCodeTool?.destroy();
    toolCallLog = [];

    const app = apps[appName];
    if (!app) {
      throw new Error(
        `Unknown app: ${appName}. Available: ${Object.keys(apps).join(', ')}`,
      );
    }

    currentState = structuredClone(initialState);

    // Generate tools from the app schema
    const schemaTools = zodSchemasToTools({
      name: 'app',
      description: app.description,
      get: () => currentState,
      set: (v: unknown) => {
        currentState = v;
      },
      schema: app.schema,
    });

    // Merge schema-generated tools with any extra tools (e.g. search)
    const allTools = [...schemaTools, ...(app.extraTools ?? [])];

    // Wrap handlers to log inner tool calls
    const wrappedTools = allTools.map((t) => ({
      ...t,
      handler: async (args: unknown) => {
        toolCallLog.push({ name: t.name, args });
        return t.handler(args);
      },
    }));

    currentCodeTool = new CodeTool({ tools: wrappedTools });
  },

  async execute(code: string) {
    if (!currentCodeTool) {
      return { error: 'CodeTool not initialized. Call setup() first.' };
    }
    return currentCodeTool.handler({ code });
  },

  getState() {
    return structuredClone(currentState);
  },

  getDescription() {
    if (!currentCodeTool) {
      throw new Error('CodeTool not initialized. Call setup() first.');
    }
    return currentCodeTool.description;
  },

  getToolCallLog() {
    return [...toolCallLog];
  },

  getToolCallCount() {
    return toolCallLog.length;
  },
};
