import { ToolLoopAgent, stepCountIs } from 'ai';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import { zodSchemasToTools } from '@mcp-web/core';
import { zodToolsToAiSdk, type ToolCallRecord } from '../adapter/tool-adapter.js';
import type { TestApp, TestCase } from '../types.js';

export interface NormalToolsResult {
  finalState: unknown;
  toolCallCount: number;
  innerToolCallCount: number;
  tokens: { input: number; output: number; total: number };
  wallClockMs: number;
  error?: string;
}

const SYSTEM_PROMPT =
  'You are an AI assistant. Use the available tools to fulfill the user\'s request. Do not ask clarifying questions - just do your best with the information provided.';

/**
 * Runs the normal-tools condition: the LLM gets all individual tools
 * and uses standard tool calling to modify application state.
 */
export async function runNormalTools(options: {
  app: TestApp;
  testCase: TestCase;
  model: LanguageModelV3;
  maxSteps: number;
  timeout: number;
}): Promise<NormalToolsResult> {
  const { app, testCase, model, maxSteps, timeout } = options;

  // Deep-clone initial state and create get/set closures
  let state: unknown = structuredClone(testCase.initialState);

  // Generate tools from the app schema
  const schemaTools = zodSchemasToTools({
    name: 'app',
    description: app.description,
    get: () => state,
    set: (v: unknown) => {
      state = v;
    },
    schema: app.schema,
  });

  // Merge schema-generated tools with any extra tools (e.g. search)
  const tools = [...schemaTools, ...(app.extraTools ?? [])];

  // Track tool calls
  const toolCalls: ToolCallRecord[] = [];
  const aiSdkTools = zodToolsToAiSdk(tools, (record) => {
    toolCalls.push(record);
  });

  const start = performance.now();

  try {
    const agent = new ToolLoopAgent({
      model,
      tools: aiSdkTools,
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

    return {
      finalState: structuredClone(state),
      toolCallCount: toolCalls.length,
      innerToolCallCount: toolCalls.length,
      tokens: {
        input: result.usage?.inputTokens ?? 0,
        output: result.usage?.outputTokens ?? 0,
        total: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
      },
      wallClockMs,
    };
  } catch (err) {
    const wallClockMs = performance.now() - start;
    return {
      finalState: structuredClone(state),
      toolCallCount: toolCalls.length,
      innerToolCallCount: toolCalls.length,
      tokens: { input: 0, output: 0, total: 0 },
      wallClockMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
