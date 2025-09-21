import type { BoardSettings, Task, TeamMember, UserPreferences } from '../types';
import { formatDate, getPriorityColor, getTypeColor, getTypeIcon, isOverdue } from '../utils';

interface TaskCardProps {
  task: Task;
  teamMembers: TeamMember[];
  settings: BoardSettings;
  preferences: UserPreferences;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  onClick: () => void;
}

const TaskCard = ({
  task,
  teamMembers,
  settings,
  preferences: _,
  onDragStart,
  onDragEnd,
  isDragging,
  onClick,
}: TaskCardProps) => {
  const assignee = teamMembers.find(member => member.id === task.assigneeId);

  return (
    // biome-ignore lint/a11y/useSemanticElements: This acts as a grid cell
    <div
      draggable
      tabIndex={0}
      role="gridcell"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onKeyDown={onClick}
      className={`bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 cursor-pointer hover:shadow-md transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-95' : 'hover:-translate-y-1'
      } ${settings.compactMode ? 'p-3' : 'p-4'}`}
    >
      {/* Task header - Type and Priority */}
      <div className="flex items-center justify-between mb-2">
        {settings.showTaskTypes && (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(task.type)}`}>
            <span className="mr-1">{getTypeIcon(task.type)}</span>
            {task.type}
          </span>
        )}

        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
      </div>

      {/* Task title */}
      <h4 className={`font-medium text-zinc-900 dark:text-zinc-100 mb-2 ${settings.compactMode ? 'text-sm' : 'text-base'}`}>
        {task.title}
      </h4>

      {/* Task description */}
      {task.description && !settings.compactMode && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {settings.showTags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, settings.compactMode ? 2 : 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
            >
              #{tag}
            </span>
          ))}
          {task.tags.length > (settings.compactMode ? 2 : 3) && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              +{task.tags.length - (settings.compactMode ? 2 : 3)} more
            </span>
          )}
        </div>
      )}

      {/* Footer - Due date and assignee */}
      <div className="flex items-center justify-between mt-3">
        {/* Due date */}
        {settings.showDueDates && task.dueDate && (
          <span className={`text-xs px-2 py-1 rounded-md ${
            isOverdue(task.dueDate)
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'
          }`}>
            📅 {formatDate(task.dueDate)}
          </span>
        )}

        {/* Assignee avatar */}
        {settings.showAssigneeAvatars && assignee && (
          <div className="flex items-center">
            <img
              src={assignee.avatar}
              alt={assignee.name}
              className={`rounded-full ring-2 ring-white dark:ring-gray-800 ${
                settings.compactMode ? 'w-6 h-6' : 'w-8 h-8'
              }`}
              title={assignee.name}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
