import { describe, expect, test } from 'bun:test';
import type {
  Elicit,
  ElicitationRequest,
  ElicitationResult,
} from '@mcp-web/types';
import { z } from 'zod';
import { createElicit } from './elicitation.js';

/** An `elicit` whose user always gives `result`, recording the questions. */
const answerWith = (result: ElicitationResult) => {
  const requests: ElicitationRequest[] = [];
  const elicit = createElicit(async (request) => {
    requests.push(request);
    return result;
  });
  return { elicit, requests };
};

const RegionSchema = z.object({
  chrom: z.enum(['chr1', 'chr2']).describe('Chromosome'),
  start: z.number().default(0),
  end: z.int().optional(),
  email: z.email(),
  tracks: z.array(z.enum(['genes', 'peaks'])),
});

describe('confirmation', () => {
  test('asks with an empty object schema', async () => {
    const { elicit, requests } = answerWith({ action: 'accept', content: {} });
    expect(await elicit('Delete 12 todos?')).toBe(true);
    expect(requests).toEqual([
      {
        message: 'Delete 12 todos?',
        requestedSchema: { type: 'object', properties: {} },
      },
    ]);
  });

  test('is false when the user declines or cancels', async () => {
    expect(await answerWith({ action: 'decline' }).elicit('Delete?')).toBe(
      false,
    );
    expect(await answerWith({ action: 'cancel' }).elicit('Delete?')).toBe(
      false,
    );
  });
});

describe('choices', () => {
  test('asks with one required enum field and returns the choice', async () => {
    const { elicit, requests } = answerWith({
      action: 'accept',
      content: { choice: 'German' },
    });
    expect(await elicit('Which language?', ['English', 'German'])).toBe(
      'German',
    );
    expect(requests[0].requestedSchema).toEqual({
      type: 'object',
      properties: { choice: { type: 'string', enum: ['English', 'German'] } },
      required: ['choice'],
    });
  });

  test('is undefined when the user declines or cancels', async () => {
    for (const action of ['decline', 'cancel'] as const) {
      const { elicit } = answerWith({ action });
      expect(await elicit('Which?', ['a', 'b'])).toBeUndefined();
    }
  });

  test('rejects an answer that is not one of the choices', async () => {
    const { elicit } = answerWith({
      action: 'accept',
      content: { choice: 'French' },
    });
    await expect(elicit('Which?', ['English', 'German'])).rejects.toThrow(
      'not one of the choices',
    );
  });
});

