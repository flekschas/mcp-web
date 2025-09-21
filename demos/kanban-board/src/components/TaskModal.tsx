import type React from 'react';
import { useEffect, useId, useState } from 'react';
import { z } from 'zod';
import { TaskSchema } from '../schemas';
import type { ActivityLogEntry, Task, TaskPriority, TaskStatus, TaskType, TeamMember } from '../types';
import { getTypeIcon } from '../utils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null; // null for new task creation
  teamMembers: TeamMember[];
  onSave: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  defaultStatus?: TaskStatus;
  activityLog: ActivityLogEntry[];
  setActivityLog: (log: ActivityLogEntry[]) => void;
}

const TaskModal = ({
  isOpen,
  onClose,
  task,
  teamMembers,
  onSave,
  onDelete,
  defaultStatus = 'todo',
  activityLog,
  setActivityLog,
}: TaskModalProps) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: defaultStatus,
    priority: 'medium',
    type: 'task',
    assigneeId: '',
    dueDate: '',
    tags: [],
    position: 0,
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (isOpen) {
      if (task) {
        // Edit existing task
        setFormData({
          ...task,
          dueDate: task.dueDate ? task.dueDate.split('T')[0] : '', // Convert to YYYY-MM-DD format
        });
      } else {
        // Create new task
        const now = new Date().toISOString();
        setFormData({
          title: '',
          description: '',
          status: defaultStatus,
          priority: 'medium',
          type: 'task',
          assigneeId: '',
          dueDate: '',
          tags: [],
          createdAt: now,
          updatedAt: now,
          position: 0,
        });
      }
      setTagInput('');
      setErrors({});
    }
  }, [isOpen, task, defaultStatus]);

  const handleInputChange = (field: keyof Task, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !formData.tags?.includes(trimmedTag)) {
      handleInputChange('tags', [...(formData.tags || []), trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleInputChange('tags', (formData.tags || []).filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target === document.querySelector('[data-tag-input]')) {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Create validation data with required fields
    const validationData = {
      ...formData,
      id: task?.id || `task-${Date.now()}`,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
    };

    try {
      TaskSchema.parse(validationData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          newErrors[field] = issue.message;
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const taskData: Task = {
      id: task?.id || `task-${Date.now()}`,
      title: formData.title || '',
      description: formData.description || '',
      status: formData.status as TaskStatus,
      priority: formData.priority as TaskPriority,
      type: formData.type as TaskType,
      assigneeId: formData.assigneeId || undefined,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
      tags: formData.tags || [],
      createdAt: task?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      position: formData.position || 0,
    };

    onSave(taskData);

    // Add to activity log
    const action = task ? 'task_updated' : 'task_created';
    const description = task ? `Updated task: ${taskData.title}` : `Created new task: ${taskData.title}`;

    const newActivity: ActivityLogEntry = {
      id: `activity-${Date.now()}`,
      action,
      description,
      userId: 'current-user',
      userName: 'Current User',
      timestamp: new Date().toISOString(),
      taskId: taskData.id,
    };

    setActivityLog([newActivity, ...activityLog]);
    onClose();
  };

  const handleDelete = () => {
    if (task && onDelete) {
      if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
        onDelete(task.id);

        // Add to activity log
        const newActivity: ActivityLogEntry = {
          id: `activity-${Date.now()}`,
          action: 'task_deleted',
          description: `Deleted task: ${task.title}`,
          userId: 'current-user',
          userName: 'Current User',
          timestamp: new Date().toISOString(),
          taskId: task.id,
        };

        setActivityLog([newActivity, ...activityLog]);
        onClose();
      }
    }
  };

  const titleId = useId();
  const descriptionId = useId();
  const statusId = useId();
  const priorityId = useId();
  const typeId = useId();
  const assigneeId = useId();
  const dueDateId = useId();
  const tagsId = useId();

  if (!isOpen) return null;

  const assignee = teamMembers.find(member => member.id === formData.assigneeId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {task ? 'Edit Task' : 'Create New Task'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <span className="sr-only">Close</span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <title>Close</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor={titleId} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              id={titleId}
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md dark:bg-zinc-700 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500 ${
                errors.title ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600'
              }`}
              placeholder="Enter task title..."
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor={descriptionId} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              id={descriptionId}
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-1 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md dark:bg-zinc-700 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500"
              placeholder="Enter task description..."
            />
          </div>

          {/* Row 1: Status, Priority, Type */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor={statusId} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Status
              </label>
              <select
                id={statusId}
                value={formData.status || 'todo'}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full h-10 px-1 border border-zinc-300 dark:border-zinc-600 rounded-md dark:bg-zinc-700 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label htmlFor={priorityId} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Priority
              </label>
              <select
                id={priorityId}
                value={formData.priority || 'medium'}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full h-10 px-1 border border-zinc-300 dark:border-zinc-600 rounded-md dark:bg-zinc-700 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label htmlFor={typeId} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Type
              </label>
              <select
                id={typeId}
                value={formData.type || 'task'}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full h-10 px-1 border border-zinc-300 dark:border-zinc-600 rounded-md dark:bg-zinc-700 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500"
              >
                <option value="task">{getTypeIcon('task')} Task</option>
                <option value="bug">{getTypeIcon('bug')} Bug</option>
                <option value="feature">{getTypeIcon('feature')} Feature</option>
                <option value="story">{getTypeIcon('story')} Story</option>
                <option value="epic">{getTypeIcon('epic')} Epic</option>
              </select>
            </div>
          </div>

          {/* Row 2: Assignee, Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={assigneeId} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Assignee
              </label>
              <select
                id={assigneeId}
                value={formData.assigneeId || ''}
                onChange={(e) => handleInputChange('assigneeId', e.target.value)}
                className="w-full h-10 px-1 border border-zinc-300 dark:border-zinc-600 rounded-md dark:bg-zinc-700 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} - {member.role}
                  </option>
                ))}
              </select>
              {assignee && (
                <div className="flex items-center mt-2">
                  <img
                    src={assignee.avatar}
                    alt={assignee.name}
                    className="w-6 h-6 rounded-full mr-2"
                  />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {assignee.name}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor={dueDateId} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                id={dueDateId}
                value={formData.dueDate || ''}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                className="w-full h-10 px-1 border border-zinc-300 dark:border-zinc-600 rounded-md dark:bg-zinc-700 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor={tagsId} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(formData.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                data-tag-input
                id={tagsId}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md dark:bg-zinc-700 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500"
                placeholder="Add a tag..."
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-500 transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-between">
          <div>
            {task && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors cursor-pointer"
              >
                Delete Task
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
            >
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
