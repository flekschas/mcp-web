import { id, system } from '@mcp-web/core';
import { z } from 'zod';

export const TodoSchema = z.object({
  // System-generated fields: hidden from AI tool input, auto-populated
  id: id(system(z.string().default(() => crypto.randomUUID()))),
  created_at: system(z.string().default(() => new Date().toISOString())),

  // Required input
  title: z.string().describe('The todo task text'),

  // Optional inputs (nullable with null default, NOT optional())
  description: z.string().nullable().default(null)
    .describe('Optional longer description or notes'),
  completed_at: z.string().nullable().default(null)
    .describe('ISO timestamp when completed, or null if active'),
  due_date: z.string().nullable().default(null)
    .describe('Optional due date in ISO 8601 format'),
  project_id: z.string().nullable().default(null)
    .describe('ID of the project this todo belongs to, or null for inbox'),
}).describe('A todo item with optional project assignment');

export const TodosSchema = z.array(TodoSchema);

export const ProjectSchema = z.object({
  // System-generated ID
  id: id(system(z.string().default(() => crypto.randomUUID()))),
  created_at: system(z.string().default(() => new Date().toISOString())),

  // Required input
  title: z.string().describe('Project name'),

  // Optional inputs
  color: z.string().nullable().default(null)
    .describe('Hex color for project badge, e.g. "#3b82f6"'),
  description: z.string().nullable().default(null)
    .describe('Optional project description'),
}).describe('A project for grouping related todos');

export const ProjectsSchema = z.record(z.string(), ProjectSchema);

export const ThemeSchema = z.enum(['system', 'light', 'dark'])
  .describe('App color theme');

export const SortBySchema = z.enum(['created_at', 'due_date', 'title'])
  .describe('Field to sort todos by');

export const SortOrderSchema = z.enum(['asc', 'desc'])
  .describe('Sort direction');

export const ShowCompletedSchema = z.boolean()
  .describe('Whether to show completed todos');

export const ViewSchema = z.string().nullable().default(null)
  .describe('View type: inbox (null) or project (string -> project ID)');
