import { z } from 'zod';

/**
 * A split can be of the following types:
 * - string // Simple path like 'user', 'profile.bio', 'views', or 'views.tracks.top'
 * - `${string}[${number}]` // Enum split into equal max. sized subarrays 'category[50]'
 * - `${string}[${number}:${number}]` // Enum slice like 'category[0:50]'
 * - `${string}[${number}:]` // Enum slice from index to end like 'category[50:]'
 * - `${string}[:${number}]` // Enum slice from start to index like 'category[:50]'
 * - `${string}[:]` // Entire enum (equivalent to just the path)
 *
 * Array and record paths are auto-detected from the schema — no special notation needed.
 * Simply use the property path (e.g., 'todos' for an array, 'configs' for a record).
 */
export const splitSchema = z.union([
  z.string(),
  z.templateLiteral([z.string(), '[', z.number(), ']']),
  z.templateLiteral([z.string(), '[', z.number(), ':', z.number(), ']']),
  z.templateLiteral([z.string(), '[', z.number(), ':', ']']),
  z.templateLiteral([z.string(), '[:', z.number(), ']']),
  z.templateLiteral([z.string(), '[:]']),
]);
