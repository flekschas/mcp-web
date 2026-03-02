import type { z } from 'zod';

// ---------------------------------------------------------------------------
// Test Case Definitions
// ---------------------------------------------------------------------------

export interface TestApp {
  /** Unique name for this app (used in CLI filtering and results) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Zod schema defining the application state shape */
  schema: z.ZodTypeAny;
  /** Test cases for this app */
  cases: TestCase[];
  /** System-generated fields to ignore during state comparison (e.g. 'id', 'created_at') */
  ignoreFields?: string[];
  /** Additional tools beyond schema-generated CRUD (e.g. search, lookup) */
  extraTools?: import('@mcp-web/types').ToolDefinitionZod[];
}

export interface TestCase {
  /** Unique ID within the app (e.g. 'add-single-todo') */
  id: string;
  /** Human-readable description */
  description: string;
  /** Natural language prompt given to the LLM */
  prompt: string;
  /** Initial application state (JSON-serializable) */
  initialState: unknown;
  /** Expected end state (JSON-serializable) */
  goldenState: unknown;
  /** Minimum number of tool calls to go from initialState to goldenState */
  goldenMinToolCalls: number;
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

export type Condition = 'normal-tools' | 'code-tool';

// ---------------------------------------------------------------------------
// Model Configuration
// ---------------------------------------------------------------------------

export type Provider = 'anthropic' | 'openai' | 'openrouter' | 'cerebras';

export interface ModelConfig {
  /** Display ID (e.g. 'claude-opus-4.6') */
  id: string;
  /** Which AI SDK provider to use */
  provider: Provider;
  /** Model name passed to the provider */
  modelName: string;
  /** Environment variable name for the API key */
  envKey: string;
}

// ---------------------------------------------------------------------------
// Eval Results
// ---------------------------------------------------------------------------

export interface SuccessMetric {
  /** Whether finalState exactly matches goldenState (after ignoring system fields) */
  exact: boolean;
  /** Approximate number of tool calls needed to go from finalState to goldenState */
  editDistance: number;
  /** 1 - (editDistance / goldenMinToolCalls), clamped to [0, 1] */
  normalizedScore: number;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface EvalRun {
  /** Unique run ID */
  id: string;
  /** ISO timestamp */
  timestamp: string;
  /** Model ID from ModelConfig */
  model: string;
  /** Which condition was used */
  condition: Condition;
  /** App name */
  app: string;
  /** Test case ID */
  caseId: string;
  /** Repetition number (1-indexed) */
  repetition: number;

  // Primary metrics
  success: SuccessMetric;
  wallClockMs: number;

  // Secondary metrics
  /** Number of top-level AI SDK tool-calling steps */
  toolCallCount: number;
  /** For code-tool: inner tool calls within code; for normal-tools: same as toolCallCount */
  innerToolCallCount: number;
  tokens: TokenUsage;

  // Debug data
  finalState: unknown;
  error?: string;
}

// ---------------------------------------------------------------------------
// Runner Options
// ---------------------------------------------------------------------------

export interface RunnerOptions {
  models: string[];
  apps: string[];
  conditions: Condition[];
  reps: number;
  maxSteps: number;
  timeout: number;
  outputDir: string;
  dryRun: boolean;
}
