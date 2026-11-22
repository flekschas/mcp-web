import { expect, test } from 'bun:test';
import { ToolDefinitionJsonSchema } from './tools.js';

const base = {
  name: 'greet',
  description: 'Greets someone',
  handler: () => {},
};

const accepts = (inputSchema: unknown) =>
  ToolDefinitionJsonSchema.safeParse({ ...base, inputSchema }).success;

test('accepts a JSON Schema object', () => {
  expect(
    accepts({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    }),
  ).toBe(true);
});

test('accepts a schema without a type', () => {
  expect(accepts({ properties: { name: { type: 'string' } } })).toBe(true);
});

test('rejects a non-object schema', () => {
  expect(accepts('object')).toBe(false);
  expect(accepts([{ type: 'object' }])).toBe(false);
});

test('rejects keywords of the wrong shape', () => {
  expect(accepts({ type: 'object', required: 'name' })).toBe(false);
  expect(accepts({ type: 'object', required: [1] })).toBe(false);
  expect(accepts({ type: 'object', properties: [] })).toBe(false);
  expect(accepts({ type: 42 })).toBe(false);
});
