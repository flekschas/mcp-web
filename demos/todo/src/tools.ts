import { createStateTools, groupState, type StateTriple } from '@mcp-web/core';
import { getDefaultStore, type WritableAtom } from 'jotai';
import type { Store } from 'jotai/vanilla/store';
import type { z } from 'zod';
import {
  ProjectsSchema,
  ShowCompletedSchema,
  SortBySchema,
  SortOrderSchema,
  ThemeSchema,
  TodosSchema,
  ViewSchema,
} from './schemas';
import {
  projectsAtom,
  showCompletedAtom,
  sortByAtom,
  sortOrderAtom,
  themeAtom,
  todosAtom,
  viewAtom,
} from './states';

const store = getDefaultStore();

// Infer types from schemas for type safety
type Todos = z.infer<typeof TodosSchema>;
type Projects = z.infer<typeof ProjectsSchema>;

// Helper to create StateTriple from Jotai atom
function createStateTriple<T>(
  store: Store,
  atom: WritableAtom<T, [T], void>,
  schema: z.ZodType<T>
): StateTriple<T> {
  return [
    () => store.get(atom),
    (v: T) => store.set(atom, v),
    schema
  ];
}

// ============================================================================
// State Tools (created at module level, Jotai-style)
// ============================================================================

/**
 * Todos with expand:true → ID-based CRUD tools
 * Generates: get_todos, add_todos, set_todos, delete_todos
 */
export const todoTools = createStateTools({
  name: 'todos',
  description: 'Todo list - tasks to complete',
  get: () => store.get(todosAtom),
  set: (value: Todos) => store.set(todosAtom, value),
  schema: TodosSchema,
  expand: true,
});

/**
 * Projects with expand:true → ID-based CRUD tools
 * Generates: get_projects, set_projects, delete_projects
 */
export const projectTools = createStateTools({
  name: 'projects',
  description: 'Projects for grouping related todos',
  get: () => store.get(projectsAtom),
  set: (value: Projects) => store.set(projectsAtom, value),
  schema: ProjectsSchema,
  expand: true,
});

/**
 * Settings grouped with groupState
 * Note: Atom names use camelCase (JS convention), tool property names use
 * snake_case (JSON API convention) for better AI readability
 * Generates: get_settings, set_settings
 */
export const settingsTools = createStateTools({
  name: 'settings',
  description: 'App settings for display and sorting',
  ...groupState({
    theme: createStateTriple(store, themeAtom, ThemeSchema),
    sort_by: createStateTriple(store, sortByAtom, SortBySchema),
    sort_order: createStateTriple(store, sortOrderAtom, SortOrderSchema),
    show_completed: createStateTriple(store, showCompletedAtom, ShowCompletedSchema),
    view: createStateTriple(store, viewAtom, ViewSchema),
  }),
});
