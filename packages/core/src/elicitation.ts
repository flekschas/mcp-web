import type {
  Elicit,
  ElicitationRequest,
  ElicitationResult,
} from '@mcp-web/types';
import { z } from 'zod';

type RequestedSchema = ElicitationRequest['requestedSchema'];

/** The field that holds the answer to a question with choices. */
export const CHOICE_FIELD = 'choice';

const ALLOWED_FIELDS =
  'strings, numbers, booleans, enums of strings or arrays of such enums, ' +
  'optionally wrapped in .optional() or .default()';

/**
 * The string formats that MCP elicitation supports, with the pattern Zod adds
 * for each. The format implies that pattern. Another pattern, such as one from
 * `z.iso.datetime({ precision: 0 })`, is a rule the form can't show.
 */
const STRING_FORMATS: Record<string, unknown> = Object.fromEntries(
  [z.email(), z.url(), z.iso.date(), z.iso.datetime()].map((schema) => {
    const { format, pattern } = z.toJSONSchema(schema);
    return [format, pattern];
  }),
);

/** The keywords MCP elicitation allows for each kind of field. */
const KEYWORDS = {
  string: ['title', 'description', 'minLength', 'maxLength', 'default'],
  enum: ['title', 'description', 'enum', 'default'],
  number: ['title', 'description', 'minimum', 'maximum', 'default'],
  boolean: ['title', 'description', 'default'],
  array: ['title', 'description', 'minItems', 'maxItems', 'default'],
} as const;

/** Keywords that don't restrict the answer, so they can be left out. */
const IGNORED_KEYWORDS = new Set(['type', 'examples']);

type JsonSchema = Record<string, unknown>;

type ZodDef = z.core.$ZodTypeDef & {
  innerType?: z.ZodType;
  element?: z.ZodType;
  entries?: Record<string, unknown>;
};

const defOf = (value: unknown): ZodDef | undefined =>
  (value as { _zod?: { def?: ZodDef } } | null)?._zod?.def;

const isStringEnum = (def: ZodDef | undefined) =>
  def?.type === 'enum' &&
  Object.values(def.entries ?? {}).every((value) => typeof value === 'string');

/** A question, and how to read the user's answer to it. */
interface Question {
  request: ElicitationRequest;
  read(result: ElicitationResult): unknown;
}

/**
 * Turns the arguments of `elicit` into a question.
 *
 * @throws If the arguments are not one of the three forms `elicit` accepts.
 */
export function toQuestion(message: unknown, form?: unknown): Question {
  if (typeof message !== 'string' || message.length === 0) {
    throw new Error('elicit: the message must be a non-empty string.');
  }
  if (form === undefined) {
    return {
      request: { message, requestedSchema: { type: 'object', properties: {} } },
      read: (result) => result.action === 'accept',
    };
  }
  if (Array.isArray(form)) return toChoiceQuestion(message, form);
  if (defOf(form)?.type === 'object') {
    return toFormQuestion(message, form as z.ZodObject);
  }
  throw new Error(
    'elicit: the second argument must be an array of choices or a Zod ' +
      'object schema.',
  );
}

function toChoiceQuestion(message: string, choices: unknown[]): Question {
  if (
    choices.length === 0 ||
    !choices.every((choice): choice is string => typeof choice === 'string')
  ) {
    throw new Error('elicit: choices must be a non-empty array of strings.');
  }
  return {
    request: {
      message,
      requestedSchema: {
        type: 'object',
        properties: { [CHOICE_FIELD]: { type: 'string', enum: choices } },
        required: [CHOICE_FIELD],
      },
    },
    read: (result) => {
      if (result.action !== 'accept') return undefined;
      const choice = result.content?.[CHOICE_FIELD];
      if (typeof choice !== 'string' || !choices.includes(choice)) {
        throw new Error(
          `elicit: the answer ${JSON.stringify(choice)} is not one of the ` +
            'choices.',
        );
      }
      return choice;
    },
  };
}

function toFormQuestion(message: string, schema: z.ZodObject): Question {
  for (const [name, field] of Object.entries(schema.shape)) {
    checkField(name, field);
  }

  // `input` leaves fields with defaults out of `required`.
  const jsonSchema = z.toJSONSchema(schema, { io: 'input' }) as JsonSchema;
  const defs = (jsonSchema.$defs ?? {}) as Record<string, JsonSchema>;
  const root = resolveRef(jsonSchema, defs) as {
    properties?: Record<string, JsonSchema>;
    required?: string[];
  };
  const properties: RequestedSchema['properties'] = {};
  for (const [name, property] of Object.entries(root.properties ?? {})) {
    properties[name] = toProperty(name, resolveRef(property, defs), defs);
  }
  const required = root.required;

  return {
    request: {
      message,
      requestedSchema: {
        type: 'object',
        properties,
        ...(required?.length && { required }),
      },
    },
    read: (result) => {
      if (result.action !== 'accept') return undefined;
      const parsed = schema.safeParse(result.content ?? {});
      if (!parsed.success) {
        throw new Error(
          'elicit: the answer does not match the schema:\n' +
            z.prettifyError(parsed.error),
        );
      }
      return parsed.data;
    },
  };
}

