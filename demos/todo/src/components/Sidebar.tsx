import { CheckIcon, InboxIcon, PlusCircleIcon, XMarkIcon, ChartBarSquareIcon } from '@heroicons/react/20/solid';
import { useMCPWeb } from '@mcp-web/react';
import { useAtom, useAtomValue } from 'jotai';
import { useState } from 'react';
import { ProjectSchema } from '../schemas';
import { inboxCountAtom, projectCountsAtom, projectsAtom, viewAtom } from '../states';
import { ConfigModal } from './ConfigModal';
import { ProjectForm } from './ProjectForm';
import { ProjectItem } from './ProjectItem';

export function Sidebar() {
  const { mcpWeb, isConnected } = useMCPWeb();
  const [view, setView] = useAtom(viewAtom);
  const [projects, setProjects] = useAtom(projectsAtom);
  const inboxCount = useAtomValue(inboxCountAtom);
  const projectCounts = useAtomValue(projectCountsAtom);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectPattern, setNewProjectPattern] = useState('pattern-dots');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [copyConfigSuccess, setCopyConfigSuccess] = useState(false);

  const connectionStatus = isConnected ? 'connected' : 'disconnected';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;

    if (editingProjectId) {
      // Update existing project
      const existingProject = projects[editingProjectId];
      const updatedProject = {
        ...existingProject,
        title: newProjectTitle.trim(),
        pattern: newProjectPattern,
      };
      setProjects({ ...projects, [editingProjectId]: updatedProject });
    } else {
      // Create new project
      const newProject = ProjectSchema.parse({
        title: newProjectTitle.trim(),
        pattern: newProjectPattern,
      });
      setProjects(prev => ({ ...prev, [newProject.id]: newProject }));
    }

    resetForm();
  };

  const resetForm = () => {
    setShowProjectForm(false);
    setEditingProjectId(null);
    setNewProjectTitle('');
    setNewProjectPattern('pattern-dots');
  };

  const toggleConfigModal = () => {
    setShowConfigModal(!showConfigModal);
    setCopyConfigSuccess(false);
  };

  const copyConfigToClipboard = async () => {
    try {
      const configJson = JSON.stringify(
        { mcpServers: mcpWeb.mcpConfig },
        null,
        2
      );
      await navigator.clipboard.writeText(configJson);
      setCopyConfigSuccess(true);
      setTimeout(() => {
        setCopyConfigSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className="w-64 border-r-2 border-(--color-border) pl-4 pr-4 pb-4 flex flex-col justify-between gap-2">
      <div className="flex flex-col gap-2">
        <div className="h-14 flex items-center justify-between border-b-2 border-(--color-border) mb-2 -ml-4 -mr-4 pl-4 pr-4">
          <h1 className="font-display text-xl font-bold text-(--color-text) tracking-tight">
            Todo App
          </h1>
          <button
            type="button"
            className="flex items-center gap-1 rounded outline-2 outline-current/20 hover:outline-current/60 hover:bg-current/10 px-1.5 py-0.5 cursor-pointer text-xs"
            onClick={toggleConfigModal}
          >
            {connectionStatus === 'connected' && <CheckIcon className="w-4 h-4" />}
            {connectionStatus === 'disconnected' && <XMarkIcon className="w-4 h-4" />}
            MCP
          </button>
        </div>

        {/* Inbox */}
        <button
          type="button"
          onClick={() => setView({ type: 'inbox' })}
          className={`flex items-center justify-between w-full py-1.5 px-2 font-medium text-sm border-2 border-transparent rounded-md cursor-pointer transition-all hover:bg-(--color-border) ${view.type === 'inbox' ? 'bg-(--color-text) text-(--color-bg) border-(--color-text) shadow-[0_2px_0_var(--color-dark)] dark:shadow-[0_2px_0_#000] hover:bg-(--color-text)' : 'text-(--color-text) bg-(--color-accent-subtle)'}`}
        >
          <span className="flex items-center gap-2">
            <InboxIcon className="w-4 h-4" />
            Inbox
          </span>
          <span className={`inline-flex items-center justify-center min-w-6 h-5 px-1.5 text-[0.625rem] font-bold tracking-wider rounded-full ${view.type === 'inbox' ? 'text-(--color-bg) bg-(--color-border-dark)' : 'text-(--color-text) bg-(--color-border)'}`}>
            {inboxCount}
          </span>
        </button>

        {/* Projects */}
        <div className="flex items-center justify-between mt-4 mb-2 mx-2">
          <h2 className="text-xs font-bold text-(--color-text-secondary) uppercase tracking-wider">Projects</h2>
          <button
            type="button"
            onClick={() => {
              setShowProjectForm(!showProjectForm);
              setEditingProjectId(null);
              setNewProjectTitle('');
              setNewProjectPattern('pattern-dots');
            }}
            className="inline-flex items-center justify-center size-9 text-(--color-border) hover:text-(--color-text) border-2 border-transparent rounded-md text-xs font-semibold transition-all cursor-pointer select-none w-6! h-6!"
            title="Add project"
          >
            <PlusCircleIcon className="w-4 h-4" />
          </button>
        </div>

        {showProjectForm && !editingProjectId && (
          <ProjectForm
            title={newProjectTitle}
            pattern={newProjectPattern}
            onTitleChange={setNewProjectTitle}
            onPatternChange={setNewProjectPattern}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            isEditing={false}
          />
        )}

        {Object.values(projects).map(project => {
          const count = projectCounts.find(c => c.id === project.id)?.count || 0;

          if (editingProjectId === project.id) {
            return (
              <ProjectForm
                key={project.id}
                title={newProjectTitle}
                pattern={newProjectPattern}
                onTitleChange={setNewProjectTitle}
                onPatternChange={setNewProjectPattern}
                onSubmit={handleSubmit}
                onCancel={resetForm}
                isEditing={true}
              />
            );
          }

          return (
            <ProjectItem
              key={project.id}
              project={project}
              count={count}
              isActive={view.type === 'project' && view.id === project.id}
              onSelect={() => setView({ type: 'project', id: project.id })}
              onEdit={() => {
                setEditingProjectId(project.id);
                setShowProjectForm(true);
                setNewProjectTitle(project.title);
                setNewProjectPattern(project.pattern || 'pattern-dots');
              }}
            />
          );
        })}

        {/* MCP Configuration Modal */}
        <ConfigModal
          isOpen={showConfigModal}
          onClose={toggleConfigModal}
          mcpConnection={isConnected}
          copyConfigToClipboard={copyConfigToClipboard}
          copyConfigSuccess={copyConfigSuccess}
        />
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setView({ type: 'statistics' })}
          className={`flex items-center justify-between w-full py-1.5 px-2 font-medium text-sm border-2 border-transparent rounded-md cursor-pointer transition-all hover:bg-(--color-border) ${view.type === 'statistics' ? 'bg-(--color-text) text-(--color-bg) border-(--color-text) shadow-[0_2px_0_var(--color-dark)] dark:shadow-[0_2px_0_#000] hover:bg-(--color-text)' : 'text-(--color-text) bg-(--color-accent-subtle)'}`}
        >
          <span className="flex items-center gap-2">
            <ChartBarSquareIcon className="w-4 h-4" />
            Statistics
          </span>
        </button>
      </div>
    </div>
  );
}
