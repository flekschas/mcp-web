import type { ToolDefinitionZod } from '@mcp-web/types';
import { z } from 'zod';
import { BaseTool } from '../base.js';
import { functionSignature } from './description.js';

/** Names one lookup accepts. */
export const LOOKUP_LIMIT = 20;

const LookupInputSchema = z.object({
  names: z
    .array(z.string())
    .max(LOOKUP_LIMIT)
    .describe('Exact function names from the index, e.g. ["add_todo"].'),
});

const LookupOutputSchema = z.object({
  signatures: z
    .record(z.string(), z.string())
    .describe('TypeScript signature per function name'),
  unknown: z
    .array(z.string())
    .optional()
    .describe('Requested names that are not in the index'),
});

/**
 * Returns the signatures of a code tool's functions by name, and makes each
 * function it returns callable in the code tool's programs.
 *
 * Created by `CodeTool` when `signatures` is `'lookup'`; the two share the set
 * of looked-up names.
 */
export class SignatureLookupTool extends BaseTool<
  typeof LookupInputSchema,
  typeof LookupOutputSchema
> {
  #name: string;
  #tools: ToolDefinitionZod[];
  #lookedUp: Set<string>;

  constructor(options: {
    name: string;
    tools: ToolDefinitionZod[];
    lookedUp: Set<string>;
  }) {
    super();
    this.#name = options.name;
    this.#tools = options.tools;
    this.#lookedUp = options.lookedUp;
  }

  get name(): string {
    return this.#name;
  }

  get description(): string {
    return (
      'Return the TypeScript signatures of code functions by exact name, at ' +
      `most ${LOOKUP_LIMIT} per call. A program can call a function once its ` +
      'signature has been looked up.'
    );
  }

  get inputSchema(): typeof LookupInputSchema {
    return LookupInputSchema;
  }

  get outputSchema(): typeof LookupOutputSchema {
    return LookupOutputSchema;
  }

  get handler(): (
    params: z.infer<typeof LookupInputSchema>,
  ) => z.infer<typeof LookupOutputSchema> {
    return ({ names }) => {
      // No prototype, so a function named like `__proto__` is an own key.
      const signatures: Record<string, string> = Object.create(null);
      const unknown: string[] = [];
      for (const name of new Set(names)) {
        const tool = this.#tools.find((t) => t.name === name);
        if (!tool) {
          unknown.push(name);
          continue;
        }
        signatures[name] = functionSignature(tool);
        this.#lookedUp.add(name);
      }
      return unknown.length > 0 ? { signatures, unknown } : { signatures };
    };
  }
}