/** @throws If MCP elicitation can't ask for this field. */
function checkField(name: string, field: unknown) {
  let def = defOf(field);
  if (def?.type === 'optional' || def?.type === 'default') {
    def = defOf(def.innerType);
  }
  const elementDef = def?.type === 'array' ? defOf(def.element) : undefined;
  const allowed =
    def?.type === 'string' ||
    def?.type === 'number' ||
    def?.type === 'boolean' ||
    isStringEnum(def) ||
    isStringEnum(elementDef);
  if (allowed) return;

  const kind = elementDef
    ? `array of ${elementDef.type}`
    : (def?.type ?? typeof field);
  throw new Error(
    `elicit: a question can't ask for the field "${name}" (${kind}). ` +
      `Fields must be ${ALLOWED_FIELDS}.`,
  );
}

/** Replaces a reference to a definition, such as a schema with an `id`. */
function resolveRef(
  node: JsonSchema,
  defs: Record<string, JsonSchema>,
): JsonSchema {
  const { $ref, ...rest } = node;
  const name =
    typeof $ref === 'string' && $ref.startsWith('#/$defs/')
      ? $ref.slice('#/$defs/'.length)
      : undefined;
  if (name === undefined || !defs[name]) return node;
  return { ...resolveRef(defs[name], defs), ...rest };
}

/**
 * Keeps the keywords MCP elicitation allows for a field's JSON Schema.
 *
 * @throws If the field has a rule that the question can't carry, since the
 * user couldn't see it and their answer would then fail the tool call
 */
function toProperty(
  name: string,
  property: JsonSchema,
  defs: Record<string, JsonSchema>,
): RequestedSchema['properties'][string] {
  const allowed = new Set<string>(IGNORED_KEYWORDS);
  const pick = (keywords: readonly string[]) => {
    for (const keyword of keywords) allowed.add(keyword);
    return Object.fromEntries(
      keywords
        .filter((key) => key in property)
        .map((key) => [key, property[key]]),
    );
  };

  let result: Record<string, unknown>;
  if (property.type === 'array') {
    const items = resolveRef(property.items as JsonSchema, defs);
    allowed.add('items');
    result = {
      type: 'array',
      items: { type: 'string', enum: items.enum },
      ...pick(KEYWORDS.array),
    };
  } else if (property.enum) {
    result = { type: 'string', ...pick(KEYWORDS.enum) };
  } else if (property.type === 'string') {
    const format = property.format as string | undefined;
    const isSupported =
      format !== undefined && Object.hasOwn(STRING_FORMATS, format);
    if (isSupported) {
      allowed.add('format');
      if (property.pattern === STRING_FORMATS[format]) allowed.add('pattern');
    }
    result = {
      type: 'string',
      ...pick(KEYWORDS.string),
      ...(isSupported && { format }),
    };
  } else if (property.type === 'number' || property.type === 'integer') {
    result = { type: property.type, ...pick(KEYWORDS.number) };
  } else if (property.type === 'boolean') {
    result = { type: 'boolean', ...pick(KEYWORDS.boolean) };
  } else {
    throw new Error(
      `elicit: a question can't ask for the field "${name}" ` +
        `(${JSON.stringify(property)}). Fields must be ${ALLOWED_FIELDS}.`,
    );
  }

  const unsupported = Object.keys(property).filter((key) => !allowed.has(key));
  if (unsupported.length > 0) {
    throw new Error(
      `elicit: a question can't carry ${unsupported.join(', ')} of the ` +
        `field "${name}". Leave it out of the schema. To check a rule the ` +
        "form can't show, check the answer in the handler instead.",
    );
  }
  return result as RequestedSchema['properties'][string];
}

const ACTIONS = new Set(['accept', 'decline', 'cancel']);

/**
 * Creates the `elicit` function that tool handlers get.
 *
 * @param ask - Asks the user the question and returns their answer.
 */
export function createElicit(
  ask: (request: ElicitationRequest) => Promise<ElicitationResult>,
): Elicit {
  const elicit = async (message: string, form?: unknown) => {
    const question = toQuestion(message, form);
    const result = await ask(question.request);
    if (!ACTIONS.has(result?.action)) {
      throw new Error(
        `elicit: the answer's action must be 'accept', 'decline' or ` +
          `'cancel', not ${JSON.stringify(result?.action)}.`,
      );
    }
    return question.read(result);
  };
  return elicit as Elicit;
}
