import type {
  ElicitRequestFormParams,
  ElicitResult,
} from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';

type ElicitPrimitive =
  | z.ZodString
  | z.ZodStringFormat
  | z.ZodNumber
  | z.ZodBoolean
  | z.ZodEnum
  | z.ZodArray<z.ZodEnum>;

/**
 * A field the user can fill in: a string (including string formats such as
 * `z.email()`), number, boolean, enum or array of enums (a multi-select),
 * optionally wrapped in `.optional()` or `.default()`.
 */
export type ElicitField =
  | ElicitPrimitive
  | z.ZodOptional<ElicitPrimitive>
  | z.ZodDefault<ElicitPrimitive>;

/**
 * A form to ask the user to fill in. MCP elicitation only allows flat objects,
 * so nested objects and arrays of anything but enums are not allowed.
 */
export type ElicitSchema = z.ZodObject<Record<string, ElicitField>>;

/**
 * Asks the user a question in the middle of a tool call and waits for the
 * answer.
 *
 * @example
 * ```typescript
 * // Yes or no: resolves to false when the user says no or cancels.
 * await elicit('Delete 12 todos?');
 *
 * // One of several choices, or undefined when the user declines or cancels.
 * await elicit('Which language?', ['English', 'German']);
 *
 * // A form, or undefined when the user declines or cancels.
 * await elicit('Which region?', z.object({
 *   chrom: z.enum(['chr1', 'chr2']),
 *   start: z.number().default(0),
 * }));
 * ```
 */
export interface Elicit {
  (message: string): Promise<boolean>;
  // Choices built at runtime are a `string[]`; only a literal `[]` is
  // rejected here, an empty array at runtime throws.
  <const C extends readonly string[]>(
    message: string,
    choices: C & (C extends readonly [] ? never : unknown),
  ): Promise<C[number] | undefined>;
  <S extends ElicitSchema>(
    message: string,
    schema: S,
  ): Promise<z.infer<S> | undefined>;
}

/** The second argument of a tool handler. */
export interface ToolHandlerContext {
  /** Asks the user a question and waits for the answer. */
  elicit: Elicit;
  /**
   * Aborts once nobody waits for the result any more: the bridge cancelled the
   * call, for example after a timeout, the connection closed, or the call
   * finished. Check it before changing anything after a long wait.
   */
  signal: AbortSignal;
}

/**
 * A question for the user, in the shape MCP uses for `elicitation/create`: a
 * message and a flat object schema of the fields to fill in.
 *
 * A yes-or-no question has no fields. A choice has one required enum field
 * named `choice`.
 */
export type ElicitationRequest = Pick<
  ElicitRequestFormParams,
  'message' | 'requestedSchema'
>;

/**
 * The user's answer, in the shape MCP uses for `elicitation/create`.
 *
 * - `accept`: the user answered; `content` holds the fields.
 * - `decline`: the user said no.
 * - `cancel`: the user dismissed the question without answering.
 */
export type ElicitationResult = Pick<ElicitResult, 'action' | 'content'>;

/**
 * Answers questions from tool handlers. Return the user's answer, or reject
 * to fail the tool call. `signal` aborts when nobody waits for the answer any
 * more, for example because the tool call timed out; hide the question then.
 */
export type ElicitationHandler = (
  request: ElicitationRequest,
  options: { signal: AbortSignal },
) => ElicitationResult | Promise<ElicitationResult>;
