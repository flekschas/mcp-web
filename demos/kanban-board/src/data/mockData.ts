import type { Task, TeamMember, Column, BoardSettings, UserPreferences, Project, ProjectMetadata, ActivityLogEntry, User } from '../types';

// Mock team members
export const mockTeamMembers: TeamMember[] = [
  {
    id: 'user-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    role: 'Product Manager',
  },
  {
    id: 'user-2', 
    name: 'Bob Smith',
    email: 'bob@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    role: 'Frontend Developer',
  },
  {
    id: 'user-3',
    name: 'Carol Davis',
    email: 'carol@example.com', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol',
    role: 'Backend Developer',
  },
  {
    id: 'user-4',
    name: 'David Wilson',
    email: 'david@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    role: 'UI/UX Designer',
  },
  {
    id: 'user-5',
    name: 'Eva Martinez',
    email: 'eva@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eva',
    role: 'QA Engineer',
  }
];

// Mock columns
export const mockColumns: Column[] = [
  { id: 'col-1', title: 'To Do', status: 'todo', position: 0, isVisible: true },
  { id: 'col-2', title: 'In Progress', status: 'in-progress', position: 1, isVisible: true },
  { id: 'col-3', title: 'Review', status: 'review', position: 2, isVisible: true },
  { id: 'col-4', title: 'Done', status: 'done', position: 3, isVisible: true },
];

// Mock tasks
export const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Implement user authentication',
    description: 'Add login/logout functionality with JWT tokens',
    status: 'todo',
    priority: 'high',
    type: 'feature',
    assigneeId: 'user-3',
    dueDate: '2024-02-15T18:00:00Z',
    tags: ['backend', 'security'],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-16T14:30:00Z',
    position: 0,
  },
  {
    id: 'task-2',
    title: 'Design user dashboard wireframes',
    description: 'Create wireframes for the main dashboard layout',
    status: 'todo',
    priority: 'medium',
    type: 'story',
    assigneeId: 'user-4',
    dueDate: '2024-02-10T17:00:00Z',
    tags: ['design', 'ui'],
    createdAt: '2024-01-14T09:15:00Z',
    updatedAt: '2024-01-14T09:15:00Z',
    position: 1,
  },
  {
    id: 'task-3',
    title: 'Fix login page styling issues',
    description: 'Login form is not responsive on mobile devices',
    status: 'in-progress',
    priority: 'urgent',
    type: 'bug',
    assigneeId: 'user-2',
    dueDate: '2024-02-05T12:00:00Z',
    tags: ['frontend', 'css', 'mobile'],
    createdAt: '2024-01-12T16:45:00Z',
    updatedAt: '2024-01-18T11:20:00Z',
    position: 0,
  },
  {
    id: 'task-4',
    title: 'Set up CI/CD pipeline',
    description: 'Configure automated testing and deployment workflow',
    status: 'in-progress',
    priority: 'high',
    type: 'task',
    assigneeId: 'user-3',
    tags: ['devops', 'automation'],
    createdAt: '2024-01-13T08:30:00Z',
    updatedAt: '2024-01-17T15:45:00Z',
    position: 1,
  },
  {
    id: 'task-5',
    title: 'Conduct user research interviews',
    description: 'Schedule and conduct 5 user interviews for feature feedback',
    status: 'review',
    priority: 'medium',
    type: 'story',
    assigneeId: 'user-1',
    dueDate: '2024-02-20T16:00:00Z',
    tags: ['research', 'users'],
    createdAt: '2024-01-10T14:00:00Z',
    updatedAt: '2024-01-19T09:30:00Z',
    position: 0,
  },
  {
    id: 'task-6',
    title: 'Write API documentation',
    description: 'Document all REST endpoints with examples',
    status: 'done',
    priority: 'medium',
    type: 'task',
    assigneeId: 'user-3',
    tags: ['documentation', 'api'],
    createdAt: '2024-01-08T11:00:00Z',
    updatedAt: '2024-01-20T13:15:00Z',
    position: 0,
  },
  {
    id: 'task-7',
    title: 'Implement dark mode toggle',
    description: 'Add dark/light theme switching functionality',
    status: 'done',
    priority: 'low',
    type: 'feature',
    assigneeId: 'user-2',
    tags: ['frontend', 'ui'],
    createdAt: '2024-01-07T13:20:00Z',
    updatedAt: '2024-01-21T10:45:00Z',
    position: 1,
  }
];

// Mock board settings
export const mockBoardSettings: BoardSettings = {
  theme: 'light',
  showAssigneeAvatars: true,
  showDueDates: true,
  showTags: true,
  showTaskTypes: true,
  compactMode: false,
  notificationsEnabled: true,
};

