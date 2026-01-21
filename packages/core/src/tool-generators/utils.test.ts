import { expect, test } from 'bun:test';
import { deepMerge } from './utils.js';

// ============================================================================
// Basic Merge Cases
// ============================================================================

test('deepMerge - merges two simple objects', () => {
  const target = { a: 1, b: 2 };
  const source = { c: 3 };
  const result = deepMerge(target, source);

  expect(result).toEqual({ a: 1, b: 2, c: 3 });
});

test('deepMerge - merges with nested objects recursively', () => {
  const target = {
    user: { name: 'Alice', age: 30 },
    settings: { theme: 'dark' },
  };
  const source = {
    user: { age: 31, email: 'alice@example.com' },
    settings: { notifications: true },
  };
  const result = deepMerge(target, source);

  expect(result).toEqual({
    user: { name: 'Alice', age: 31, email: 'alice@example.com' },
    settings: { theme: 'dark', notifications: true },
  });
});

test('deepMerge - merges with overlapping keys', () => {
  const target = { a: 1, b: 2, c: 3 };
  const source = { b: 20, c: 30 };
  const result = deepMerge(target, source);

  expect(result).toEqual({ a: 1, b: 20, c: 30 });
});

// ============================================================================
// Null/Undefined Handling
// ============================================================================

test('deepMerge - null in source sets value to null (explicit clear)', () => {
  const target = { a: 1, b: 2 };
  const source = { b: null };
  const result = deepMerge(target, source);

  expect(result).toEqual({ a: 1, b: null });
});

test('deepMerge - undefined in source keeps target value (no change)', () => {
  const target = { a: 1, b: 2 };
  const source = { b: undefined };
  const result = deepMerge(target, source);

  expect(result).toEqual({ a: 1, b: 2 });
});

test('deepMerge - null target, non-null source replaces with source', () => {
  const target = null;
  const source = { a: 1 };
  const result = deepMerge(target, source);

  expect(result).toEqual({ a: 1 });
});

test('deepMerge - nested null clears nested value', () => {
  const target = {
    user: { name: 'Alice', email: 'alice@example.com' },
  };
  const source = {
    user: { email: null },
  };
  const result = deepMerge(target, source);

  expect(result).toEqual({
    user: { name: 'Alice', email: null },
  });
});

// ============================================================================
// Array Behavior
// ============================================================================

test('deepMerge - arrays are replaced entirely (not merged)', () => {
  const target = { tags: ['a', 'b', 'c'] };
  const source = { tags: ['x', 'y'] };
  const result = deepMerge(target, source);

  expect(result).toEqual({ tags: ['x', 'y'] });
});

test('deepMerge - nested arrays within objects are replaced', () => {
  const target = {
    user: { name: 'Alice', tags: ['a', 'b'] },
  };
  const source = {
    user: { tags: ['x'] },
  };
  const result = deepMerge(target, source);

  expect(result).toEqual({
    user: { name: 'Alice', tags: ['x'] },
  });
});

test('deepMerge - array at root replaces target', () => {
  const target = [1, 2, 3];
  const source = [4, 5];
  const result = deepMerge(target, source);

  expect(result).toEqual([4, 5]);
});

// ============================================================================
// Edge Cases
// ============================================================================

test('deepMerge - empty objects', () => {
  const target = {};
  const source = {};
  const result = deepMerge(target, source);

  expect(result).toEqual({});
});

test('deepMerge - empty source returns target', () => {
  const target = { a: 1, b: 2 };
  const source = {};
  const result = deepMerge(target, source);

  expect(result).toEqual({ a: 1, b: 2 });
});

test('deepMerge - primitives in source replace target', () => {
  const target = { a: { nested: true } };
  const source = { a: 'string' };
  const result = deepMerge(target, source);

  expect(result).toEqual({ a: 'string' });
});

test('deepMerge - deep nesting (3+ levels)', () => {
  const target = {
    level1: {
      level2: {
        level3: {
          value: 'original',
          keep: true,
        },
      },
    },
  };
  const source = {
    level1: {
      level2: {
        level3: {
          value: 'updated',
        },
      },
    },
  };
  const result = deepMerge(target, source);

  expect(result).toEqual({
    level1: {
      level2: {
        level3: {
          value: 'updated',
          keep: true,
        },
      },
    },
  });
});

test('deepMerge - undefined source returns target', () => {
  const target = { a: 1 };
  const source = undefined;
  const result = deepMerge(target, source);

  expect(result).toEqual({ a: 1 });
});

test('deepMerge - primitive target and object source', () => {
  const target = 'string';
  const source = { a: 1 };
  const result = deepMerge(target, source);

  expect(result).toEqual({ a: 1 });
});

test('deepMerge - number source replaces any target', () => {
  const target = { nested: { value: true } };
  const source = 42;
  const result = deepMerge(target, source);

  expect(result).toBe(42);
});

test('deepMerge - boolean source replaces any target', () => {
  const target = { a: 1 };
  const source = false;
  const result = deepMerge(target, source);

  expect(result).toBe(false);
});
