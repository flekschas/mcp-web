import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { Project, Todo, View } from './types';
import { type StatisticsProps } from './components/Statistics';

/* ---------------------------- Settable atoms ----------------------------- */

// Todos
export const todosAtom = atomWithStorage<Todo[]>('todos', []);

// Projects
export const projectsAtom = atomWithStorage<Record<string, Project>>('projects', {});

// Settings
export const themeAtom = atomWithStorage<'system' | 'light' | 'dark'>('theme', 'system');
export const sortByAtom = atomWithStorage<'created_at' | 'due_at' | 'title'>('sortBy', 'created_at');
export const sortOrderAtom = atomWithStorage<'asc' | 'desc'>('sortOrder', 'desc');
export const showCompletedAtom = atomWithStorage<boolean>('showCompleted', true);

// View - discriminated union: { type: 'inbox' } | { type: 'statistics' } | { type: 'project', id: string }
export const viewAtom = atomWithStorage<View>('view', { type: 'inbox' });

/* ----------------------------- Derived atoms ----------------------------- */

export const filteredTodosAtom = atom((get) => {
  const todos = get(todosAtom);
  const showCompleted = get(showCompletedAtom);
  const sortBy = get(sortByAtom);
  const sortOrder = get(sortOrderAtom);
  const view = get(viewAtom);

  // Filter by completion status (completed_at is null = active)
  let filtered = showCompleted ? todos : todos.filter((t) => !t.completed_at);

  // Filter by view
  switch (view.type) {
    case 'inbox':
      filtered = filtered.filter((t) => !t.project_id);
      break;
    case 'statistics':
      // Statistics view shows all todos (for the stats calculations)
      filtered = [...todos];
      break;
    case 'project':
      filtered = filtered.filter((t) => t.project_id === view.id);
      break;
  }

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortBy] ?? '';
    const bVal = b[sortBy] ?? '';
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  return sorted;
});

// Count atoms for sidebar badges
export const inboxCountAtom = atom((get) => {
  const todos = get(todosAtom);
  const showCompleted = get(showCompletedAtom);
  const visibleTodos = showCompleted ? todos : todos.filter((t) => !t.completed_at);
  return visibleTodos.filter((t) => !t.project_id).length;
});

export const projectCountsAtom = atom((get) => {
  const todos = get(todosAtom);
  const projects = get(projectsAtom);
  const showCompleted = get(showCompletedAtom);
  const visibleTodos = showCompleted ? todos : todos.filter((t) => !t.completed_at);

  return Object.values(projects).map((p) => ({
    id: p.id,
    count: visibleTodos.filter((t) => t.project_id === p.id).length
  }));
});

export const statisticsAtom = atom((get) => {
  const todos = get(todosAtom);
  const projects = get(projectsAtom);

  const totalTodos = todos.length;
  const completedTodos = todos.filter((t) => t.completed_at).length;
  const activeTodos = totalTodos - completedTodos;
  const completionRate = totalTodos > 0 ? completedTodos / totalTodos : 0;

  // Helper to get project name
  const getProjectName = (projectId: string | null): string =>
    projectId ? projects[projectId]?.title ?? 'Unknown' : 'Inbox';

  // Chart data: completed todos with completion time
  const completedTodosWithTime = todos
    .filter((t) => t.completed_at)
    .map((t) => ({
      id: t.id,
      completionTimeMs: new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime(),
      projectId: t.project_id,
      projectName: getProjectName(t.project_id),
    }));

  // Chart data: completed todos with due date (for due variance chart)
  const completedTodosWithDueDate = todos
    .filter((t) => t.completed_at && t.due_at)
    .map((t) => ({
      id: t.id,
      dueVarianceMs: new Date(t.completed_at!).getTime() - new Date(t.due_at!).getTime(),
      projectId: t.project_id,
      projectName: getProjectName(t.project_id),
    }));

  // Project list for filtering (include Inbox)
  const projectList: Array<{ id: string | null; name: string }> = [
    { id: null, name: 'Inbox' },
    ...Object.values(projects).map((p) => ({ id: p.id, name: p.title })),
  ];

  return {
    totalTodos,
    completedTodos,
    activeTodos,
    completionRate,
    totalProjects: Object.keys(projects).length,
    completedTodosWithTime,
    completedTodosWithDueDate,
    projects: projectList,
  } satisfies StatisticsProps;
});
