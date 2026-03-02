import {
  ToolLoopAgent,
  tool,
  jsonSchema,
  stepCountIs,
  type JSONSchema7,
} from 'ai';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import type { Page } from '@playwright/test';
import type { TestApp, TestCase } from '../types.js';

export interface CodeToolResult {
  finalState: unknown;
  toolCallCount: number;
  innerToolCallCount: number;
  tokens: { input: number; output: number; total: number };
  wallClockMs: number;
  error?: string;
}

const SYSTEM_PROMPT =
  'You are an AI assistant. Use the available code tool to fulfill the user\'s request. Write JavaScript code that calls the provided functions to modify the application state. Do not ask clarifying questions - just do your best with the information provided.';

/**
 * Runs the code-tool condition: the LLM gets a single `code` tool
 * that executes JavaScript in the browser via the real CodeTool class.
 *
 * Requires a Playwright page with the browser harness loaded.
 */
export async function runCodeTool(options: {
  app: TestApp;
  testCase: TestCase;
  model: LanguageModelV3;
  maxSteps: number;
  timeout: number;
  page: Page;
}): Promise<CodeToolResult> {
  const { app, testCase, model, maxSteps, timeout, page } = options;

  // Initialize the CodeTool in the browser with this app and initial state
  await page.evaluate(
    ({ appName, initialState }) => {
      window.__eval.setup(appName, initialState);
    },
    { appName: app.name, initialState: testCase.initialState },
  );

  // Get the CodeTool description from the browser (includes function signatures)
  const codeDescription: string = await page.evaluate(() =>
    window.__eval.getDescription(),
  );

  // Create a single AI SDK tool that proxies to the browser CodeTool
  let topLevelToolCalls = 0;
  const codeToolDef = tool({
    description: codeDescription,
    inputSchema: jsonSchema<{ code: string }>({
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'JavaScript code to execute in the sandbox',
        },
      },
      required: ['code'],
    } as JSONSchema7),
    execute: async (args) => {
      topLevelToolCalls++;
      return page.evaluate((code) => window.__eval.execute(code), args.code);
    },
  });

  const start = performance.now();

  try {
    const agent = new ToolLoopAgent({
      model,
      tools: { code: codeToolDef },
      instructions: SYSTEM_PROMPT,
      stopWhen: [stepCountIs(maxSteps)],
    });

    const result = await Promise.race([
      agent.generate({ prompt: testCase.prompt }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout),
      ),
    ]);

    const wallClockMs = performance.now() - start;

    // Get final state and inner tool call count from the browser
    const [finalState, innerToolCallCount] = await Promise.all([
      page.evaluate(() => window.__eval.getState()),
      page.evaluate(() => window.__eval.getToolCallCount()),
    ]);

    return {
      finalState,
      toolCallCount: topLevelToolCalls,
      innerToolCallCount,
      tokens: {
        input: result.usage?.inputTokens ?? 0,
        output: result.usage?.outputTokens ?? 0,
        total: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
      },
      wallClockMs,
    };
  } catch (err) {
    const wallClockMs = performance.now() - start;

    // Try to get state even on error
    let finalState: unknown;
    let innerToolCallCount = 0;
    try {
      finalState = await page.evaluate(() => window.__eval.getState());
      innerToolCallCount = await page.evaluate(() =>
        window.__eval.getToolCallCount(),
      );
    } catch {
      finalState = testCase.initialState;
    }

    return {
      finalState,
      toolCallCount: topLevelToolCalls,
      innerToolCallCount,
      tokens: { input: 0, output: 0, total: 0 },
      wallClockMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
