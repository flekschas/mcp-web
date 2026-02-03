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
  due_at: z.string().nullable().default(null)
    .describe('Optional due date as an ISO timestamp'),
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
  pattern: z.string().nullable().default(null)
    .describe('CSS pattern class for project badge, e.g. "pattern-dots", "pattern-grid", etc.'),
  description: z.string().nullable().default(null)
    .describe('Optional project description'),
}).describe('A project for grouping related todos');

export const ProjectsSchema = z.record(z.string(), ProjectSchema);

export const ThemeSchema = z.enum(['system', 'light', 'dark'])
  .describe('App color theme');

export const SortBySchema = z.enum(['created_at', 'due_at', 'title'])
  .describe('Field to sort todos by');

export const SortOrderSchema = z.enum(['asc', 'desc'])
  .describe('Sort direction');

export const ShowCompletedSchema = z.boolean()
  .describe('Whether to show completed todos');

export const ViewSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('inbox') }).describe('Inbox view - todos without a project'),
  z.object({ type: z.literal('statistics') }).describe('Statistics view - todo completion analytics'),
  z.object({ type: z.literal('project'), id: z.string().describe('Project ID') }).describe('Project view'),
]).describe('Current view: inbox, statistics, or a specific project');
