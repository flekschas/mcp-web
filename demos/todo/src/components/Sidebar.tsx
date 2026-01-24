import { InboxIcon, PencilIcon, PlusCircleIcon } from '@heroicons/react/20/solid';
import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import { MCP_WEB_CONFIG } from '../../mcp-web.config';
import { mcpWeb } from '../mcp';
import { ProjectSchema } from '../schemas';
import { inboxCountAtom, projectCountsAtom, projectsAtom, viewAtom } from '../states';

export function Sidebar() {
  const [view, setView] = useAtom(viewAtom);
  const [projects, setProjects] = useAtom(projectsAtom);
  const inboxCount = useAtomValue(inboxCountAtom);
  const projectCounts = useAtomValue(projectCountsAtom);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#0161AE');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [mcpConnection, setMcpConnection] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [copyConfigSuccess, setCopyConfigSuccess] = useState(false);

  useEffect(() => {
    const initConnection = async () => {
      try {
        await mcpWeb.connect();
        setMcpConnection(mcpWeb.connected);
        setConnectionStatus(mcpWeb.connected ? 'connected' : 'disconnected');
      } catch (error) {
        console.error('Failed to connect to MCP:', error);
        setConnectionStatus('error');
      }
    };

    initConnection();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;

    if (editingProjectId) {
      // Update existing project
      const existingProject = projects[editingProjectId];
      const updatedProject = {
        ...existingProject,
        title: newProjectTitle.trim(),
        color: newProjectColor,
      };
      setProjects({ ...projects, [editingProjectId]: updatedProject });
    } else {
      // Create new project
      const newProject = ProjectSchema.parse({
        title: newProjectTitle.trim(),
        color: newProjectColor,
      });
      setProjects(prev => ({ ...prev, [newProject.id]: newProject }));
    }

    resetForm();
  };

  const resetForm = () => {
    setShowProjectForm(false);
    setEditingProjectId(null);
    setNewProjectTitle('');
    setNewProjectColor('#0161AE');
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
    <div className="w-64 border-r-2 border-(--color-border) pl-4 pr-4 pb-4 flex flex-col gap-2 bg-(--color-bg-elevated)/25">
      <div className="h-14 flex items-center justify-between border-b-2 border-(--color-border) mb-2">
        <h1 className="font-display text-xl font-bold text-(--color-text) tracking-tight">
          Todo App
        </h1>
        <button
          type="button"
          className="flex items-center gap-1 rounded outline outline-current/20 hover:outline-current/60 hover:bg-current/10 px-1.5 py-0.5 cursor-pointer text-xs"
          onClick={toggleConfigModal}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
          />
          MCP
        </button>
      </div>

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
      <div className="flex items-center justify-between mt-4 mb-2 mx-2">
        <h2 className="text-xs font-bold text-(--color-text-secondary) uppercase tracking-wider">Projects</h2>
        <button
          type="button"
          onClick={() => {
            setShowProjectForm(!showProjectForm);
            setEditingProjectId(null);
            setNewProjectTitle('');
            setNewProjectColor('#0161AE');
          }}
          className="btn-subtle btn-subtle-icon w-6! h-6!"
          title="Add project"
        >
          <PlusCircleIcon className="w-4 h-4" />
        </button>
      </div>

      {showProjectForm && (
        <form onSubmit={handleSubmit} className="mb-2 p-3 card-retro">
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
              onClick={resetForm}
              className="btn-3d-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-3d-sm flex-1"
            >
              {editingProjectId ? 'Update' : 'Create'}
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
                    className="w-3 h-3 rounded-full border-2 border-(--color-bg)"
                    style={{ backgroundColor: project.color }}
                  />
                )}
                {project.title}
              </span>
              <span className="flex items-center gap-1">
                {count > 0 && (
                  <span className="badge-retro">
                    {count}
                  </span>
                )}
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 btn-subtle btn-subtle-icon border-2! border-(--color-bg)! w-6! h-6! transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingProjectId(project.id);
                    setShowProjectForm(true);
                    setNewProjectTitle(project.title);
                    setNewProjectColor(project.color || '#0161AE');
                  }}
                  title="Edit project"
                >
                  <PencilIcon className="w-3 h-3" />
                </button>
              </span>
            </button>
          </div>
        );
      })}

      {/* MCP Configuration Modal */}
      {showConfigModal && (
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop
        <div
          className="fixed inset-0 bg-(--color-text)/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={toggleConfigModal}
          onKeyDown={(e) => {
            if (e.key === 'Escape') toggleConfigModal();
          }}
          role="presentation"
        >
          <div
            className="bg-(--color-bg) rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-(--color-border) text-left"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {connectionStatus !== 'connecting' && !mcpConnection && (
                <div className="mb-4 bg-red-900 border border-red-700 p-4 rounded">
                  <h3 className="font-bold text-red-200 mb-2">⚠️ Not Connected</h3>
                  <p className="text-red-300 text-sm">
                    Make sure the MCP-Web bridge is running on {MCP_WEB_CONFIG.host}:{MCP_WEB_CONFIG.wsPort}.
                  </p>
                  <p className="text-red-300 text-sm mt-2">
                    You can use the app locally, but AI queries will not work.
                  </p>
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <h2 id="modal-title" className="text-2xl font-bold text-(--color-text)">MCP Client Configuration</h2>
                <button
                  type="button"
                  onClick={toggleConfigModal}
                  className="text-(--color-text) hover:opacity-80 transition-opacity text-2xl leading-none cursor-pointer"
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <p className="opacity-70">
                  To interact with this app via an AI host app like Claude Desktop, use the following configuration:
                </p>

                <div className="border border-(--color-border) rounded p-4 relative">
                  <button
                    type="button"
                    onClick={copyConfigToClipboard}
                    className="absolute top-2 right-2 px-3 py-1 bg-(--color-accent-subtle) hover:bg-(--color-accent-subtle-hover) text-sm rounded transition-colors cursor-pointer"
                  >
                    {copyConfigSuccess ? '✓ Copied!' : 'Copy'}
                  </button>
                  <pre className="text-sm text-(--color-text) opacity-80 overflow-x-auto pr-20"><code>{JSON.stringify({ mcpServers: mcpWeb.mcpConfig }, null, 2)}</code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
