import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EXAMPLES } from './examples.ts';
import { checkVegaLiteSpec } from './schema.ts';

const base = {
  data: { values: [{ a: 1 }] },
  mark: 'point',
  encoding: { x: { field: 'a', type: 'quantitative' } },
};

/** The problems as `path: message`, without the schema locations. */
const check = (spec: unknown) =>
  checkVegaLiteSpec(spec).map(
    (problem) =>
      `${problem.path.join('.')}: ${problem.message.replace(/ \(schema: .*\)$/, '')}`,
  );

test('examples pass', () => {
  for (const example of EXAMPLES) {
    assert.deepEqual(check(example.spec), [], example.name);
  }
});

test('an unknown property is reported next to a nested error', () => {
  assert.deepEqual(check({ ...base, banana: 1 }), [
    ': unknown property "banana"',
  ]);
  const problems = check({ ...base, banana: 1, mark: 'pointt' });
  assert.equal(problems[0], ': unknown property "banana"');
  assert.match(problems[1], /^mark: must be one of /);
});

test('a string lists every value and type its alternatives accept', () => {
  const [mark] = check({ ...base, mark: 'barr' });
  for (const value of ['"bar"', '"boxplot"', '"errorband"', 'object']) {
    assert.ok(mark.includes(value), mark);
  }
  assert.deepEqual(check({ ...base, width: '400' }), [
    'width: must be one of "container" or of type number | object',
  ]);
});

test('an object is checked against the closest alternative', () => {
  assert.deepEqual(check({ ...base, mark: { type: 'point', sizee: 3 } }), [
    'mark: unknown property "sizee"',
  ]);
  assert.deepEqual(
    check({ ...base, encoding: { x: { field: 'a', type: 'quant' } } }),
    [
      'encoding.x.type: must be one of "quantitative", "ordinal", "temporal", "nominal"',
    ],
  );
});

test('equally close alternatives are listed as alternative fixes', () => {
  const [root] = check({ data: { values: [] } });
  assert.ok(root.startsWith(': fits none of the allowed shapes; fix one: '));
  assert.ok(root.includes('[missing required property "mark"]'), root);
  assert.ok(root.includes('[missing required property "layer"]'), root);
  assert.deepEqual(
    check({
      data: base.data,
      facet: { field: 'a', type: 'nominal' },
      mark: 'point',
    }),
    [
      ': fits none of the allowed shapes; fix one: [unknown property "facet"] or [missing required property "spec"; unknown property "mark"]',
    ],
  );
});
