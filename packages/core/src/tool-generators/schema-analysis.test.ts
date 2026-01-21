import { expect, test } from 'bun:test';
import { z } from 'zod';
import {
  analyzeSchemaShape,
  findIdField,
  validateSupportedTypes,
} from './schema-analysis.js';
import { id } from './schema-helpers.js';

// ============================================================================
// Shape Detection - Primitives
// ============================================================================

test('analyzeSchemaShape() - string is fixed primitive', () => {
  const schema = z.string();
  const shape = analyzeSchemaShape(schema);

  expect(shape.type).toBe('fixed');
  expect(shape.subtype).toBe('primitive');
});

test('analyzeSchemaShape() - number is fixed primitive', () => {
  const schema = z.number();
  const shape = analyzeSchemaShape(schema);

  expect(shape.type).toBe('fixed');
  expect(shape.subtype).toBe('primitive');
});

test('analyzeSchemaShape() - boolean is fixed primitive', () => {
  const schema = z.boolean();
  const shape = analyzeSchemaShape(schema);

  expect(shape.type).toBe('fixed');
  expect(shape.subtype).toBe('primitive');
});

test('analyzeSchemaShape() - enum is fixed primitive', () => {
  const schema = z.enum(['light', 'dark', 'system']);
  const shape = analyzeSchemaShape(schema);

  expect(shape.type).toBe('fixed');
  expect(shape.subtype).toBe('primitive');
});

test('analyzeSchemaShape() - literal is fixed primitive', () => {
  const schema = z.literal('constant');
  const shape = analyzeSchemaShape(schema);

  expect(shape.type).toBe('fixed');
  expect(shape.subtype).toBe('primitive');
});

// ============================================================================
// Shape Detection - Collections
// ============================================================================

test('analyzeSchemaShape() - array is dynamic', () => {
  const schema = z.array(z.string());
  const shape = analyzeSchemaShape(schema);

  expect(shape.type).toBe('dynamic');
  expect(shape.subtype).toBe('array');
});

test('analyzeSchemaShape() - record is dynamic', () => {
  const schema = z.record(z.string(), z.number());
  const shape = analyzeSchemaShape(schema);

  expect(shape.type).toBe('dynamic');
  expect(shape.subtype).toBe('record');
});

test('analyzeSchemaShape() - tuple is fixed', () => {
  const schema = z.tuple([z.string(), z.number(), z.boolean()]);
  const shape = analyzeSchemaShape(schema);

  expect(shape.type).toBe('fixed');
  expect(shape.subtype).toBe('tuple');
});

// ============================================================================
// Shape Detection - Objects
// ============================================================================

test('analyzeSchemaShape() - object with only fixed props is fixed', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
    active: z.boolean(),
  });
  const shape = analyzeSchemaShape(schema);

  expect(shape.type).toBe('fixed');
  expect(shape.subtype).toBe('object');
  expect(shape.fixedPaths).toEqual(['name', 'age', 'active']);
  expect(shape.dynamicPaths).toEqual([]);
});

test('analyzeSchemaShape() - object with only dynamic props is dynamic', () => {
  const schema = z.object({
    todos: z.array(z.string()),
    projects: z.record(z.string(), z.object({ name: z.string() })),
  });
  const shape = analyzeSchemaShape(schema);

  expect(shape.type).toBe('dynamic');
  expect(shape.subtype).toBe('object');
  expect(shape.fixedPaths).toEqual([]);
  expect(shape.dynamicPaths).toEqual(['todos', 'projects']);
});

test('analyzeSchemaShape() - object with mixed props is mixed', () => {
  const schema = z.object({
    name: z.string(),
    todos: z.array(z.string()),
    settings: z.object({ theme: z.string() }),
    projects: z.record(z.string(), z.object({ title: z.string() })),
  });
  const shape = analyzeSchemaShape(schema);

  expect(shape.type).toBe('mixed');
  expect(shape.subtype).toBe('object');
  expect(shape.fixedPaths).toContain('name');
  expect(shape.fixedPaths).toContain('settings');
  expect(shape.dynamicPaths).toContain('todos');
  expect(shape.dynamicPaths).toContain('projects');
});

// ============================================================================
// Optional Field Detection
// ============================================================================

test('analyzeSchemaShape() - detects optional fields', () => {
  const schema = z.object({
    name: z.string(),
    email: z.string().optional(),
    age: z.number().optional(),
  });
  const shape = analyzeSchemaShape(schema);

  expect(shape.hasOptionalFields).toBe(true);
  expect(shape.optionalPaths).toContain('email');
  expect(shape.optionalPaths).toContain('age');
  expect(shape.optionalPaths).not.toContain('name');
});

test('analyzeSchemaShape() - no optional fields when none present', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });
  const shape = analyzeSchemaShape(schema);

  expect(shape.hasOptionalFields).toBe(false);
  expect(shape.optionalPaths).toEqual([]);
});

test('analyzeSchemaShape() - wrapped optional fields (optional before default not detected)', () => {
  // When optional() comes before default(), the field is wrapped by ZodDefault
  // So the optional detection doesn't see it (checks the outer ZodDefault, not inner ZodOptional)
  const schema = z.object({
    value: z.string().optional().default('hello'),
  });
  const shape = analyzeSchemaShape(schema);

  // This is a limitation - wrapped optionals are not detected
  expect(shape.hasOptionalFields).toBe(false);
});

// ============================================================================
// Fixed vs Dynamic Path Tracking
// ============================================================================

