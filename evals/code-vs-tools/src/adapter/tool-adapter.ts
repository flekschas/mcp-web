import {
  tool,
  jsonSchema,
  type ToolSet,
  type JSONSchema7,
} from 'ai';
import type { ToolDefinitionZod } from '@mcp-web/types';
import { z } from 'zod';

export interface ToolCallRecord {
  name: string;
  args: unknown;
  result: unknown;
  durationMs: number;
}

/**
 * Converts ToolDefinitionZod[] (from generateToolsForSchema) into an AI SDK ToolSet.
 *
 * Each tool's Zod inputSchema is converted to JSON Schema via z.toJSONSchema(),
 * then wrapped with the AI SDK's jsonSchema() helper.
 *
 * An optional onToolCall callback is invoked after each tool execution for metrics.
 */
export function zodToolsToAiSdk(
  tools: ToolDefinitionZod[],
  onToolCall?: (record: ToolCallRecord) => void,
): ToolSet {
  return Object.fromEntries(
    tools.map((t) => [
      t.name,
      tool({
        description: t.description ?? '',
        inputSchema: jsonSchema<Record<string, unknown>>(
          t.inputSchema
            ? (z.toJSONSchema(t.inputSchema) as JSONSchema7)
            : ({ type: 'object', properties: {} } as JSONSchema7),
        ),
        execute: async (args) => {
          const start = performance.now();
          const result = await t.handler(args);
          const durationMs = performance.now() - start;
          onToolCall?.({ name: t.name, args, result, durationMs });
          return result;
        },
      }),
    ]),
  );
}
