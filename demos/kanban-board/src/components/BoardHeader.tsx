import { useState } from 'react';
import type {
  BoardSettings,
  ProjectMetadata,
  TeamMember,
  User,
  ViewMode,
} from '../types';

interface BoardHeaderProps {
  title: string;
  projectName: string;
  projectDescription: string;
  filterText: string;
  onFilterChange: (filter: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  teamMembers: TeamMember[];
  settings: BoardSettings;
  assigneeFilter: string;
  onAssigneeFilterChange: (assigneeId: string) => void;
  onCreateTask: () => void;
  projects: ProjectMetadata[];
  currentProjectId: string;
  onProjectSwitch: (projectId: string) => void;
  currentUser: User;
  users: User[];
  onUserSwitch: (userId: string) => void;
  onCreateBoard?: () => void;
  onOpenUserSettings?: () => void;
  onOpenProjectSettings?: () => void;
}

const BoardHeader = ({
  projectName,
  projectDescription,
  filterText,
  onFilterChange,
  viewMode,
  onViewModeChange,
  teamMembers,
  settings,
  assigneeFilter,
  onAssigneeFilterChange,
  onCreateTask,
  projects,
  currentProjectId,
  onProjectSwitch,
  currentUser,
  onCreateBoard,
  onOpenUserSettings,
  onOpenProjectSettings,
}: BoardHeaderProps) => {
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  // Check if user can edit project (admin, product manager, or owner)
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const canEditProject =
    currentUser.role === 'admin' ||
    currentUser.role === 'product-manager' ||
    (currentProject && currentProject.ownerId === currentUser.id);

  return (
    <div className="space-y-3">
      {/* Top Section: Application-level controls */}
      <div className="grid grid-cols-8 px-2">
        {/* Left: Board selector */}
        <div className="flex justify-start items-center col-span-3 gap-x-2">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Nexus</h1>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="p-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Switch project"
              aria-label="Project switcher"
              aria-expanded={isProjectDropdownOpen}
              aria-haspopup="menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Folder</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </button>

            {/* Dropdown menu */}
            {isProjectDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-2 z-50">
                <div className="px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide border-b border-zinc-200 dark:border-zinc-700">
                  Projects
                </div>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      onProjectSwitch(project.id);
                      setIsProjectDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${
                      project.id === currentProjectId
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{project.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        project.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : project.status === 'planning'
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                          : 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    {project.description && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                        {project.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Click outside handler */}
            {isProjectDropdownOpen && (
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsProjectDropdownOpen(false)}
                aria-label="Close project menu"
              />
            )}
          </div>
        </div>

        {/* Center: Add Board button */}
        <div className="flex justify-center items-center col-span-2">
          <button
            type="button"
            onClick={onCreateBoard}
            className="cursor-pointer inline-flex justify-center items-center w-24 py-2 gap-x-2 border border-zinc-300 dark:border-zinc-600 text-sm font-medium rounded-md text-zinc-700 dark:text-zinc-300 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Plus icon</title>
              <path
                d="M12 4v16m8-8H4"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            Project
          </button>
        </div>

        {/* Right: User settings */}
        <div className="flex justify-end items-center col-span-3">
          <button
            type="button"
            onClick={onOpenUserSettings}
            className="relative rounded-full cursor-pointer ring-2 ring-zinc-300 dark:ring-zinc-600 hover:ring-blue-400 transition-all"
            title={`Current user: ${currentUser.name} - ${currentUser.role}`}
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full"
            />
          </button>
        </div>
      </div>

      {/* Middle Section: Board-level controls (keep current styling) */}
      <header className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700">
        <div className="px-6 py-4">
          <div className="grid grid-cols-8 items-center justify-between">
            {/* Left: Board name */}
            <div className="flex justify-start items-center col-span-3">
              <div className="flex flex-col gap-y-1 flex-1">
                <div className="flex items-center gap-x-2 group">
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {projectName}
                  </h1>
                  {canEditProject && onOpenProjectSettings && (
                    <button
                      type="button"
                      onClick={onOpenProjectSettings}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                      title="Edit project settings"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <title>Edit</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  )}
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                  {projectDescription}
                </p>
              </div>
            </div>

            {/* Center: New Task Button */}
            <div className="flex justify-center items-center col-span-2">
              <button
                type="button"
                onClick={onCreateTask}
                className="cursor-pointer inline-flex justify-center items-center w-24 py-2 gap-x-2 text-white dark:text-zinc-900 bg-blue-600 dark:bg-blue-400 text-sm font-medium rounded-md border hover:bg-blue-700 dark:hover:bg-blue-300 transition-color"
              >
                <svg
                  className="w-4 h-4 "
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <title>Plus icon</title>
                  <path
                    d="M12 4v16m8-8H4"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                Task
              </button>
            </div>

            {/* Right: Filters */}
            <div className="flex justify-end items-center col-span-3 space-x-4">
              {/* Search filter */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter tasks..."
                  value={filterText}
                  onChange={(e) => onFilterChange(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-1 focus:outline-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Search</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Team member avatars */}
              {settings.showAssigneeAvatars && (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center -space-x-2">
                    {/* Clear filter button */}
                    {assigneeFilter && (
                      <button
                        type="button"
                        onClick={() => onAssigneeFilterChange('')}
                        className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-600 ring-2 ring-white dark:ring-gray-800 flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-500 transition-all mr-2"
                        title="Clear assignee filter"
                      >
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          ✕
                        </span>
                      </button>
                    )}

                    {teamMembers.slice(0, 5).map((member) => (
                      <button
                        type="button"
                        key={member.id}
                        onClick={() =>
                          onAssigneeFilterChange(
                            assigneeFilter === member.id ? '' : member.id,
                          )
                        }
                        className={`relative hover:z-10 transition-all ${
                          assigneeFilter === member.id ? 'scale-110 z-10' : ''
                        }`}
                        title={`${assigneeFilter === member.id ? 'Clear filter for' : 'Filter by'} ${member.name} - ${member.role}`}
                      >
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className={`w-8 h-8 rounded-full ring-2 bg-white dark:bg-zinc-800 transition-all ${
                            assigneeFilter === member.id
                              ? 'ring-blue-500 shadow-lg'
                              : 'ring-white dark:ring-gray-800 hover:ring-blue-400'
                          }`}
                        />
                        {assigneeFilter === member.id && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-zinc-800" />
                        )}
                      </button>
                    ))}

                    {teamMembers.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-600 ring-2 ring-white dark:ring-gray-800 flex items-center justify-center">
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          +{teamMembers.length - 5}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Section: View controls only */}
      <div className="flex justify-center px-2">
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => onViewModeChange('board')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'board'
                ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Board
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('stats')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'stats'
                ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Stats
          </button>
        </div>
      </div>
    </div>
  );
};

export default BoardHeader;
