import { describe, expect, test } from 'bun:test';
import { validateAndTransformCode } from './validate.js';

describe('validateAndTransformCode', () => {
  test('valid JavaScript passes', () => {
    const result = validateAndTransformCode('const x = 1 + 2');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('syntax errors are caught', () => {
    const result = validateAndTransformCode('const x = {');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('import declarations are rejected', () => {
    const result = validateAndTransformCode(
      "import { foo } from 'bar';\nfoo();",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('ImportDeclaration');
    expect(result.error).toContain('globals');
  });

  test('export declarations are rejected', () => {
    const result = validateAndTransformCode('export const x = 1;');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('ExportNamedDeclaration');
  });

  test('export default is rejected', () => {
    const result = validateAndTransformCode('export default 42;');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('ExportDefaultDeclaration');
  });

  test('top-level await is allowed', () => {
    const result = validateAndTransformCode(
      'const x = await fetchData({ query: "test" });',
    );
    expect(result.valid).toBe(true);
  });

  test('last expression statement is transformed to return', () => {
    const result = validateAndTransformCode(
      'const x = 1;\nconst y = 2;\nx + y',
    );
    expect(result.valid).toBe(true);
    expect(result.transformedCode).toContain('return (x + y)');
    expect(result.transformedCode).toContain('const x = 1;');
  });

  test('last non-expression statement is NOT transformed', () => {
    const code = 'for (let i = 0; i < 3; i++) { console.log(i); }';
    const result = validateAndTransformCode(code);
    expect(result.valid).toBe(true);
    expect(result.transformedCode).toBe(code);
  });

  test('single expression is transformed', () => {
    const result = validateAndTransformCode('42');
    expect(result.valid).toBe(true);
    expect(result.transformedCode).toBe('return (42)');
  });

  test('function call as last expression is transformed', () => {
    const result = validateAndTransformCode(
      'const items = await getItems();\nitems.length',
    );
    expect(result.valid).toBe(true);
    expect(result.transformedCode).toContain('return (items.length)');
  });

  test('await expression as last statement is transformed', () => {
    const result = validateAndTransformCode(
      'await searchItems({ query: "test" })',
    );
    expect(result.valid).toBe(true);
    expect(result.transformedCode).toContain(
      'return (await searchItems({ query: "test" }))',
    );
  });

  test('empty code is valid', () => {
    const result = validateAndTransformCode('');
    expect(result.valid).toBe(true);
    expect(result.transformedCode).toBe('');
  });

  test('variable declaration as last statement is not transformed', () => {
    const result = validateAndTransformCode('const x = 1;');
    expect(result.valid).toBe(true);
    expect(result.transformedCode).toBe('const x = 1;');
  });

  test('complex code with loops and conditionals passes', () => {
    const code = `
const items = await getItems();
const filtered = items.filter(i => i.active);
for (const item of filtered) {
  await updateItem({ id: item.id, data: { processed: true } });
}
filtered.length`;
    const result = validateAndTransformCode(code);
    expect(result.valid).toBe(true);
    expect(result.transformedCode).toContain('return (filtered.length)');
  });
});
