import { useState } from 'react';
import type { Project, User } from '../types';
import { mockBoardSettings } from '../data/mockData';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onCreate: (newProject: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const CreateProjectModal = ({
  isOpen,
  onClose,
  currentUser,
  onCreate,
}: CreateProjectModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<Project['status']>('planning');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim() || !description.trim()) return;

    onCreate({
      name: name.trim(),
      description: description.trim(),
      deadline: deadline ? `${deadline}T23:59:59Z` : undefined,
      status,
      ownerId: currentUser.id,
      tasks: [],
      teamMembers: [
        // Add current user as the first team member
        {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          avatar: currentUser.avatar,
          role: currentUser.role.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        }
      ],
      settings: mockBoardSettings,
      preferences: currentUser.preferences,
    });

    // Reset form
    setName('');
    setDescription('');
    setDeadline('');
    setStatus('planning');
    onClose();
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    setDeadline('');
    setStatus('planning');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Create New Project
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <title>Close</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="new-project-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                id="new-project-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500"
                placeholder="Enter project name..."
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="new-project-description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="new-project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500 resize-none"
                placeholder="Enter project description..."
                maxLength={500}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {description.length}/500 characters
              </p>
            </div>

            <div>
              <label htmlFor="new-project-deadline" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Deadline (Optional)
              </label>
              <input
                id="new-project-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="new-project-status" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Initial Status
              </label>
              <select
                id="new-project-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as Project['status'])}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>

          <div className="mt-6 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
            <p className="font-medium mb-1">Project Owner: {currentUser.name}</p>
            <p>You'll be added as the initial team member and can invite others later.</p>
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
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim() || !description.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:text-zinc-300 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;