describe('form', () => {
  test('asks with a flat schema of the fields', async () => {
    const { elicit, requests } = answerWith({ action: 'cancel' });
    await elicit('Which region?', RegionSchema);
    const { requestedSchema } = requests[0];
    expect(requestedSchema.properties).toEqual({
      chrom: {
        type: 'string',
        enum: ['chr1', 'chr2'],
        description: 'Chromosome',
      },
      start: { type: 'number', default: 0 },
      end: {
        type: 'integer',
        minimum: Number.MIN_SAFE_INTEGER,
        maximum: Number.MAX_SAFE_INTEGER,
      },
      email: { type: 'string', format: 'email' },
      tracks: {
        type: 'array',
        items: { type: 'string', enum: ['genes', 'peaks'] },
      },
    });
    // Fields with defaults or `.optional()` are not required.
    expect(requestedSchema.required).toEqual(['chrom', 'email', 'tracks']);
  });

  test('rejects rules the question cannot carry', async () => {
    const { elicit } = answerWith({ action: 'cancel' });
    const ask = (field: z.ZodType) =>
      elicit('Which?', z.object({ field }) as never);
    await expect(ask(z.uuid())).rejects.toThrow(
      'can\'t carry format, pattern of the field "field"',
    );
    await expect(ask(z.string().regex(/a+/))).rejects.toThrow('pattern');
    await expect(ask(z.iso.datetime({ precision: 0 }))).rejects.toThrow(
      'pattern',
    );
    await expect(ask(z.string().meta({ placeholder: 'Ada' }))).rejects.toThrow(
      'placeholder',
    );
    await expect(ask(z.number().positive())).rejects.toThrow(
      'exclusiveMinimum',
    );
    await expect(ask(z.number().multipleOf(2))).rejects.toThrow('multipleOf');
  });

  test('keeps the formats MCP elicitation supports', async () => {
    const { elicit, requests } = answerWith({ action: 'cancel' });
    await elicit(
      'Which?',
      z.object({ site: z.url(), day: z.iso.date(), at: z.iso.datetime() }),
    );
    expect(requests[0].requestedSchema.properties).toEqual({
      site: { type: 'string', format: 'uri' },
      day: { type: 'string', format: 'date' },
      at: { type: 'string', format: 'date-time' },
    });
  });

  test('resolves fields that share a schema with an id', async () => {
    const { elicit, requests } = answerWith({
      action: 'accept',
      content: { first: 'Ada', last: 'Lovelace' },
    });
    const name = z.string().meta({ id: 'person-name' });
    const answer = await elicit('Who?', z.object({ first: name, last: name }));
    expect(requests[0].requestedSchema.properties).toEqual({
      first: { type: 'string' },
      last: { type: 'string' },
    });
    expect(answer).toEqual({ first: 'Ada', last: 'Lovelace' });
  });

  test('returns the parsed answer with defaults applied', async () => {
    const { elicit } = answerWith({
      action: 'accept',
      content: { chrom: 'chr2', email: 'a@b.co', tracks: ['peaks'] },
    });
    expect(await elicit('Which region?', RegionSchema)).toEqual({
      chrom: 'chr2',
      start: 0,
      email: 'a@b.co',
      tracks: ['peaks'],
    });
  });

  test('is undefined when the user declines or cancels', async () => {
    for (const action of ['decline', 'cancel'] as const) {
      const { elicit } = answerWith({ action });
      expect(await elicit('Which region?', RegionSchema)).toBeUndefined();
    }
  });

  test('rejects an answer that does not match the schema', async () => {
    const { elicit } = answerWith({
      action: 'accept',
      content: { chrom: 'chr3' },
    });
    await expect(elicit('Which region?', RegionSchema)).rejects.toThrow(
      'does not match the schema',
    );
  });
});

describe('runtime check', () => {
  // Calls with arguments the types reject, as plain JavaScript could.
  const { elicit: typedElicit, requests } = answerWith({ action: 'cancel' });
  const elicit = typedElicit as unknown as (
    ...args: unknown[]
  ) => Promise<unknown>;

  test.each([
    [
      'nested objects',
      z.object({ region: z.object({ start: z.number() }) }),
      'the field "region" (object)',
    ],
    [
      'arrays of strings',
      z.object({ tags: z.array(z.string()) }),
      'the field "tags" (array of string)',
    ],
    [
      'arrays of objects',
      z.object({ tracks: z.array(z.object({ id: z.string() })) }),
      'the field "tracks" (array of object)',
    ],
    [
      'nullable fields',
      z.object({ name: z.string().nullable() }),
      'the field "name" (nullable)',
    ],
    [
      'enums of numbers',
      z.object({ level: z.enum({ low: 1, high: 2 }) }),
      'the field "level" (enum)',
    ],
  ])('rejects %s', async (_, schema, message) => {
    await expect(elicit('Which?', schema)).rejects.toThrow(message);
    await expect(elicit('Which?', schema)).rejects.toThrow(
      'Fields must be strings, numbers, booleans, enums',
    );
  });

  test('rejects choices that are empty or not strings', async () => {
    await expect(elicit('Which?', [])).rejects.toThrow(
      'choices must be a non-empty array of strings',
    );
    await expect(elicit('Which?', [1, 2])).rejects.toThrow(
      'choices must be a non-empty array of strings',
    );
  });

  test('rejects a second argument that is not choices or an object schema', async () => {
    await expect(elicit('Which?', z.string())).rejects.toThrow(
      'must be an array of choices or a Zod object schema',
    );
    await expect(
      elicit('Which?', { type: 'object', properties: {} }),
    ).rejects.toThrow('must be an array of choices or a Zod object schema');
  });

  test('rejects an empty message', async () => {
    await expect(elicit('')).rejects.toThrow('non-empty string');
  });

  test('asks nothing when the arguments are rejected', () => {
    expect(requests).toEqual([]);
  });
});

test('rejects an answer with an unknown action', async () => {
  const elicit: Elicit = createElicit(
    async () => ({ action: 'maybe' }) as unknown as ElicitationResult,
  );
  await expect(elicit('Continue?')).rejects.toThrow(
    "action must be 'accept', 'decline' or 'cancel'",
  );
});
