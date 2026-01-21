import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { Project, Todo, View } from './types';

/* ---------------------------- Settable atoms ----------------------------- */

// Todos
export const todosAtom = atomWithStorage<Todo[]>('todos', []);

// Projects
export const projectsAtom = atomWithStorage<Record<string, Project>>('projects', {});

// Settings
export const themeAtom = atomWithStorage<'system' | 'light' | 'dark'>('theme', 'system');
export const sortByAtom = atomWithStorage<'created_at' | 'due_date' | 'title'>('sortBy', 'created_at');
export const sortOrderAtom = atomWithStorage<'asc' | 'desc'>('sortOrder', 'desc');
export const showCompletedAtom = atomWithStorage<boolean>('showCompleted', true);

// View
export const viewAtom = atomWithStorage<View>('view', null);

/* ----------------------------- Derived atoms ----------------------------- */

export const filteredTodosAtom = atom((get) => {
  const todos = get(todosAtom);
  const showCompleted = get(showCompletedAtom);
  const sortBy = get(sortByAtom);
  const sortOrder = get(sortOrderAtom);
  const view = get(viewAtom);

  // Filter by completion status (completed_at is null = active)
  let filtered = showCompleted ? todos : todos.filter(t => !t.completed_at);

  // Filter by view (inbox vs project)
  if (view === null) {
    // Inbox
    filtered = filtered.filter(t => !t.project_id);
  } else {
    // Project
    filtered = filtered.filter(t => t.project_id === view);
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
  const visibleTodos = showCompleted ? todos : todos.filter(t => !t.completed_at);
  return visibleTodos.filter(t => !t.project_id).length;
});

export const projectCountsAtom = atom((get) => {
  const todos = get(todosAtom);
  const projects = get(projectsAtom);
  const showCompleted = get(showCompletedAtom);
  const visibleTodos = showCompleted ? todos : todos.filter(t => !t.completed_at);

  return Object.values(projects).map(p => ({
    id: p.id,
    count: visibleTodos.filter(t => t.project_id === p.id).length
  }));
});
