import { InboxIcon, PlusCircleIcon } from '@heroicons/react/20/solid';
import { useAtom, useAtomValue } from 'jotai';
import { useState } from 'react';
import { ProjectSchema } from '../schemas';
import { inboxCountAtom, projectCountsAtom, projectsAtom, viewAtom } from '../states';

export function Sidebar() {
  const [view, setView] = useAtom(viewAtom);
  const [projects, setProjects] = useAtom(projectsAtom);
  const inboxCount = useAtomValue(inboxCountAtom);
  const projectCounts = useAtomValue(projectCountsAtom);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#0161AE');

  const createProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;

    const newProject = ProjectSchema.parse({
      title: newProjectTitle.trim(),
      color: newProjectColor,
    });

    setProjects(prev => ({ ...prev, [newProject.id]: newProject }));
    setNewProjectTitle('');
    setNewProjectColor('#0161AE');
    setShowCreateForm(false);
  };

  return (
    <div className="w-64 border-r-2 border-(--color-border) pl-4 pr-4 pb-4 flex flex-col gap-2 bg-(--color-bg-elevated)/25">
      <h1 className="font-display text-xl font-bold text-(--color-text) mb-2 h-14 flex items-center border-b-2 border-(--color-border) tracking-tight">
        Todo App
      </h1>

      {/* Inbox */}
      <button
        type="button"
        onClick={() => setView(null)}
        className={`sidebar-item ${view === null ? 'sidebar-item-active' : ''}`}
      >
        <span className="flex items-center gap-2">
          <InboxIcon className="w-4 h-4" />
          Inbox
        </span>
        {inboxCount > 0 && (
          <span className="badge-retro">
            {inboxCount}
          </span>
        )}
      </button>

      {/* Projects */}
      <div className="flex items-center justify-between mt-4 mb-2">
        <h2 className="text-xs font-bold text-(--color-text-secondary) uppercase tracking-wider">Projects</h2>
        <button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-3d-icon w-6! h-6! border-0! shadow-none!"
          title="Add project"
        >
          <PlusCircleIcon className="w-4 h-4" />
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={createProject} className="mb-2 p-3 card-retro">
          <input
            type="text"
            value={newProjectTitle}
            onChange={(e) => setNewProjectTitle(e.target.value)}
            placeholder="Project name"
            className="input-retro mb-3 py-2!"
          />
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={newProjectColor}
              onChange={(e) => setNewProjectColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-2 border-(--color-border)"
            />
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="btn-3d-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-3d-sm flex-1"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {Object.values(projects).map(project => {
        const count = projectCounts.find(c => c.id === project.id)?.count || 0;
        return (
          <div key={project.id} className="group relative">
            <button
              type="button"
              onClick={() => setView(project.id)}
              className={`sidebar-item ${view === project.id ? 'sidebar-item-active' : ''}`}
            >
              <span className="flex items-center gap-2">
                {project.color && (
                  <span
                    className="w-3 h-3 rounded-full border-2 border-current"
                    style={{ backgroundColor: project.color }}
                  />
                )}
                {project.title}
              </span>
              {count > 0 && (
                <span className="badge-retro">
                  {count}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
