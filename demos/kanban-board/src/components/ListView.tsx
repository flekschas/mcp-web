import { useMemo } from 'react';
import type { ActivityLogEntry, BoardSettings, Task, TaskPriority, TaskStatus, TaskType, TeamMember, UserPreferences } from '../types';

const getPriorityColor = (priority: TaskPriority): string => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300';
  }
};

const getStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case 'todo':
      return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300';
    case 'in-progress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'review':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'done':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  }
};

const getTypeIcon = (type: TaskType): string => {
  switch (type) {
    case 'bug':
      return '🐛';
    case 'feature':
      return '✨';
    case 'story':
      return '📖';
    case 'epic':
      return '🎯';
    case 'task':
      return '📋';
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const isOverdue = (dueDate: string): boolean => {
  return new Date(dueDate) < new Date();
};

interface ListViewProps {
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
  onTaskClick: (task: Task) => void;
}

const ListView = ({
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
  onTaskClick,
}: ListViewProps) => {
  const sortedTasks = useMemo(() => {
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

    // Sort tasks based on preferences
    const sortedTasks = [...filteredTasks].sort((a, b) => {
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
      }

      return preferences.sortOrder === 'desc' ? -comparison : comparison;
    });

    return sortedTasks;
  }, [tasks, filterText, selectedColumn, assigneeFilter, preferences]);

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id === taskId) {
        return {
          ...task,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return task;
    });

    setTasks(updatedTasks);

    // Add to activity log
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const newActivity: ActivityLogEntry = {
        id: `activity-${Date.now()}`,
        action: 'task_moved',
        description: `Changed "${task.title}" status to ${newStatus}`,
        userId: 'current-user',
        userName: 'Current User',
        timestamp: new Date().toISOString(),
        taskId: taskId,
      };

      setActivityLog([newActivity, ...activityLog]);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      {/* Table Header */}
      <div className="bg-zinc-50 dark:bg-zinc-700 px-6 py-3 border-b border-zinc-200 dark:border-zinc-600">
        <div className="grid grid-cols-12 gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          <div className="col-span-4">Task</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Priority</div>
          <div className="col-span-2">Assignee</div>
          <div className="col-span-2">Due Date</div>
          <div className="col-span-1">Type</div>
        </div>
      </div>

      {/* Task Rows */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
        {sortedTasks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg">No tasks found</p>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">
              {filterText ? 'Try adjusting your search filter' : 'Create your first task to get started'}
            </p>
          </div>
        ) : (
          sortedTasks.map((task) => {
            const assignee = teamMembers.find(member => member.id === task.assigneeId);

            return (
              // biome-ignore lint/a11y/useSemanticElements: custom list item
              <div
                key={task.id}
                className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                role="listitem"
                onClick={() => { onTaskClick(task); }}
                onKeyDown={() => { onTaskClick(task); }}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Task Title & Description */}
                  <div className="col-span-4">
                    <div className="flex items-start">
                      <span className="mr-2 text-lg">{getTypeIcon(task.type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate mt-1">
                            {task.description}
                          </p>
                        )}
                        {settings.showTags && task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {task.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                              >
                                #{tag}
                              </span>
                            ))}
                            {task.tags.length > 2 && (
                              <span className="text-xs text-zinc-400">+{task.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <select
                      value={task.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStatusChange(task.id, e.target.value as TaskStatus);
                      }}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 focus:outline-1 focus:outline-blue-500 ${getStatusColor(task.status)}`}
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="col-span-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>

                  {/* Assignee */}
                  <div className="col-span-2">
                    {settings.showAssigneeAvatars && assignee ? (
                      <div className="flex items-center">
                        <img
                          src={assignee.avatar}
                          alt={assignee.name}
                          className="w-6 h-6 rounded-full mr-2"
                        />
                        <span className="text-sm text-zinc-900 dark:text-zinc-100 truncate">
                          {assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400 dark:text-zinc-500">
                        Unassigned
                      </span>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="col-span-2">
                    {settings.showDueDates && task.dueDate ? (
                      <span className={`text-xs px-2 py-1 rounded-md ${
                        isOverdue(task.dueDate)
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'
                      }`}>
                        {formatDate(task.dueDate)}
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-400 dark:text-zinc-500">-</span>
                    )}
                  </div>

                  {/* Type */}
                  <div className="col-span-1">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">
                      {task.type}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ListView;
