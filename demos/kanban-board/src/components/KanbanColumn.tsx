import type React from 'react';
import { useState } from 'react';
import type {
  BoardSettings,
  Column,
  Task,
  TaskStatus,
  TeamMember,
  UserPreferences,
} from '../types';
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
  onColumnDragStart: (column: Column) => void;
  onColumnDragEnd: () => void;
  onColumnDrop: (column: Column) => void;
  draggedColumn: Column | null;
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
  onColumnDragStart,
  onColumnDragEnd,
  onColumnDrop,
  draggedColumn,
  onTaskClick,
  onCreateTask,
}: KanbanColumnProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedTask) {
      setIsDragOver(true);
    }
  };

  // Handle drop zone hover for task positioning
  const handleTaskDropZoneDragOver = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedTask) {
      setDragOverPosition(position);
    }
  };

  const handleTaskDropZoneDragLeave = () => {
    setDragOverPosition(null);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're actually leaving the column
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    // Check if we're leaving the column boundaries
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
      setDragOverPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragOverPosition(null);

    if (draggedTask) {
      // Use the specific position if we have one, otherwise append to end
      const targetPosition =
        dragOverPosition !== null ? dragOverPosition : tasks.length;
      onDrop(column.status, targetPosition);
    }
    if (draggedColumn) {
      onColumnDrop(column);
    }
  };

  // Handle drop on specific position
  const handleTaskDropZoneDrop = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragOverPosition(null);

    if (draggedTask) {
      onDrop(column.status, position);
    }
  };

  // Column drag handlers
  const handleColumnDragStart = (e: React.DragEvent) => {
    // Prevent column drag when dragging from task area or buttons
    const target = e.target as HTMLElement;
    console.log(
      'Column drag start attempted, target:',
      target.tagName,
      target.className,
    );
    if (
      target.closest('[data-task-card]') ||
      target.closest('.task-area') ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'SVG' ||
      target.tagName === 'PATH'
    ) {
      console.log('Column drag prevented - dragging from task area or button');
      e.preventDefault();
      return;
    }
    console.log('Column drag started for:', column.title);
    onColumnDragStart(column);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Required for some browsers
  };

  const handleColumnDragEnd = () => {
    onColumnDragEnd();
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
        role="columnheader"
        tabIndex={0}
        aria-label={`Column for ${column.title}`}
        className={`h-full rounded-lg transition-all duration-200 ease-in-out cursor-grab active:cursor-grabbing bg-white/50 dark:bg-zinc-900 backdrop-blur-sm ${
          draggedColumn?.id === column.id ? 'opacity-50' : ''
        }`}
        draggable
        onDragStart={handleColumnDragStart}
        onDragEnd={handleColumnDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={`h-full rounded-lg border-2 ${getColumnColor(column.status)}`}>
          {/* Column Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
            <div className="w-full flex items-center justify-between">
              <h3
                className={`font-semibold text-lg ${getHeaderColor(column.status)} select-none`}
              >
                {column.title}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTask(column.status);
                  }}
                  className={`w-6 h-6 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-600 flex items-center justify-center transition-colors ${getHeaderColor(column.status)} cursor-pointer`}
                  title={`Add task to ${column.title}`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Add task</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
                <div
                  className={`flex items-center justify-center text-sm font-medium px-2 py-1 w-6 h-6 rounded-full ${getHeaderColor(column.status)} bg-white dark:bg-zinc-700 select-none`}
                >
                  {tasks.length}
                </div>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="task-area p-2 space-y-3 min-h-96 max-h-screen overflow-y-auto">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-sm">No tasks yet</p>
              </div>
            ) : (
              <>
                {/* Drop zone at the beginning */}
                <button
                  type="button"
                  aria-label="Drop task here"
                  className={`h-2 w-full rounded transition-all border-none bg-transparent ${
                    dragOverPosition === 0
                      ? 'bg-blue-200 dark:bg-blue-800 border-2 border-dashed border-blue-400'
                      : ''
                  }`}
                  onDragOver={(e) => handleTaskDropZoneDragOver(e, 0)}
                  onDragLeave={handleTaskDropZoneDragLeave}
                  onDrop={(e) => handleTaskDropZoneDrop(e, 0)}
                />

                {tasks.map((task, index) => (
                  <div key={task.id}>
                    <div data-task-card>
                      <TaskCard
                        task={task}
                        teamMembers={teamMembers}
                        settings={settings}
                        preferences={preferences}
                        onDragStart={() => onDragStart(task)}
                        onDragEnd={onDragEnd}
                        isDragging={draggedTask?.id === task.id}
                        onClick={() => onTaskClick(task)}
                      />
                    </div>

                    {/* Drop zone after each task */}
                    <button
                      type="button"
                      aria-label="Drop task here"
                      className={`h-2 w-full rounded transition-all border-none bg-transparent ${
                        dragOverPosition === index + 1
                          ? 'bg-blue-200 dark:bg-blue-800 border-2 border-dashed border-blue-400'
                          : ''
                      }`}
                      onDragOver={(e) => handleTaskDropZoneDragOver(e, index + 1)}
                      onDragLeave={handleTaskDropZoneDragLeave}
                      onDrop={(e) => handleTaskDropZoneDrop(e, index + 1)}
                    />
                  </div>
                ))}
              </>
            )}

            {/* Drop zone indicator for tasks */}
            {isDragOver && (
              <div className="border-2 border-dashed border-blue-400 rounded-lg p-4 text-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20">
                <div className="text-2xl mb-1">📥</div>
                <p className="text-sm font-medium">Drop task here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KanbanColumn;
