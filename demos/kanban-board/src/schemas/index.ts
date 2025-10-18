import { z } from 'zod';

// Enum schemas
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const TaskStatusSchema = z.enum([
  'todo',
  'in-progress',
  'review',
  'done',
]);
export const TaskTypeSchema = z.enum([
  'bug',
  'feature',
  'story',
  'epic',
  'task',
]);
export const ViewModeSchema = z.enum(['board', 'list', 'stats']);
export const ThemeModeSchema = z.enum(['light', 'dark', 'auto']);
export const ProjectStatusSchema = z.enum([
  'planning',
  'active',
  'on-hold',
  'completed',
]);
export const SortBySchema = z.enum([
  'priority',
  'dueDate',
  'createdAt',
  'updatedAt',
  'title',
]);
export const SortOrderSchema = z.enum(['asc', 'desc']);

// Core entity schemas
export const TaskSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
  title: z.string().min(1, 'Task title is required').max(200, 'Title too long'),
  description: z.string().default(''),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  type: TaskTypeSchema,
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  position: z.number().min(0),
});

export const TeamMemberSchema = z.object({
  id: z.string().min(1, 'Member ID is required'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
  avatar: z.string().url('Invalid avatar URL').optional(),
  role: z.string().min(1, 'Role is required'),
});

export const ColumnSchema = z.object({
  id: z.string().min(1, 'Column ID is required'),
  title: z.string().min(1, 'Column title is required'),
  status: TaskStatusSchema,
  position: z.number().min(0),
  isVisible: z.boolean().default(true),
});

export const BoardSettingsSchema = z.object({
  theme: ThemeModeSchema,
  showAssigneeAvatars: z.boolean(),
  showDueDates: z.boolean(),
  showTags: z.boolean(),
  showTaskTypes: z.boolean(),
  compactMode: z.boolean(),
  notificationsEnabled: z.boolean(),
});

export const UserPreferencesSchema = z.object({
  sortBy: SortBySchema,
  sortOrder: SortOrderSchema,
  groupByAssignee: z.boolean(),
  hiddenColumns: z.array(TaskStatusSchema),
  defaultTaskType: TaskTypeSchema,
  defaultPriority: TaskPrioritySchema,
});

export const ProjectMetadataSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
  name: z.string().min(1, 'Project name is required').max(100, 'Name too long'),
  description: z.string().default(''),
  deadline: z.string().datetime().optional(),
  status: ProjectStatusSchema,
  ownerId: z.string().min(1, 'Owner ID is required'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ActivityLogEntrySchema = z.object({
  id: z.string().min(1, 'Activity ID is required'),
  action: z.string().min(1, 'Action is required'),
  description: z.string().min(1, 'Description is required'),
  userId: z.string().min(1, 'User ID is required'),
  userName: z.string().min(1, 'User name is required'),
  timestamp: z.string().datetime(),
  taskId: z.string().optional(),
});

// Array schemas for MCP tools
export const TaskListSchema = z.array(TaskSchema);
export const TeamMembersSchema = z.array(TeamMemberSchema);
export const ColumnsSchema = z.array(ColumnSchema);
export const ActivityLogSchema = z.array(ActivityLogEntrySchema);
export const ProjectMetadataListSchema = z.array(ProjectMetadataSchema);

// Project schema (after array schemas are defined)
export const ProjectSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
  name: z.string().min(1, 'Project name is required').max(100, 'Name too long'),
  description: z.string().default(''),
  deadline: z.string().datetime().optional(),
  status: ProjectStatusSchema,
  ownerId: z.string().min(1, 'Owner ID is required'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tasks: TaskListSchema,
  teamMembers: TeamMembersSchema,
  settings: BoardSettingsSchema,
  preferences: UserPreferencesSchema,
});

export const ProjectListSchema = z.array(ProjectSchema);

// Schema split configurations for complex objects
export const boardSettingsSplitPlan = {
  display: ['theme', 'compactMode'],
  visibility: [
    'showAssigneeAvatars',
    'showDueDates',
    'showTags',
    'showTaskTypes',
  ],
  notifications: ['notificationsEnabled'],
} as const;

export const userPreferencesSplitPlan = {
  sorting: ['sortBy', 'sortOrder'],
  display: ['groupByAssignee', 'hiddenColumns'],
  defaults: ['defaultTaskType', 'defaultPriority'],
} as const;

export const projectMetadataSplitPlan = {
  basic: ['name', 'description', 'status'],
  timeline: ['deadline', 'createdAt', 'updatedAt'],
  ownership: ['ownerId'],
} as const;

// Google Drive integration schemas
export const GoogleDriveDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  createdTime: z.string().datetime(),
  modifiedTime: z.string().datetime(),
  mimeType: z.string(),
  webViewLink: z.string().url(),
});

export const ActionItemSchema = z.object({
  assignee: z.string(),
  task: z.string(),
  dueDate: z.string().datetime().optional(),
  priority: TaskPrioritySchema,
  type: TaskTypeSchema,
  tags: z.array(z.string()),
});

export const ActionItemListSchema = z.array(ActionItemSchema);

export const ImportTasksResultSchema = z.object({
  success: z.boolean(),
  tasksCreated: z.number(),
  taskIds: z.array(z.string()),
  errors: z.array(z.string()).optional(),
});
