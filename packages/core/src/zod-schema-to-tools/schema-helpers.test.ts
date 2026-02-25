import { expect, test } from 'bun:test';
import { z } from 'zod';
import {
  deriveAddInputSchema,
  deriveSetInputSchema,
  hasDefault,
  id,
  isKeyField,
  isSystemField,
  system,
  unwrapDefault,
  unwrapSchema,
  validateSystemFields,
} from './schema-helpers.js';

// ============================================================================
// Schema Markers
// ============================================================================

test('id() - marks field as unique identifier', () => {
  const schema = id(z.string());
  expect(isKeyField(schema)).toBe(true);
});

test('system() - marks field as system-generated', () => {
  const schema = system(z.string().default('auto'));
  expect(isSystemField(schema)).toBe(true);
});

test('isKeyField() - detects id() marker', () => {
  const markedSchema = id(z.string());
  const normalSchema = z.string();

  expect(isKeyField(markedSchema)).toBe(true);
  expect(isKeyField(normalSchema)).toBe(false);
});

test('isSystemField() - detects system() marker', () => {
  const markedSchema = system(z.string().default('auto'));
  const normalSchema = z.string();

  expect(isSystemField(markedSchema)).toBe(true);
  expect(isSystemField(normalSchema)).toBe(false);
});

test('id() and system() can be combined', () => {
  const schema = id(system(z.string().default(() => crypto.randomUUID())));

  expect(isKeyField(schema)).toBe(true);
  expect(isSystemField(schema)).toBe(true);
});

// ============================================================================
// Schema Unwrapping
// ============================================================================

test('unwrapSchema() - unwraps ZodDefault', () => {
  const schema = z.string().default('hello');
  const unwrapped = unwrapSchema(schema);

  expect(unwrapped).toBeInstanceOf(z.ZodString);
});

test('unwrapSchema() - unwraps ZodOptional', () => {
  const schema = z.string().optional();
  const unwrapped = unwrapSchema(schema);

  expect(unwrapped).toBeInstanceOf(z.ZodString);
});

test('unwrapSchema() - unwraps ZodNullable', () => {
  const schema = z.string().nullable();
  const unwrapped = unwrapSchema(schema);

  expect(unwrapped).toBeInstanceOf(z.ZodString);
});

test('unwrapSchema() - handles nested wrappers', () => {
  const schema = z.string().optional().default('hello').nullable();
  const unwrapped = unwrapSchema(schema);

  expect(unwrapped).toBeInstanceOf(z.ZodString);
});

test('unwrapSchema() - returns same schema if not wrapped', () => {
  const schema = z.string();
  const unwrapped = unwrapSchema(schema);

  expect(unwrapped).toBe(schema);
});

test('unwrapDefault() - unwraps only ZodDefault', () => {
  const schema = z.string().default('hello');
  const unwrapped = unwrapDefault(schema);

  expect(unwrapped).toBeInstanceOf(z.ZodString);
});

test('unwrapDefault() - returns same schema if not ZodDefault', () => {
  const schema = z.string().optional();
  const unwrapped = unwrapDefault(schema);

  expect(unwrapped).toBe(schema);
});

// ============================================================================
// Default Detection
// ============================================================================

test('hasDefault() - detects ZodDefault wrapper', () => {
  const withDefault = z.string().default('hello');
  const withoutDefault = z.string();

  expect(hasDefault(withDefault)).toBe(true);
  expect(hasDefault(withoutDefault)).toBe(false);
});

test('hasDefault() - works with nullable defaults', () => {
  const schema = z.string().nullable().default(null);
  expect(hasDefault(schema)).toBe(true);
});

test('hasDefault() - returns false for optional without default', () => {
  const schema = z.string().optional();
  expect(hasDefault(schema)).toBe(false);
});

// ============================================================================
// Input Schema Derivation - Add
// ============================================================================

test('deriveAddInputSchema() - excludes system() fields', () => {
  const schema = z.object({
    id: system(z.string().default(() => crypto.randomUUID())),
    value: z.string(),
    priority: z.number().default(3),
  });

  const addSchema = deriveAddInputSchema(schema);
  const shape = addSchema.shape;

  expect('id' in shape).toBe(false);
  expect('value' in shape).toBe(true);
  expect('priority' in shape).toBe(true);
});

