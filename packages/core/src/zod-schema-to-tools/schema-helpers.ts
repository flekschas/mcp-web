import { z } from 'zod';

/**
 * Marks a field as the unique identifier for array elements.
 *
 * When an array schema has a field marked with `id()`, the generated tools
 * use ID-based operations (e.g., `set_todos_by_id`) instead of index-based.
 * Only one field per schema can be marked with `id()`.
 *
 * @param schema - The Zod schema to mark as the key field
 * @returns The same schema with key field metadata attached
 *
 * @example
 * ```typescript
 * const TodoSchema = z.object({
 *   id: id(z.string()),
 *   title: z.string(),
 *   completed: z.boolean(),
 * });
 *
 * // Generates: get_todos, set_todos_by_id, delete_todos_by_id
 * mcp.addStateTools({ name: 'todos', schema: z.array(TodoSchema), expand: true });
 * ```
 */
export function id<T extends z.ZodTypeAny>(schema: T): T {
  (schema.def as unknown as Record<string, unknown>).__mcpWebKey = true;
  return schema;
}

/**
 * Marks a field as system-generated and excludes it from input schemas.
 *
 * System fields are auto-populated and never provided by the AI. They are
 * excluded from add/set input schemas but included in output/getter schemas.
 * Fields marked with `system()` MUST have a `.default()` value.
 *
 * Common uses: auto-generated IDs, timestamps, version numbers.
 *
 * @param schema - The Zod schema to mark as system-generated (must have default)
 * @returns The same schema with system field metadata attached
 * @throws {Error} At tool generation time if schema lacks a default value
 *
 * @example
 * ```typescript
 * const TodoSchema = z.object({
 *   id: id(system(z.string().default(() => crypto.randomUUID()))),
 *   createdAt: system(z.number().default(() => Date.now())),
 *   title: z.string(),  // User provides this
 * });
 * ```
 */
export function system<T extends z.ZodTypeAny>(schema: T): T {
  (schema.def as unknown as Record<string, unknown>).__mcpWebSystem = true;
  return schema;
}

/**
 * Checks if a field is marked with id().
 */
export function isKeyField(field: z.ZodTypeAny): boolean {
  return (field.def as unknown as Record<string, unknown>).__mcpWebKey === true;
}

/**
 * Checks if a field is marked with system().
 */
export function isSystemField(field: z.ZodTypeAny): boolean {
  return (field.def as unknown as Record<string, unknown>).__mcpWebSystem === true;
}

/**
 * Checks if a schema has a default value.
 */
export function hasDefault(schema: z.ZodTypeAny): boolean {
  // Check for ZodDefault wrapper
  if (schema instanceof z.ZodDefault) {
    return true;
  }

  // Check _def for default value
  const def = schema.def as unknown as Record<string, unknown>;
  return def.defaultValue !== undefined || typeof def.defaultValue === 'function';
}

/**
 * Unwraps a schema from ZodDefault, ZodOptional, ZodNullable wrappers.
 * Returns the innermost schema.
 */
export function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema;

  while (
    current instanceof z.ZodDefault ||
    current instanceof z.ZodOptional ||
    current instanceof z.ZodNullable
  ) {
    const def = current.def as unknown as { innerType?: z.ZodTypeAny };
    current = def.innerType || current;
  }

  return current;
}

/**
 * Unwraps ZodDefault to get the inner schema.
 */
export function unwrapDefault(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodDefault) {
    const def = schema.def as unknown as { innerType: z.ZodTypeAny };
    return def.innerType;
  }
  return schema;
}

/**
 * Derives an input schema for add operations.
 * - system() fields are excluded
 * - default() fields become optional
 * - other fields remain required
 */
export function deriveAddInputSchema(schema: z.ZodObject<z.ZodRawShape>): z.ZodObject<z.ZodRawShape> {
  const inputShape: Record<string, z.ZodTypeAny> = {};

  for (const [key, field] of Object.entries(schema.shape)) {
    const zodField = field as z.ZodTypeAny;
    // Skip system fields entirely
    if (isSystemField(zodField)) continue;

    // Fields with default() become optional in add
    if (hasDefault(zodField)) {
      inputShape[key] = unwrapDefault(zodField).optional();
    } else {
      inputShape[key] = zodField;
    }
  }

  return z.object(inputShape as z.ZodRawShape);
}

/**
 * Derives an input schema for set operations (partial updates).
 * - system() fields are excluded
 * - all other fields become optional
 */
export function deriveSetInputSchema(schema: z.ZodObject<z.ZodRawShape>): z.ZodObject<z.ZodRawShape> {
  const inputShape: Record<string, z.ZodTypeAny> = {};

  for (const [key, field] of Object.entries(schema.shape)) {
    const zodField = field as z.ZodTypeAny;
    // Skip system fields entirely
    if (isSystemField(zodField)) continue;

    // All fields optional for partial updates
    inputShape[key] = unwrapDefault(zodField).optional();
  }

  return z.object(inputShape as z.ZodRawShape);
}

/**
 * Validates that all system() fields have default values.
 * Throws an error if a system field lacks a default.
 */
export function validateSystemFields(schema: z.ZodObject<z.ZodRawShape>): void {
  for (const [key, field] of Object.entries(schema.shape)) {
    const zodField = field as z.ZodTypeAny;
    if (isSystemField(zodField) && !hasDefault(zodField)) {
      throw new Error(
        `Error: Field '${key}' is marked as system() but has no default value.\n\n` +
        `System fields are excluded from input schemas, so a default is required.\n` +
        `The handler uses this default to fill in the value when creating new items.\n\n` +
        `Fix: Add a default value or generator:\n` +
        `  ${key}: system(z.number().default(() => Date.now()))`
      );
    }
  }
}
