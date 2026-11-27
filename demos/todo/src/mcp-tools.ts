import {
  createStateTools,
  groupState,
  type StateChange,
  type StateTriple,
  type ToolHandlerContext,
} from '@mcp-web/core';
import { getDefaultStore, type WritableAtom } from 'jotai';
import type { Store } from 'jotai/vanilla';
import type { z } from 'zod';
import {
  ProjectsSchema,
  ShowCompletedSchema,
  SortBySchema,
  SortOrderSchema,
  ThemeSchema,
  TodosSchema,
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

const DELETE_TODOS = 'Delete the todos too';
const MOVE_TODOS = 'Move the todos to the inbox';
const DECLINED = 'The user chose not to delete.';

/**
 * What deleting projects changes besides the projects. `confirmDeletion` sets
 * it and `setProjects` runs it right after storing the projects, so nothing
 * changes if the deletion is rejected.
 */
let afterDeletion: (() => void) | undefined;

function setProjects(value: Projects) {
  store.set(projectsAtom, value);
  afterDeletion?.();
  afterDeletion = undefined;
}

/**
 * Asks the user before projects are deleted, and what to do with their todos.
 */
async function confirmDeletion(
  { prev, next }: StateChange<Projects>,
  { elicit }: ToolHandlerContext,
) {
  // Left over if the last deletion was rejected.
  afterDeletion = undefined;
  const removed = Object.keys(prev).filter((id) => !(id in next));
  if (removed.length === 0) return;

  const belongs = (todo: Todos[number]) =>
    todo.project_id !== null && removed.includes(todo.project_id);
  // Only the todos the user was told about are deleted.
  const counted = new Set(
    store.get(todosAtom).filter(belongs).map((todo) => todo.id),
  );
  const count = counted.size;
  const what =
    removed.length === 1
      ? `the project "${prev[removed[0]].title}"`
      : `${removed.length} projects`;

  let deleteTodos = false;
  if (count === 0) {
    if (!(await elicit(`Delete ${what}?`))) throw new Error(DECLINED);
  } else {
    const answer = await elicit(
      `Delete ${what}? ${count} ${count === 1 ? 'todo belongs' : 'todos belong'} to ${removed.length === 1 ? 'it' : 'them'}.`,
      [DELETE_TODOS, MOVE_TODOS],
    );
    if (!answer) throw new Error(DECLINED);
    deleteTodos = answer === DELETE_TODOS;
  }

  afterDeletion = () => {
    // The todos may have changed while the user answered, so only todos that
    // were counted and still belong are deleted.
    store.set(todosAtom, (todos) =>
      todos
        .filter(
          (todo) => !(deleteTodos && counted.has(todo.id) && belongs(todo)),
        )
        .map((todo) => (belongs(todo) ? { ...todo, project_id: null } : todo)),
    );
    const view = store.get(viewAtom);
    if (view.type === 'project' && removed.includes(view.id)) {
      store.set(viewAtom, { type: 'inbox' });
    }
  };
}

/**
 * Projects with expand:true → ID-based CRUD tools
 * Generates: get_projects, set_projects, delete_projects
 */
export const projectTools = createStateTools({
  name: 'projects',
  description: 'Projects for grouping related todos',
  get: () => store.get(projectsAtom),
  set: setProjects,
  schema: ProjectsSchema,
  expand: true,
  onBeforeChange: confirmDeletion,
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
  }),
});
