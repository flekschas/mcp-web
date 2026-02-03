import { TrashIcon } from '@heroicons/react/20/solid';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { projectsAtom, statisticsAtom, todosAtom, viewAtom } from '../states';
import { TodoList } from './TodoList';
import { Statistics } from './Statistics';

export function MainContent() {
  const [view, setView] = useAtom(viewAtom);
  const statistics = useAtomValue(statisticsAtom);
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
    // Switch to inbox
    setView({ type: 'inbox' });
  };

  // Determine title and project based on view type
  const project = view.type === 'project' ? projects[view.id] : null;
  const title = view.type === 'inbox'
    ? 'Inbox'
    : view.type === 'statistics'
      ? 'Statistics'
      : project?.title || 'Project';

  return (
    <div className="flex-1 overflow-auto bg-transparent p-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8 group relative">
        <div className="flex items-center gap-2">
            {project && (
              <div className={`w-8 h-8 rounded-full border-2 border-(--color-text) inset-ring-2 inset-ring-(--color-bg) ${project.pattern}`} />
            )}
            <h2 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">
              {title}
            </h2>
          </div>
          {view.type === 'project' && (
            <button
              type="button"
              onClick={() => deleteProject(view.id)}
              className="inline-flex items-center justify-center p-1.5 text-(--color-text) rounded hover:bg-(--color-border) cursor-pointer select-none opacity-0 group-hover:opacity-30 hover:opacity-100 transition-opacity"
              title="Delete project"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </header>
        {view.type === 'statistics' ? <Statistics {...statistics} /> : <TodoList />}
      </div>
    </div>
  );
}
