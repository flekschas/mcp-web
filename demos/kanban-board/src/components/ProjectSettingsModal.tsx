import { useState } from 'react';
import type { Project, User } from '../types';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  currentUser: User;
  onSave: (updatedProject: Partial<Project>) => void;
}

const ProjectSettingsModal = ({
  isOpen,
  onClose,
  project,
  currentUser,
  onSave,
}: ProjectSettingsModalProps) => {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [deadline, setDeadline] = useState(
    project.deadline ? project.deadline.split('T')[0] : '',
  );
  const [status, setStatus] = useState(project.status);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      name,
      description,
      deadline: deadline ? `${deadline}T23:59:59Z` : undefined,
      status,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  const handleCancel = () => {
    setName(project.name);
    setDescription(project.description);
    setDeadline(project.deadline ? project.deadline.split('T')[0] : '');
    setStatus(project.status);
    onClose();
  };

  const isAdmin =
    currentUser.role === 'admin' || currentUser.role === 'product-manager';
  const isOwner = project.ownerId === currentUser.id;
  const canEdit = isAdmin || isOwner;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Project Settings
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Close</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          {!canEdit && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>View Only:</strong> You don't have permission to edit
                this project. Only the project owner or admins can make changes.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="project-name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Project Name
              </label>
              <input
                id="project-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed"
                placeholder="Enter project name..."
              />
            </div>

            <div>
              <label
                htmlFor="project-description"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Description
              </label>
              <textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEdit}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed resize-none"
                placeholder="Enter project description..."
              />
            </div>

            <div>
              <label
                htmlFor="project-deadline"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Deadline (Optional)
              </label>
              <input
                id="project-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label
                htmlFor="project-status"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Status
              </label>
              <select
                id="project-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as Project['status'])}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="mt-6 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
            <p className="font-medium mb-1">
              Project Owner:{' '}
              {project.teamMembers.find((m) => m.id === project.ownerId)
                ?.name || 'Unknown'}
            </p>
            <p>Created: {new Date(project.createdAt).toLocaleDateString()}</p>
            <p>
              Last Updated: {new Date(project.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || !description.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:text-zinc-300 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsModal;