test('analyzeSchemaShape() - fixedPaths contains non-collection fields', () => {
  const schema = z.object({
    title: z.string(),
    count: z.number(),
    nested: z.object({ value: z.string() }),
    items: z.array(z.string()),
  });
  const shape = analyzeSchemaShape(schema);

  expect(shape.fixedPaths).toContain('title');
  expect(shape.fixedPaths).toContain('count');
  expect(shape.fixedPaths).toContain('nested');
  expect(shape.fixedPaths).not.toContain('items');
});

test('analyzeSchemaShape() - dynamicPaths contains array/record fields', () => {
  const schema = z.object({
    name: z.string(),
    todos: z.array(z.string()),
    projects: z.record(z.string(), z.object({ title: z.string() })),
  });
  const shape = analyzeSchemaShape(schema);

  expect(shape.dynamicPaths).toContain('todos');
  expect(shape.dynamicPaths).toContain('projects');
  expect(shape.dynamicPaths).not.toContain('name');
});

test('analyzeSchemaShape() - correctly categorizes nested objects', () => {
  const schema = z.object({
    settings: z.object({
      theme: z.string(),
      language: z.string(),
    }),
  });
  const shape = analyzeSchemaShape(schema);

  expect(shape.fixedPaths).toContain('settings');
  expect(shape.dynamicPaths).not.toContain('settings');
});

// ============================================================================
// ID Field Detection
// ============================================================================

test('findIdField() - detects explicit id() marker', () => {
  const schema = z.object({
    id: id(z.string()),
    name: z.string(),
  });
  const result = findIdField(schema);

  expect(result.type).toBe('explicit');
  expect(result.field).toBe('id');
});

test('findIdField() - returns none when no marker', () => {
  const schema = z.object({
    id: z.string(),
    name: z.string(),
  });
  const result = findIdField(schema);

  expect(result.type).toBe('none');
  expect(result.field).toBeUndefined();
});

test('findIdField() - throws error on multiple id() markers', () => {
  const schema = z.object({
    id: id(z.string()),
    userId: id(z.string()),
    name: z.string(),
  });

  expect(() => findIdField(schema)).toThrow();
});

test('findIdField() - error message mentions both fields', () => {
  const schema = z.object({
    primaryId: id(z.string()),
    secondaryId: id(z.string()),
  });

  try {
    findIdField(schema);
    expect(true).toBe(false); // Should not reach here
  } catch (error) {
    const message = (error as Error).message;
    expect(message).toContain('primaryId');
    expect(message).toContain('secondaryId');
    expect(message).toContain('Multiple');
  }
});

test('findIdField() - error suggests using index-based for compound keys', () => {
  const schema = z.object({
    id1: id(z.string()),
    id2: id(z.string()),
  });

  try {
    findIdField(schema);
    expect(true).toBe(false); // Should not reach here
  } catch (error) {
    const message = (error as Error).message;
    expect(message).toContain('index-based');
    expect(message).toContain('compound');
  }
});

// ============================================================================
// Type Validation
// ============================================================================

test('validateSupportedTypes() - allows all JSON-compatible types', () => {
  const schema = z.object({
    str: z.string(),
    num: z.number(),
    bool: z.boolean(),
    date: z.date(),
    bigint: z.bigint(),
    nullValue: z.null(),
    undefinedValue: z.undefined(),
    literal: z.literal('constant'),
    enum: z.enum(['a', 'b']),
  });

  const errors = validateSupportedTypes(schema);
  expect(errors).toEqual([]);
});

test('validateSupportedTypes() - detects unsupported types', () => {
  const schema = z.function();
  const errors = validateSupportedTypes(schema);

  expect(errors.length).toBeGreaterThan(0);
  expect(errors[0]).toContain('Unsupported');
});

test('validateSupportedTypes() - recurses into nested objects', () => {
  const schema = z.object({
    valid: z.string(),
    nested: z.object({
      alsoValid: z.number(),
    }),
  });

  const errors = validateSupportedTypes(schema);
  expect(errors).toEqual([]);
});

test('validateSupportedTypes() - checks array elements', () => {
  const schema = z.array(z.string());
  const errors = validateSupportedTypes(schema);

  expect(errors).toEqual([]);
});

test('validateSupportedTypes() - checks record values', () => {
  const schema = z.record(
    z.string(),
    z.object({
      name: z.string(),
      count: z.number(),
    })
  );
  const errors = validateSupportedTypes(schema);

  expect(errors).toEqual([]);
});

test('validateSupportedTypes() - detects unsupported nested types', () => {
  const schema = z.object({
    valid: z.string(),
    nested: z.object({
      invalid: z.function(),
    }),
  });

  const errors = validateSupportedTypes(schema);
  expect(errors.length).toBeGreaterThan(0);
  expect(errors[0]).toContain('nested.invalid');
});

// ============================================================================
// Wrapped Schema Handling
// ============================================================================

test('analyzeSchemaShape() - handles wrapped schemas (default, optional, nullable)', () => {
  const schema = z.object({
    withDefault: z.string().default('hello'),
    withOptional: z.number().optional(),
    withNullable: z.boolean().nullable(),
  });
  const shape = analyzeSchemaShape(schema);

  expect(shape.type).toBe('fixed');
  expect(shape.subtype).toBe('object');
});

test('analyzeSchemaShape() - unwraps arrays with defaults', () => {
  const schema = z.array(z.string()).default([]);
  const shape = analyzeSchemaShape(schema);

  expect(shape.type).toBe('dynamic');
  expect(shape.subtype).toBe('array');
});

test('analyzeSchemaShape() - unwraps records with defaults', () => {
  const schema = z.record(z.string(), z.number()).default({});
  const shape = analyzeSchemaShape(schema);

  expect(shape.type).toBe('dynamic');
  expect(shape.subtype).toBe('record');
});
