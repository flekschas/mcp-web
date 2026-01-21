/**
 * Type tests for MCPWeb.addTool() overloads.
 *
 * These tests verify compile-time type safety. They don't execute any code,
 * but TypeScript will report errors if the type constraints are violated.
 *
 * Positive tests should compile without errors.
 * Negative tests are commented out with expected errors explained.
 */

import { z } from 'zod';
import type { MCPWeb } from './web.js';

// Mock MCPWeb instance for type testing
declare const mcp: MCPWeb;

// ============================================================================
// CASE 1: Zod input + Zod output (full type safety)
// ============================================================================

// Positive test 1.1: Correct handler signature matching schemas
mcp.addTool({
  name: 'double',
  description: 'Double a number',
  handler: ({ value }) => ({ result: value * 2 }),
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.object({ result: z.number() }),
});

// Positive test 1.2: Async handler with correct types
mcp.addTool({
  name: 'asyncDouble',
  description: 'Double a number asynchronously',
  handler: async ({ value }) => ({ result: value * 2 }),
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.object({ result: z.number() }),
});

// Positive test 1.3: Complex nested schema
mcp.addTool({
  name: 'complexTool',
  description: 'Complex tool with nested objects',
  handler: ({ user }) => ({
    greeting: `Hello, ${user.name}!`,
    metadata: { processed: true },
  }),
  inputSchema: z.object({
    user: z.object({
      name: z.string(),
      age: z.number().optional(),
    }),
  }),
  outputSchema: z.object({
    greeting: z.string(),
    metadata: z.object({ processed: z.boolean() }),
  }),
});

// ============================================================================
// CASE 1: Negative tests (these should cause TypeScript errors)
// ============================================================================

// Negative test 1.1: Wrong input property name
mcp.addTool({
  name: 'wrongInput',
  description: 'Wrong input',
  // @ts-expect-error
  // Incorrect input: Handler expects 'value' but schema has 'number'
  handler: ({ value }) => ({ result: value * 2 }),
  inputSchema: z.object({ number: z.number() }),
  outputSchema: z.object({ result: z.number() }),
});

// Negative test 1.2: Wrong output property type
mcp.addTool({
  name: 'wrongOutput',
  description: 'Wrong output',
  // @ts-expect-error
  // Incorrect output: Handler returns 'string' but schema has 'number'
  handler: ({ value }) => ({ result: String(value) }),
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.object({ result: z.number() }),
});

// Negative test 1.3: Missing required output property
mcp.addTool({
  name: 'missingOutput',
  description: 'Missing output property',
  // @ts-expect-error
  // Incorrect output: Handler returns 'result' but schema has 'result' and 'extra'
  handler: ({ value }) => ({ result: value * 2 }),
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.object({ result: z.number(), extra: z.string() }),
});

// ============================================================================
// CASE 2: Zod output only (no input - getter tools)
// ============================================================================

// Positive test 2.1: Simple getter
mcp.addTool({
  name: 'getCount',
  description: 'Get current count',
  handler: () => ({ count: 42 }),
  outputSchema: z.object({ count: z.number() }),
});

// Positive test 2.2: Async getter
mcp.addTool({
  name: 'asyncGetState',
  description: 'Get current state asynchronously',
  handler: async () => ({ status: 'active', timestamp: Date.now() }),
  outputSchema: z.object({ status: z.string(), timestamp: z.number() }),
});

// Positive test 2.3: Array output
mcp.addTool({
  name: 'getItems',
  description: 'Get list of items',
  handler: () => ['item1', 'item2'],
  outputSchema: z.array(z.string()),
});

// ============================================================================
// CASE 2: Negative tests
// ============================================================================

// Negative test 2.1: Wrong return type
// @ts-expect-error - No overload matches (wrong property name in output)
mcp.addTool({
  name: 'wrongReturn',
  description: 'Wrong return type',
  handler: () => ({ value: 42 }),
  outputSchema: z.object({ count: z.number() }),
});

// Negative test 2.2: Handler has parameter but shouldn't
mcp.addTool({
  name: 'unexpectedParam',
  description: 'Unexpected parameter',
  // @ts-expect-error
  // Incorrect input: Handler has unexpected parameter
  handler: (count: number) => ({ count }),
  outputSchema: z.object({ count: z.number() }),
});

