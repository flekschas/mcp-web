import { TrashIcon } from '@heroicons/react/20/solid';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { projectsAtom, todosAtom, viewAtom } from '../states';
import { TodoList } from './TodoList';

export function MainContent() {
  const [view, setView] = useAtom(viewAtom);
  const projects = useAtomValue(projectsAtom);
  const setTodos = useSetAtom(todosAtom);
  const setProjects = useSetAtom(projectsAtom);

  const deleteProject = (projectId: string) => {
    // Move todos from this project to inbox
    setTodos(prev => prev.map(t => t.project_id === projectId ? { ...t, project_id: null } : t));
    // Delete the project
    setProjects(prev => {
      const { [projectId]: _, ...rest } = prev;
      return rest;
    });
    // If this project was selected, switch to inbox
    if (view !== null) {
      setView(null);
    }
  };

  const title = view === null
    ? 'Inbox'
    : (view ? projects[view]?.title : null) || 'Project';

  return (
    <div className="flex-1 overflow-auto bg-transparent p-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8 group relative">
          <h2 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">
            {title}
          </h2>
          {view !== null && (
            <button
              type="button"
              onClick={() => deleteProject(view)}
              className="btn-3d-danger opacity-0 group-hover:opacity-70 transition-opacity"
              title="Delete project"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </header>
        <TodoList />
      </div>
    </div>
  );
}
