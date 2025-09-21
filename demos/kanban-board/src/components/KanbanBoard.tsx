import { useState } from 'react';
import { mockColumns } from '../data/mockData';
import type { ActivityLogEntry, BoardSettings, Task, TaskStatus, TeamMember, UserPreferences, ViewMode } from '../types';
import KanbanColumn from './KanbanColumn';
import ListView from './ListView';
import StatsView from './StatsView';

interface KanbanBoardProps {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
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

  // Filter tasks based on search text, selected column, and assignee
  const filteredTasks = tasks.filter((task) => {
    const matchesFilter = filterText === '' ||
      task.title.toLowerCase().includes(filterText.toLowerCase()) ||
      task.description.toLowerCase().includes(filterText.toLowerCase()) ||
      task.tags.some(tag => tag.toLowerCase().includes(filterText.toLowerCase()));

    const matchesColumn = selectedColumn === '' || task.status === selectedColumn;
    const matchesAssignee = assigneeFilter === '' || task.assigneeId === assigneeFilter;

    return matchesFilter && matchesColumn && matchesAssignee;
  });

  // Get visible columns based on preferences
  const visibleColumns = mockColumns.filter(column =>
    !preferences.hiddenColumns.includes(column.status)
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
            comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          } else if (a.dueDate) {
            comparison = -1;
          } else if (b.dueDate) {
            comparison = 1;
          }
          break;
        case 'createdAt':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
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

  // Handle drag and drop
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const handleDrop = (targetStatus: TaskStatus, targetPosition?: number) => {
    if (!draggedTask) return;

    const updatedTasks = tasks.map((task) => {
      if (task.id === draggedTask.id) {
        return {
          ...task,
          status: targetStatus,
          updatedAt: new Date().toISOString(),
          position: targetPosition ?? task.position,
        };
      }
      return task;
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
    const columnTasks = filteredTasks.filter(task => task.status === status);
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

  // Default board view
  return (
    <div className="flex-1 overflow-auto">
      <div className="flex space-x-6 pb-6">
        {visibleColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={getTasksForColumn(column.status)}
            teamMembers={teamMembers}
            settings={settings}
            preferences={preferences}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            draggedTask={draggedTask}
            onTaskClick={onTaskClick}
            onCreateTask={onCreateTask}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;