// Negative test 2.3: Wrong array element type
mcp.addTool({
  name: 'wrongArrayType',
  description: 'Wrong array element type',
  handler: () => [1, 2, 3],
  // @ts-expect-error
  // Incorrect output: Handler returns number[] but schema has string[]
  outputSchema: z.array(z.string()),
});

// ============================================================================
// CASE 3: Zod input only (no output - void return)
// ============================================================================

// Positive test 3.1: Setter that returns void
mcp.addTool({
  name: 'setCount',
  description: 'Set count value',
  handler: ({ count }) => {
    // Set the count, no return value
    console.log(count);
  },
  inputSchema: z.object({ count: z.number() }),
});

// Positive test 3.2: Complex input, void return
mcp.addTool({
  name: 'updateUser',
  description: 'Update user data',
  handler: ({ name, email }) => {
    console.log(name, email);
  },
  inputSchema: z.object({ name: z.string(), email: z.string() }),
});

// Positive test 3.3: Nested input, void return
mcp.addTool({
  name: 'saveConfig',
  description: 'Save configuration',
  handler: ({ config }) => {
    console.log(config.theme, config.fontSize);
  },
  inputSchema: z.object({
    config: z.object({
      theme: z.enum(['light', 'dark']),
      fontSize: z.number(),
    }),
  }),
});

// ============================================================================
// CASE 3: Negative tests
// ============================================================================

// Negative test 3.1: Wrong input property
mcp.addTool({
  name: 'wrongInputProp',
  description: 'Wrong input property',
  // @ts-expect-error
  // Handler expects 'count' but schema has 'value'
  handler: ({ count }) => { console.log(count); },
  inputSchema: z.object({ value: z.number() }),
});

// USERR: I think this is a an impossible and wrong test. We cannot enforce the usage of inputs.
// Negative test 3.2: Missing input parameter
// mcp.addTool({
//   name: 'missingParam',
//   description: 'Missing parameter',
//   // @ts-expect-error
//   // Handler must accept input parameter when inputSchema is provided
//   handler: () => { console.log('no input'); },
//   inputSchema: z.object({ count: z.number() }),
// });

// Negative test 3.3: Wrong input type access
mcp.addTool({
  name: 'wrongTypeAccess',
  description: 'Wrong type access',
  // @ts-expect-error
  // Trying to access string method on number
  handler: ({ count }) => { console.log(count.toUpperCase()); },
  inputSchema: z.object({ count: z.number() }),
});

// ============================================================================
// CASE 4, 5, 6: JSON Schema (runtime validation only - no compile-time safety)
// ============================================================================

// These tests verify that JSON Schema overloads accept the types,
// but don't provide compile-time type checking. Any type mismatches
// would only be caught at runtime.

// Test 4: JSON Schema input + output
mcp.addTool({
  name: 'jsonSchemaInputOutput',
  description: 'JSON Schema input and output',
  handler: (input) => {
    // input is unknown, no type safety
    return { result: (input as { value: number }).value * 2 };
  },
  inputSchema: { type: 'object', properties: { value: { type: 'number' } } },
  outputSchema: { type: 'object', properties: { result: { type: 'number' } } },
});

// Test 5: JSON Schema output only
mcp.addTool({
  name: 'jsonSchemaOutputOnly',
  description: 'JSON Schema output only',
  handler: () => {
    return { count: 42 };
  },
  outputSchema: { type: 'object', properties: { count: { type: 'number' } } },
});

// Test 6: JSON Schema input only
mcp.addTool({
  name: 'jsonSchemaInputOnly',
  description: 'JSON Schema input only',
  handler: (input) => {
    console.log(input);
  },
  inputSchema: { type: 'object', properties: { value: { type: 'number' } } },
});

// JSON Schema tests - These should pass even with type mismatches
// because JSON Schema doesn't provide compile-time type safety

// This compiles fine even though we return a string instead of number
mcp.addTool({
  name: 'jsonSchemaMismatch',
  description: 'JSON Schema with type mismatch',
  handler: () => {
    return { count: 'not a number' }; // Would fail at runtime, not compile time
  },
  outputSchema: { type: 'object', properties: { count: { type: 'number' } } },
});

console.log('Type tests passed!');
