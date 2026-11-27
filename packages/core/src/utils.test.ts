import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { getOutputValidator, toToolMetadataJson } from './utils.js';

const countSchema = () => ({
  type: 'object',
  properties: { count: { type: 'number' } },
  required: ['count'],
});

describe('getOutputValidator', () => {
  const originalFunction = globalThis.Function;

  afterEach(() => {
    globalThis.Function = originalFunction;
  });

  test('validates results against a JSON Schema', () => {
    const validateResult = getOutputValidator(countSchema());
    expect(validateResult?.({ count: 1 })).toEqual({ count: 1 });
    expect(() => validateResult?.({ total: 1 })).toThrow('Invalid output');
  });

  test('throws for a schema that cannot be compiled', () => {
    expect(() =>
      getOutputValidator({ type: 'object', $ref: 'missing.json' }),
    ).toThrow();
  });

  test('returns undefined when the page blocks compiling', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    // Ajv logs the code it failed to compile
    const error = spyOn(console, 'error').mockImplementation(() => {});
    // A Content Security Policy without `unsafe-eval` blocks `new Function`
    globalThis.Function = function () {
      throw new EvalError('Code generation from strings disallowed');
    } as unknown as FunctionConstructor;

    expect(getOutputValidator(countSchema())).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });
});

test('toToolMetadataJson keeps annotations', () => {
  const metadata = toToolMetadataJson({
    name: 'get_todos',
    description: 'Gets the todos',
    handler: () => [],
    annotations: { readOnlyHint: true },
  });

  expect(metadata.annotations).toEqual({ readOnlyHint: true });
});
