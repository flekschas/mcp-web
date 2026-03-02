import { randomUUID } from 'node:crypto';
import type {
  EvalRun,
  TestApp,
  TestCase,
  Condition,
  SuccessMetric,
} from '../types.js';
import { computeSuccess } from './state-diff.js';

interface ConditionResult {
  finalState: unknown;
  toolCallCount: number;
  innerToolCallCount: number;
  tokens: { input: number; output: number; total: number };
  wallClockMs: number;
  error?: string;
}

/**
 * Builds a complete EvalRun record from a condition result.
 */
export function collectRun(options: {
  model: string;
  condition: Condition;
  app: TestApp;
  testCase: TestCase;
  repetition: number;
  result: ConditionResult;
}): EvalRun {
  const { model, condition, app, testCase, repetition, result } = options;

  const success: SuccessMetric = computeSuccess(
    result.finalState,
    testCase.goldenState,
    testCase.goldenMinToolCalls,
    app.ignoreFields,
  );

  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    model,
    condition,
    app: app.name,
    caseId: testCase.id,
    repetition,
    success,
    wallClockMs: result.wallClockMs,
    toolCallCount: result.toolCallCount,
    innerToolCallCount: result.innerToolCallCount,
    tokens: result.tokens,
    finalState: result.finalState,
    error: result.error,
  };
}
