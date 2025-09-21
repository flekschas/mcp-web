import { z } from 'zod';

/**
 * A split can be of the following types:
 * - string // Simple path like 'user' or 'profile.bio'
 * - `${string}[${number}]` // Enum split into equal max. sized subarrays 'category[50]'
 * - `${string}[${number}:${number}]` // Enum slice like 'category[0:50]'
 * - `${string}[${number}:]` // Enum slice from index to end like 'category[50:]'
 * - `${string}[:${number}]` // Enum slice from start to index like 'category[:50]'
 * - `${string}[:]` // Entire enum (equivalent to just the path)
 * - `${string}[]` // Array split - transforms z.array(T) to z.object({ index: number, value: T })
 * - `${string}{}`; // Record split - transforms z.record(K, V) to z.object({ key: K, value: V })
 */
export const splitSchema = z.union([
  z.string(),
  z.templateLiteral([z.string(), '[', z.number(), ']']),
  z.templateLiteral([z.string(), '[', z.number(), ':', z.number(), ']']),
  z.templateLiteral([z.string(), '[', z.number(), ':', ']']),
  z.templateLiteral([z.string(), '[:', z.number(), ']']),
  z.templateLiteral([z.string(), '[:]']),
  z.templateLiteral([z.string(), '[]']),
  z.templateLiteral([z.string(), '{}']),
]);