import type React from 'react';
import { useState } from 'react';
import type { BoardSettings, Column, Task, TaskStatus, TeamMember, UserPreferences } from '../types';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  teamMembers: TeamMember[];
  settings: BoardSettings;
  preferences: UserPreferences;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  onDrop: (status: TaskStatus, position?: number) => void;
  draggedTask: Task | null;
  onTaskClick: (task: Task) => void;
  onCreateTask: (defaultStatus: string) => void;
}

const KanbanColumn = ({
  column,
  tasks,
  teamMembers,
  settings,
  preferences,
  onDragStart,
  onDragEnd,
  onDrop,
  draggedTask,
  onTaskClick,
  onCreateTask,
}: KanbanColumnProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== column.status) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (draggedTask) {
      onDrop(column.status);
    }
  };

  const getColumnColor = (status: TaskStatus): string => {
    switch (status) {
      case 'todo':
        return 'border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900';
      case 'in-progress':
        return 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20';
      case 'review':
        return 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20';
      case 'done':
        return 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20';
      default:
        return 'border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900';
    }
  };

  const getHeaderColor = (status: TaskStatus): string => {
    switch (status) {
      case 'todo':
        return 'text-zinc-700 dark:text-zinc-300';
      case 'in-progress':
        return 'text-blue-700 dark:text-blue-300';
      case 'review':
        return 'text-yellow-700 dark:text-yellow-300';
      case 'done':
        return 'text-green-700 dark:text-green-300';
      default:
        return 'text-zinc-700 dark:text-zinc-300';
    }
  };

  return (
    <div className="flex-shrink-0 w-80">
      {/** biome-ignore lint/a11y/useSemanticElements: enough for now */}
      <div
        draggable
        role="columnheader"
        tabIndex={0}
        aria-sort="none"
        aria-label={`Column for ${column.title}`}
        className={`h-full rounded-lg border-2 transition-colors ${
          getColumnColor(column.status)
        } ${isDragOver ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Column Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold text-lg ${getHeaderColor(column.status)}`}>
              {column.title}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => onCreateTask(column.status)}
                className={`w-6 h-6 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-600 flex items-center justify-center transition-colors ${getHeaderColor(column.status)}`}
                title={`Add task to ${column.title}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <title>Add task</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <div className={`flex items-center justify-center text-sm font-medium px-2 py-1 w-6 h-6 rounded-full ${getHeaderColor(column.status)} bg-white dark:bg-zinc-700`}>
                {tasks.length}
              </div>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="p-2 space-y-3 min-h-96 max-h-screen overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm">No tasks yet</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                teamMembers={teamMembers}
                settings={settings}
                preferences={preferences}
                onDragStart={() => onDragStart(task)}
                onDragEnd={onDragEnd}
                isDragging={draggedTask?.id === task.id}
                onClick={() => onTaskClick(task)}
              />
            ))
          )}

          {/* Drop zone indicator */}
          {isDragOver && (
            <div className="border-2 border-dashed border-blue-400 rounded-lg p-4 text-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20">
              <div className="text-2xl mb-1">📥</div>
              <p className="text-sm font-medium">Drop task here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KanbanColumn;
