/**
 * Type tests for `elicit`, the second argument of tool handlers.
 *
 * These tests verify compile-time type safety. They don't execute any code,
 * but TypeScript will report errors if the type constraints are violated.
 */

import type { Elicit } from '@mcp-web/types';
import { z } from 'zod';
import { createTool } from './create-tool.js';
import type { MCPWeb } from './web.js';

declare const mcp: MCPWeb;
declare const elicit: Elicit;

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
const expectType = <T extends true>(_: T) => {};

// ============================================================================
// The three forms
// ============================================================================

async function forms() {
  // Confirmation
  const confirmed = await elicit('Delete 12 todos?');
  expectType<Equal<typeof confirmed, boolean>>(true);

  // Choices
  const language = await elicit('Which language?', ['English', 'German']);
  expectType<Equal<typeof language, 'English' | 'German' | undefined>>(true);

  // Choices built at runtime
  const names: string[] = ['a', 'b'];
  const name = await elicit('Which dataset?', names);
  expectType<Equal<typeof name, string | undefined>>(true);

  // Form
  const region = await elicit(
    'Which region?',
    z.object({
      chrom: z.enum(['chr1', 'chr2']),
      start: z.number().default(0),
      end: z.number().optional(),
      label: z.string(),
      email: z.email(),
      visible: z.boolean(),
      tracks: z.array(z.enum(['genes', 'peaks'])),
    }),
  );
  expectType<
    Equal<
      typeof region,
      | {
          chrom: 'chr1' | 'chr2';
          start: number;
          end?: number | undefined;
          label: string;
          email: string;
          visible: boolean;
          tracks: ('genes' | 'peaks')[];
        }
      | undefined
    >
  >(true);
}

// ============================================================================
// Negative tests: what MCP elicitation can't ask for
// ============================================================================

async function negatives() {
  // @ts-expect-error - Empty choices
  await elicit('Which language?', []);

  // @ts-expect-error - Choices must be strings
  await elicit('Which number?', [1, 2]);

  // @ts-expect-error - Nested objects
  await elicit('Where?', z.object({ region: z.object({ start: z.number() }) }));

  // @ts-expect-error - Arrays of strings
  await elicit('Which tags?', z.object({ tags: z.array(z.string()) }));

  await elicit(
    'Which tracks?',
    // @ts-expect-error - Arrays of objects
    z.object({ tracks: z.array(z.object({ id: z.string() })) }),
  );

  // @ts-expect-error - Nullable fields
  await elicit('Name?', z.object({ name: z.string().nullable() }));

  // @ts-expect-error - Not an object schema
  await elicit('Name?', z.string());
}

// ============================================================================
// Handlers get `elicit` as the second argument
// ============================================================================

// Zod input
mcp.addTool({
  name: 'delete_todos',
  description: 'Delete todos',
  inputSchema: z.object({ ids: z.array(z.string()) }),
  outputSchema: z.object({ deleted: z.number() }),
  handler: async ({ ids }, { elicit }) => {
    const ok = await elicit(`Delete ${ids.length} todos?`);
    return { deleted: ok ? ids.length : 0 };
  },
});

// No input
mcp.addTool({
  name: 'get_greeting',
  description: 'Greet the user in their language',
  outputSchema: z.string(),
  handler: async (_input, { elicit }) => {
    const language = await elicit('Which language?', ['English', 'German']);
    return language === 'German' ? 'Hallo!' : 'Hello!';
  },
});

// JSON Schema
mcp.addTool({
  name: 'confirm',
  description: 'Ask for confirmation',
  inputSchema: { type: 'object', properties: {} },
  handler: async (_input, { elicit }) => ({ ok: await elicit('Continue?') }),
});

// createTool
createTool({
  name: 'pick_region',
  description: 'Pick a region',
  outputSchema: z.object({ chrom: z.string() }).optional(),
  handler: (_input, { elicit }) =>
    elicit('Which region?', z.object({ chrom: z.enum(['chr1', 'chr2']) })),
});

// One-argument handlers keep working
createTool({
  name: 'double',
  description: 'Double a number',
  inputSchema: z.object({ value: z.number() }),
  handler: ({ value }) => {
    console.log(value * 2);
  },
});

// Negative test: the answer has the type of the choices
// @ts-expect-error - No overload matches: the answer is a string, not a number
mcp.addTool({
  name: 'wrong_answer_type',
  description: 'Wrong answer type',
  outputSchema: z.number(),
  handler: async (_input, { elicit }) => elicit('Which?', ['a', 'b']),
});

export { forms, negatives };
