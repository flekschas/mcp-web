export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskType = 'bug' | 'feature' | 'story' | 'epic' | 'task';
export type ViewMode = 'board' | 'list' | 'stats';
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  assigneeId?: string;
  dueDate?: string; // ISO date string
  tags: string[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  position: number; // for ordering within status
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

export interface Column {
  id: string;
  title: string;
  status: TaskStatus;
  position: number;
  isVisible: boolean;
}

export interface BoardSettings {
  theme: ThemeMode;
  showAssigneeAvatars: boolean;
  showDueDates: boolean;
  showTags: boolean;
  showTaskTypes: boolean;
  compactMode: boolean;
  notificationsEnabled: boolean;
}

export interface UserPreferences {
  sortBy: 'priority' | 'dueDate' | 'createdAt' | 'updatedAt' | 'title';
  sortOrder: 'asc' | 'desc';
  groupByAssignee: boolean;
  hiddenColumns: TaskStatus[];
  defaultTaskType: TaskType;
  defaultPriority: TaskPriority;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  deadline?: string; // ISO date string
  status: 'planning' | 'active' | 'on-hold' | 'completed';
  ownerId: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  tasks: Task[];
  teamMembers: TeamMember[];
  settings: BoardSettings;
  preferences: UserPreferences;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  deadline?: string; // ISO date string
  status: 'planning' | 'active' | 'on-hold' | 'completed';
  ownerId: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  preferences: UserPreferences;
  isActive: boolean;
}

export type UserRole =
  | 'product-manager'
  | 'engineer'
  | 'designer'
  | 'qa'
  | 'admin';

export interface ActivityLogEntry {
  id: string;
  action: string;
  description: string;
  userId: string;
  userName: string;
  timestamp: string; // ISO date string
  taskId?: string;
}