// Mock user preferences
export const mockUserPreferences: UserPreferences = {
  sortBy: 'priority',
  sortOrder: 'desc',
  groupByAssignee: false,
  hiddenColumns: [],
  defaultTaskType: 'task',
  defaultPriority: 'medium',
};

// Mock projects
export const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Project Alpha',
    description: 'A comprehensive project management application with modern features',
    deadline: '2024-03-31T23:59:59Z',
    status: 'active',
    ownerId: 'user-1',
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-01-21T16:30:00Z',
    tasks: mockTasks,
    teamMembers: mockTeamMembers,
    settings: mockBoardSettings,
    preferences: mockUserPreferences,
  },
  {
    id: 'project-2',
    name: 'Mobile App Redesign',
    description: 'Complete redesign of the mobile application with improved UX',
    deadline: '2024-04-15T23:59:59Z',
    status: 'planning',
    ownerId: 'user-4',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    tasks: [],
    teamMembers: [mockTeamMembers[1], mockTeamMembers[3], mockTeamMembers[4]], // Bob, David, Eva
    settings: { ...mockBoardSettings, theme: 'dark' },
    preferences: { ...mockUserPreferences, sortBy: 'dueDate' },
  },
  {
    id: 'project-3', 
    name: 'API Documentation',
    description: 'Comprehensive documentation for all REST API endpoints',
    deadline: '2024-02-28T23:59:59Z',
    status: 'completed',
    ownerId: 'user-3',
    createdAt: '2023-12-01T09:00:00Z',
    updatedAt: '2024-01-25T16:00:00Z',
    tasks: [],
    teamMembers: [mockTeamMembers[2]], // Carol
    settings: mockBoardSettings,
    preferences: { ...mockUserPreferences, defaultTaskType: 'task' },
  }
];

// Mock project metadata (summary view)
export const mockProjectMetadata: ProjectMetadata[] = mockProjects.map(project => ({
  id: project.id,
  name: project.name,
  description: project.description,
  deadline: project.deadline,
  status: project.status,
  ownerId: project.ownerId,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
}));

// Mock activity log
export const mockActivityLog: ActivityLogEntry[] = [
  {
    id: 'activity-1',
    action: 'task_updated',
    description: 'Updated task priority from medium to urgent',
    userId: 'user-2',
    userName: 'Bob Smith',
    timestamp: '2024-01-21T16:30:00Z',
    taskId: 'task-3',
  },
  {
    id: 'activity-2',
    action: 'task_moved',
    description: 'Moved task from To Do to In Progress',
    userId: 'user-3',
    userName: 'Carol Davis',
    timestamp: '2024-01-21T14:15:00Z',
    taskId: 'task-4',
  },
  {
    id: 'activity-3',
    action: 'task_assigned',
    description: 'Assigned task to Eva Martinez',
    userId: 'user-1',
    userName: 'Alice Johnson',
    timestamp: '2024-01-21T11:45:00Z',
    taskId: 'task-8',
  },
  {
    id: 'activity-4',
    action: 'task_created',
    description: 'Created new task: Fix login page styling issues',
    userId: 'user-1',
    userName: 'Alice Johnson',
    timestamp: '2024-01-21T09:30:00Z',
    taskId: 'task-3',
  },
  {
    id: 'activity-5',
    action: 'member_added',
    description: 'Added David Wilson to the project team',
    userId: 'user-1',
    userName: 'Alice Johnson',
    timestamp: '2024-01-20T15:20:00Z',
  }
];

// Mock users with different roles and preferences
export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    role: 'product-manager',
    preferences: mockUserPreferences,
    isActive: true,
  },
  {
    id: 'user-2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    role: 'engineer',
    preferences: { ...mockUserPreferences, sortBy: 'dueDate' },
    isActive: false,
  },
  {
    id: 'user-3',
    name: 'Carol Davis',
    email: 'carol@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol',
    role: 'engineer',
    preferences: { ...mockUserPreferences, sortBy: 'updatedAt' },
    isActive: false,
  },
  {
    id: 'user-4',
    name: 'David Wilson',
    email: 'david@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    role: 'designer',
    preferences: { ...mockUserPreferences, groupByAssignee: true },
    isActive: false,
  },
  {
    id: 'user-5',
    name: 'Eva Martinez',
    email: 'eva@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eva',
    role: 'qa',
    preferences: { ...mockUserPreferences, sortBy: 'priority', sortOrder: 'asc' },
    isActive: false,
  }
];

// Default values
export const defaultBoardTitle = 'Project Board';
export const defaultFilterText = '';
export const defaultViewMode = 'board';
export const defaultSelectedColumn = '';
export const defaultCurrentUser = mockUsers[0];