test('deriveAddInputSchema() - makes default() fields optional', () => {
  const schema = z.object({
    required: z.string(),
    withDefault: z.number().default(5),
  });

  const addSchema = deriveAddInputSchema(schema);

  // Required field should be required
  const requiredResult = addSchema.safeParse({ required: 'test' });
  expect(requiredResult.success).toBe(true);

  // Field with default should be optional
  const optionalResult = addSchema.safeParse({ required: 'test' });
  expect(optionalResult.success).toBe(true);

  // Can also provide the default field
  const withBothResult = addSchema.safeParse({
    required: 'test',
    withDefault: 10,
  });
  expect(withBothResult.success).toBe(true);
});

test('deriveAddInputSchema() - keeps required fields required', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });

  const addSchema = deriveAddInputSchema(schema);

  // Should fail without required fields
  const missingName = addSchema.safeParse({ age: 30 });
  expect(missingName.success).toBe(false);

  const missingAge = addSchema.safeParse({ name: 'Alice' });
  expect(missingAge.success).toBe(false);

  // Should pass with both fields
  const complete = addSchema.safeParse({ name: 'Alice', age: 30 });
  expect(complete.success).toBe(true);
});

// ============================================================================
// Input Schema Derivation - Set
// ============================================================================

test('deriveSetInputSchema() - excludes system() fields', () => {
  const schema = z.object({
    id: system(z.string().default(() => crypto.randomUUID())),
    updated_at: system(z.number().default(() => Date.now())),
    value: z.string(),
  });

  const setSchema = deriveSetInputSchema(schema);
  const shape = setSchema.shape;

  expect('id' in shape).toBe(false);
  expect('updated_at' in shape).toBe(false);
  expect('value' in shape).toBe(true);
});

test('deriveSetInputSchema() - makes all fields optional', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string(),
  });

  const setSchema = deriveSetInputSchema(schema);

  // All fields optional - any combination should work
  expect(setSchema.safeParse({}).success).toBe(true);
  expect(setSchema.safeParse({ name: 'Alice' }).success).toBe(true);
  expect(setSchema.safeParse({ age: 30 }).success).toBe(true);
  expect(setSchema.safeParse({ name: 'Alice', age: 30 }).success).toBe(true);
  expect(
    setSchema.safeParse({ name: 'Alice', age: 30, email: 'alice@example.com' })
      .success
  ).toBe(true);
});

// ============================================================================
// Validation
// ============================================================================

test('validateSystemFields() - passes when system fields have defaults', () => {
  const schema = z.object({
    id: system(z.string().default(() => crypto.randomUUID())),
    created_at: system(z.number().default(() => Date.now())),
    value: z.string(),
  });

  expect(() => validateSystemFields(schema)).not.toThrow();
});

test('validateSystemFields() - throws when system field lacks default', () => {
  const schema = z.object({
    id: system(z.string()),
    value: z.string(),
  });

  expect(() => validateSystemFields(schema)).toThrow();
});

test('validateSystemFields() - error message includes field name', () => {
  const schema = z.object({
    timestamp: system(z.number()),
  });

  try {
    validateSystemFields(schema);
    expect(true).toBe(false); // Should not reach here
  } catch (error) {
    const message = (error as Error).message;
    expect(message).toContain('timestamp');
    expect(message).toContain('system()');
    expect(message).toContain('default');
  }
});

test('validateSystemFields() - error message suggests fix', () => {
  const schema = z.object({
    created_at: system(z.number()),
  });

  try {
    validateSystemFields(schema);
    expect(true).toBe(false); // Should not reach here
  } catch (error) {
    const message = (error as Error).message;
    expect(message).toContain('Fix:');
    expect(message).toContain('.default(');
  }
});

test('validateSystemFields() - passes with empty object', () => {
  const schema = z.object({});
  expect(() => validateSystemFields(schema)).not.toThrow();
});

test('validateSystemFields() - passes with no system fields', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });

  expect(() => validateSystemFields(schema)).not.toThrow();
});
