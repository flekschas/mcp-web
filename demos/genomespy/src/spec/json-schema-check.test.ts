import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EXAMPLES } from './examples.ts';
import { checkGenomeSpySpec } from './schema.ts';

const data = { values: [] };

/** The problems as `path: message`, without the schema locations. */
const check = (spec: unknown) =>
  checkGenomeSpySpec(spec).map(
    (problem) =>
      `${problem.path.join('.')}: ${problem.message.replace(/ \(schema: .*\)$/, '')}`,
  );

test('examples pass', () => {
  for (const example of EXAMPLES) {
    assert.deepEqual(check(example.spec), [], example.name);
  }
  assert.deepEqual(
    check({ data, mark: 'point', description: ['one', 'two'] }),
    [],
  );
});

test('an error inside a tagged object is not blamed on its tag', () => {
  assert.deepEqual(check({ data, mark: { type: 'tick', thickness: 'a' } }), [
    'mark.thickness: must be of type number',
  ]);
});

test('a wrong tag lists every value of the tag', () => {
  const [mark] = check({ data, mark: { type: 'tik' } });
  assert.ok(mark.startsWith('mark.type: must be one of '), mark);
  assert.ok(mark.includes('"tick"') && mark.includes('"point"'), mark);

  const problems = check({
    data,
    mark: 'point',
    transform: [{ type: 'filtre', expr: 'datum.a > 1' }],
  });
  assert.equal(problems.length, 1, problems.join('\n'));
  for (const value of ['"filter"', '"formula"', '"pileup"']) {
    assert.ok(problems[0].includes(value), problems[0]);
  }
});

test('a wrong type names the type of the closest alternative', () => {
  assert.deepEqual(check({ assembly: 5, data, mark: 'point' }), [
    'assembly: must be of type string',
  ]);
});
