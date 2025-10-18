import { useState } from 'react';
import type {
  ActivityLogEntry,
  BoardSettings,
  Column,
  Task,
  TaskStatus,
  TeamMember,
  UserPreferences,
  ViewMode,
} from '../types';
import KanbanColumn from './KanbanColumn';
import ListView from './ListView';
import StatsView from './StatsView';

interface KanbanBoardProps {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  columns: Column[];
  onColumnReorder: (draggedColumnId: string, targetColumnId: string) => void;
  teamMembers: TeamMember[];
  settings: BoardSettings;
  preferences: UserPreferences;
  filterText: string;
  selectedColumn: string;
  assigneeFilter: string;
  activityLog: ActivityLogEntry[];
  setActivityLog: (log: ActivityLogEntry[]) => void;
  viewMode: ViewMode;
  onTaskClick: (task: Task) => void;
  onCreateTask: (defaultStatus?: string) => void;
}

const KanbanBoard = ({
  tasks,
  setTasks,
  columns,
  onColumnReorder,
  teamMembers,
  settings,
  preferences,
  filterText,
  selectedColumn,
  assigneeFilter,
  activityLog,
  setActivityLog,
  viewMode,
  onTaskClick,
  onCreateTask,
}: KanbanBoardProps) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<Column | null>(null);
  const [draggedOverColumnIndex, setDraggedOverColumnIndex] = useState<number | null>(null);

  // Filter tasks based on search text, selected column, and assignee
  const filteredTasks = tasks.filter((task) => {
    const matchesFilter =
      filterText === '' ||
      task.title.toLowerCase().includes(filterText.toLowerCase()) ||
      task.description.toLowerCase().includes(filterText.toLowerCase()) ||
      task.tags.some((tag) =>
        tag.toLowerCase().includes(filterText.toLowerCase()),
      );

    const matchesColumn =
      selectedColumn === '' || task.status === selectedColumn;
    const matchesAssignee =
      assigneeFilter === '' || task.assigneeId === assigneeFilter;

    return matchesFilter && matchesColumn && matchesAssignee;
  });

  // Get visible columns based on preferences
  const visibleColumns = columns.filter(
    (column) => !preferences.hiddenColumns.includes(column.status),
  );

  // Sort tasks within each column based on preferences
  const sortTasks = (columnTasks: Task[]): Task[] => {
    return [...columnTasks].sort((a, b) => {
      let comparison = 0;

      switch (preferences.sortBy) {
        case 'priority': {
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;
        }
        case 'dueDate':
          if (a.dueDate && b.dueDate) {
            comparison =
              new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          } else if (a.dueDate) {
            comparison = -1;
          } else if (b.dueDate) {
            comparison = 1;
          }
          break;
        case 'createdAt':
          comparison =
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison =
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        default:
          comparison = a.position - b.position;
      }

      return preferences.sortOrder === 'desc' ? -comparison : comparison;
    });
  };

  // Handle task drag and drop
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  // Handle column drag and drop
  const handleColumnDragStart = (column: Column) => {
    console.log('Column drag started:', column.title);
    setDraggedColumn(column);
  };

  const handleColumnDragEnd = () => {
    setDraggedColumn(null);
    setDraggedOverColumnIndex(null);
  };

  const handleColumnDrop = (targetColumn: Column) => {
    if (!draggedColumn || draggedColumn.id === targetColumn.id) return;
    onColumnReorder(draggedColumn.id, targetColumn.id);
    setDraggedColumn(null);
    setDraggedOverColumnIndex(null);
  };

  // Column drop zone handlers
  const handleColumnDropZoneDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColumn) {
      console.log('Column drop zone drag over, index:', index);
      setDraggedOverColumnIndex(index);
    }
  };

  const handleColumnDropZoneDragLeave = () => {
    setDraggedOverColumnIndex(null);
  };

  const handleColumnDropZoneDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!draggedColumn) return;

    const draggedIndex = visibleColumns.findIndex(col => col.id === draggedColumn.id);
    let targetIndex = index;

    // If dropping after the dragged column, adjust the target index
    if (index > draggedIndex) {
      targetIndex = Math.min(index - 1, visibleColumns.length - 1);
    }

    if (targetIndex < visibleColumns.length) {
      const targetColumn = visibleColumns[targetIndex];
      onColumnReorder(draggedColumn.id, targetColumn.id);
    } else {
      // Dropping at the end
      const lastColumn = visibleColumns[visibleColumns.length - 1];
      onColumnReorder(draggedColumn.id, lastColumn.id);
    }

    setDraggedColumn(null);
    setDraggedOverColumnIndex(null);
  };

  const handleDrop = (targetStatus: TaskStatus, targetPosition?: number) => {
    if (!draggedTask) return;

    let updatedTasks = [...tasks];
    const draggedTaskIndex = updatedTasks.findIndex(
      (task) => task.id === draggedTask.id,
    );

    if (draggedTaskIndex === -1) return;

    // Remove dragged task from its current position
    const [movedTask] = updatedTasks.splice(draggedTaskIndex, 1);

    // Update task status and timestamp
    const updatedTask = {
      ...movedTask,
      status: targetStatus,
      updatedAt: new Date().toISOString(),
    };

    if (targetPosition !== undefined) {
      // Get tasks in target column (excluding the dragged task)
      const targetColumnTasks = updatedTasks.filter(
        (task) => task.status === targetStatus,
      );

      // Insert at specific position within the target column
      const insertIndex = Math.min(targetPosition, targetColumnTasks.length);

      // Find the actual index in the full tasks array where we should insert
      let actualInsertIndex = 0;
      let targetColumnCount = 0;

      for (let i = 0; i < updatedTasks.length; i++) {
        if (updatedTasks[i].status === targetStatus) {
          if (targetColumnCount === insertIndex) {
            actualInsertIndex = i;
            break;
          }
          targetColumnCount++;
        }
        if (i === updatedTasks.length - 1) {
          actualInsertIndex = updatedTasks.length;
        }
      }

      // Insert task at calculated position
      updatedTasks.splice(actualInsertIndex, 0, updatedTask);
    } else {
      // Append to end if no specific position
      updatedTasks.push(updatedTask);
    }

    // Update position values for all tasks to maintain order
    const positionCounters: Record<TaskStatus, number> = {
      todo: 0,
      'in-progress': 0,
      review: 0,
      done: 0,
    };

    updatedTasks = updatedTasks.map((task) => {
      const newPosition = positionCounters[task.status];
      positionCounters[task.status]++;
      return { ...task, position: newPosition };
    });

    setTasks(updatedTasks);

    // Add to activity log
    const newActivity: ActivityLogEntry = {
      id: `activity-${Date.now()}`,
      action: 'task_moved',
      description: `Moved "${draggedTask.title}" to ${targetStatus}`,
      userId: 'current-user',
      userName: 'Current User',
      timestamp: new Date().toISOString(),
      taskId: draggedTask.id,
    };

    setActivityLog([newActivity, ...activityLog]);
    setDraggedTask(null);
  };

  // Get tasks for a specific column
  const getTasksForColumn = (status: TaskStatus): Task[] => {
    const columnTasks = filteredTasks.filter((task) => task.status === status);
    return sortTasks(columnTasks);
  };

  // Render ListView, StatsView, or Board based on viewMode
  if (viewMode === 'list') {
    return (
      <div className="flex-1 overflow-auto">
        <ListView
          tasks={tasks}
          setTasks={setTasks}
          teamMembers={teamMembers}
          settings={settings}
          preferences={preferences}
          filterText={filterText}
          selectedColumn={selectedColumn}
          assigneeFilter={assigneeFilter}
          activityLog={activityLog}
          setActivityLog={setActivityLog}
          onTaskClick={onTaskClick}
        />
      </div>
    );
  }

  if (viewMode === 'stats') {
    return (
      <div className="flex-1 overflow-auto">
        <StatsView
          tasks={tasks}
          teamMembers={teamMembers}
          settings={settings}
          preferences={preferences}
          filterText={filterText}
          selectedColumn={selectedColumn}
          assigneeFilter={assigneeFilter}
        />
      </div>
    );
  }

  console.log('column:', draggedColumn, 'over:',draggedOverColumnIndex);

  // Default board view
  return (
    <div className="flex-1 overflow-auto">
      <div className="flex pb-6 justify-center-safe">
        {/* Drop zone at the beginning */}
        {draggedColumn && visibleColumns.findIndex((col) => col.id === draggedColumn.id) !== 0 && (
          <div
            className={`relative transition-all duration-200 ease-in-out flex-shrink-0 ${
              draggedOverColumnIndex === 0 ? 'w-24' : 'w-0'
            } has-[.hover-trigger:hover]:w-24`}
          >
            <section
              aria-label="Column drop zone"
              aria-describedby="drop-instructions"
              className="hover-trigger absolute top-0 bottom-0 left-0 right-[-2rem]"
              onDragOver={(e) => handleColumnDropZoneDragOver(e, 0)}
              onDragLeave={handleColumnDropZoneDragLeave}
              onDrop={(e) => handleColumnDropZoneDrop(e, 0)}
            >
              {draggedOverColumnIndex === 0 && (
                <div className="w-24 mr-8 h-full flex justify-center">
                  <div className="drop-instructions m-2 bg-blue-100 dark:bg-blue-900/40 border border-dashed border-blue-400 rounded-lg p-2 text-center text-blue-600 dark:text-blue-400 text-xs font-medium">
                    Move here
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {visibleColumns.map((column, index) => {
          const isLastColumn = index === visibleColumns.length - 1;
          const draggedColumnIndex = draggedColumn ? visibleColumns.findIndex(col => col.id === draggedColumn.id) : -1;
          const shouldShowDropZoneAfter = draggedColumn &&
            (index + 1 !== draggedColumnIndex && index + 1 !== draggedColumnIndex + 1);

          return (
            <div key={column.id} className={`flex ${!shouldShowDropZoneAfter && !isLastColumn && 'mr-4'}`}>
              <KanbanColumn
                column={column}
                tasks={getTasksForColumn(column.status)}
                teamMembers={teamMembers}
                settings={settings}
                preferences={preferences}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                draggedTask={draggedTask}
                onColumnDragStart={handleColumnDragStart}
                onColumnDragEnd={handleColumnDragEnd}
                onColumnDrop={handleColumnDrop}
                draggedColumn={draggedColumn}
                onTaskClick={onTaskClick}
                onCreateTask={onCreateTask}
              />

              {/* Drop zone after each column */}
              {shouldShowDropZoneAfter && !isLastColumn && (
                <div
                  className={`relative transition-all duration-200 ease-in-out flex-shrink-0 ${
                    draggedOverColumnIndex === index + 1 ? 'w-24' : 'w-4'
                  } has-[.hover-trigger:hover]:w-24`}
                >
                  <section
                    aria-label="Column drop zone"
                    aria-describedby="drop-instructions"
                    className="hover-trigger absolute top-0 bottom-0 left-[-2rem] right-[-2rem]"
                    onDragOver={(e) => handleColumnDropZoneDragOver(e, index + 1)}
                    onDragLeave={handleColumnDropZoneDragLeave}
                    onDrop={(e) => handleColumnDropZoneDrop(e, index + 1)}
                  >
                    {draggedOverColumnIndex === index + 1 && (
                      <div className="w-24 mx-8 h-full flex justify-center">
                        <div className="drop-instructions m-2 bg-blue-100 dark:bg-blue-900/40 border border-dashed border-blue-400 rounded-lg p-2 text-center text-blue-600 dark:text-blue-400 text-xs font-medium">
                          Move here
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          );
        })}

        {/* Drop zone after the last column */}
        {draggedColumn && visibleColumns.findIndex((col) => col.id === draggedColumn.id) !== visibleColumns.length - 1 && (
          <div
            className={`relative transition-all duration-200 ease-in-out flex-shrink-0 ${
              draggedOverColumnIndex === visibleColumns.length ? 'w-24' : 'w-0'
            } has-[.hover-trigger:hover]:w-24`}
          >
            <section
              aria-label="Column drop zone"
              aria-describedby="drop-instructions"
              className="hover-trigger absolute top-0 bottom-0 left-[-2rem] right-0"
              onDragOver={(e) => handleColumnDropZoneDragOver(e, visibleColumns.length)}
              onDragLeave={handleColumnDropZoneDragLeave}
              onDrop={(e) => handleColumnDropZoneDrop(e, visibleColumns.length)}
            >
              {draggedOverColumnIndex === visibleColumns.length && (
                <div className="w-24 ml-8 h-full flex justify-center">
                  <div className="drop-instructions bg-blue-100 dark:bg-blue-900/40 border border-dashed border-blue-400 rounded-lg p-2 text-center text-blue-600 dark:text-blue-400 text-xs font-medium">
                    Move here
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanBoard;
