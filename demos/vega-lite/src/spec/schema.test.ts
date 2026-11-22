import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { EXAMPLES } from './examples.ts';
import { vegaLiteSpecSchema } from './schema.ts';

test('property names fit the pattern Claude accepts for tool inputs', () => {
  const { properties } = z.toJSONSchema(vegaLiteSpecSchema) as {
    properties: Record<string, unknown>;
  };
  for (const name of Object.keys(properties)) {
    assert.match(name, /^[a-zA-Z0-9_.-]{1,64}$/);
  }
});

test('a spec keeps its $schema', () => {
  const spec = EXAMPLES[0].spec;
  assert.ok('$schema' in spec);
  assert.equal(vegaLiteSpecSchema.parse(spec).$schema, spec.$schema);
});
