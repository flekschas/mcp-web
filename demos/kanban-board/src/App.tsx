import { MCPWeb } from '@mcp-web/web';
import { useTool } from '@mcp-web/web/integrations/react';
import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import BoardHeader from './components/BoardHeader';
import CreateProjectModal from './components/CreateProjectModal';
import KanbanBoard from './components/KanbanBoard';
import ProjectSettingsModal from './components/ProjectSettingsModal';
import TaskModal from './components/TaskModal';
import UserSettingsModal from './components/UserSettingsModal';
import {
  defaultCurrentUser,
  defaultFilterText,
  defaultViewMode,
  mockActivityLog,
  mockProjects,
  mockUsers
} from './data/mockData';
import {
  extractedActionItems,
  mockMeetingNotesDocument,
} from './data/mockGoogleDriveDocument';
import {
  ActionItemListSchema,
  ActivityLogSchema,
  BoardSettingsSchema,
  boardSettingsSplitPlan,
  GoogleDriveDocumentSchema,
  ProjectListSchema,
  ProjectMetadataListSchema,
  ProjectMetadataSchema,
  projectMetadataSplitPlan,
  TaskListSchema,
  TeamMembersSchema,
  UserPreferencesSchema,
  userPreferencesSplitPlan,
  ViewModeSchema
} from './schemas';
import type { ActivityLogEntry, Project, Task, TaskStatus, TeamMember, User, ViewMode } from './types';

// Initialize MCP Web
const mcp = new MCPWeb({
  name: 'Kanban Board Demo',
  description: 'A project management kanban board demonstrating MCP Web integration',
});

// Local storage keys
const STORAGE_KEYS = {
  PROJECTS: 'kanban-projects',
  CURRENT_PROJECT_ID: 'kanban-current-project-id',
  CURRENT_USER_ID: 'kanban-current-user-id',
} as const;

// Local storage utilities
const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const saveToStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage failed, ignore
  }
};

function App() {
  // User state with localStorage persistence
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const storedUserId = loadFromStorage(STORAGE_KEYS.CURRENT_USER_ID, defaultCurrentUser.id);
    const foundUser = mockUsers.find(u => u.id === storedUserId);
    return foundUser || defaultCurrentUser;
  });

  // Project state with localStorage persistence
  const [projects, setProjects] = useState<Project[]>(() =>
    loadFromStorage(STORAGE_KEYS.PROJECTS, mockProjects)
  );
  const [currentProjectId, setCurrentProjectId] = useState<string>(() => {
    const stored = loadFromStorage(STORAGE_KEYS.CURRENT_PROJECT_ID, mockProjects[0].id);
    // Ensure the stored project ID exists in our projects
    const projectExists = mockProjects.some(p => p.id === stored);
    return projectExists ? stored : mockProjects[0].id;
  });

  // Get current project
  const currentProject = projects.find(p => p.id === currentProjectId) || projects[0];

  // Primitive state
  const [boardTitle, setBoardTitle] = useState<string>(currentProject.name);
  const [filterText, setFilterText] = useState<string>(defaultFilterText);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');

  // UI state for modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState<boolean>(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState<boolean>(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState<boolean>(false);

  // Current project data
  const tasks = currentProject.tasks;
  const teamMembers = currentProject.teamMembers;
  const boardSettings = currentProject.settings;
  const userPreferences = currentProject.preferences;
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(mockActivityLog);

  // Persist projects to localStorage whenever they change
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PROJECTS, projects);
  }, [projects]);

  // Persist current project ID to localStorage whenever it changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CURRENT_PROJECT_ID, currentProjectId);
  }, [currentProjectId]);

  // Persist current user ID to localStorage whenever it changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CURRENT_USER_ID, currentUser.id);
  }, [currentUser.id]);

  // Event handlers
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = (defaultStatus?: string) => {
    setSelectedTask(null);
    setSelectedColumn(defaultStatus || '');
    setIsTaskModalOpen(true);
  };

  const handleTaskSave = (task: Task) => {
    setProjects(prevProjects =>
      prevProjects.map(project => {
        if (project.id === currentProjectId) {
          if (selectedTask) {
            // Update existing task
            return {
              ...project,
              tasks: project.tasks.map(t => t.id === task.id ? task : t),
              updatedAt: new Date().toISOString(),
            };
          } else {
            // Add new task
            return {
              ...project,
              tasks: [...project.tasks, task],
              updatedAt: new Date().toISOString(),
            };
          }
        }
        return project;
      })
    );
    setIsTaskModalOpen(false);
    setSelectedTask(null);
    setSelectedColumn(''); // Clear column filter when modal closes
  };

  const handleTaskDelete = (taskId: string) => {
    setProjects(prevProjects =>
      prevProjects.map(project => {
        if (project.id === currentProjectId) {
          return {
            ...project,
            tasks: project.tasks.filter(t => t.id !== taskId),
            updatedAt: new Date().toISOString(),
          };
        }
        return project;
      })
    );
    setIsTaskModalOpen(false);
    setSelectedTask(null);
    setSelectedColumn(''); // Clear column filter when modal closes
  };

  const handleTaskModalClose = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
    setSelectedColumn(''); // Clear column filter when modal closes
  };

  const handleProjectSwitch = (projectId: string) => {
    setCurrentProjectId(projectId);
    const newProject = projects.find(p => p.id === projectId);
    if (newProject) {
      setBoardTitle(newProject.name);
    }
    // Clear filters when switching projects
    setFilterText('');
    setSelectedColumn('');
    setAssigneeFilter('');
  };

  const handleUserSwitch = (userId: string) => {
    const newUser = mockUsers.find(u => u.id === userId);
    if (newUser) {
      setCurrentUser(newUser);
      // Clear filters when switching users for cleaner demo experience
      setFilterText('');
      setAssigneeFilter('');
    }
  };

  const handleThemeChange = useCallback((theme: 'light' | 'dark' | 'auto') => {
    // Store theme preference
    localStorage.setItem('theme', theme);

    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // Auto: check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const handleProjectSave = (updatedProject: Partial<Project>) => {
    setProjects(prevProjects =>
      prevProjects.map(project =>
        project.id === currentProjectId
          ? { ...project, ...updatedProject }
          : project
      )
    );
    if (updatedProject.name) {
      setBoardTitle(updatedProject.name);
    }
  };

  const handleCreateProject = (newProjectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProject: Project = {
      ...newProjectData,
      id: `project-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProjects(prevProjects => [...prevProjects, newProject]);
    setCurrentProjectId(newProject.id);
    setBoardTitle(newProject.name);
  };

  // Initialize theme on app load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' | null;
    if (savedTheme) {
      handleThemeChange(savedTheme);
    } else {
      // Default to auto if no preference is saved
      handleThemeChange('auto');
    }
  }, [handleThemeChange]);

  // Register primitive tools
  useTool({
    mcp,
    name: 'board_title',
    description: 'The title of the kanban board',
    value: boardTitle,
    setValue: setBoardTitle,
    valueSchema: z.string().min(1, 'Board title is required'),
  });

  useTool({
    mcp,
    name: 'filter_text',
    description: 'Text filter for searching tasks',
    value: filterText,
    setValue: setFilterText,
    valueSchema: z.string(),
  });

  useTool({
    mcp,
    name: 'view_mode',
    description: 'Current view mode of the board (board or list)',
    value: viewMode,
    setValue: setViewMode,
    valueSchema: ViewModeSchema,
  });

  useTool({
    mcp,
    name: 'selected_column',
    description: 'Currently selected column ID for filtering',
    value: selectedColumn,
    setValue: setSelectedColumn,
    valueSchema: z.string(),
  });

  useTool({
    mcp,
    name: 'assignee_filter',
    description: 'Currently selected team member ID for filtering tasks by assignee',
    value: assigneeFilter,
    setValue: setAssigneeFilter,
    valueSchema: z.string(),
  });

  // Register project management tools
  useTool({
    mcp,
    name: 'current_project_id',
    description: 'Currently selected project ID',
    value: currentProjectId,
    setValue: setCurrentProjectId,
    valueSchema: z.string().min(1, 'Project ID is required'),
  });

  useTool({
    mcp,
    name: 'project_list',
    description: 'Complete list of all available projects',
    value: projects,
    setValue: setProjects,
    valueSchema: ProjectListSchema,
  });

  useTool({
    mcp,
    name: 'project_metadata_list',
    description: 'List of project metadata for all projects (summary view)',
    value: projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      deadline: project.deadline,
      status: project.status,
      ownerId: project.ownerId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })),
    valueSchema: ProjectMetadataListSchema,
  });

  // Register array tools for current project
  useTool({
    mcp,
    name: 'task_list',
    description: 'Complete list of all tasks in the current project',
    value: tasks,
    setValue: (newTasks: Task[]) => {
      setProjects(prevProjects =>
        prevProjects.map(project => {
          if (project.id === currentProjectId) {
            return {
              ...project,
              tasks: newTasks,
              updatedAt: new Date().toISOString(),
            };
          }
          return project;
        })
      );
    },
    valueSchema: TaskListSchema,
  });

  useTool({
    mcp,
    name: 'team_members',
    description: 'List of all team members working on the current project',
    value: teamMembers,
    setValue: (newMembers: TeamMember[]) => {
      setProjects(prevProjects =>
        prevProjects.map(project => {
          if (project.id === currentProjectId) {
            return {
              ...project,
              teamMembers: newMembers,
              updatedAt: new Date().toISOString(),
            };
          }
          return project;
        })
      );
    },
    valueSchema: TeamMembersSchema,
  });

  useTool({
    mcp,
    name: 'activity_log',
    description: 'Activity log showing recent project changes and updates',
    value: activityLog,
    setValue: setActivityLog,
    valueSchema: ActivityLogSchema,
  });

  // Register project CRUD operations (placeholder - implement as needed)
  useTool({
    mcp,
    name: 'create_project_result',
    description: 'Result of creating a new project',
    value: { success: false, projectId: '', message: 'Use create_project function' },
    valueSchema: z.object({
      success: z.boolean(),
      projectId: z.string(),
      message: z.string().optional(),
    }),
  });

  useTool({
    mcp,
    name: 'switch_project_result',
    description: 'Result of switching projects',
    value: { success: false, currentProject: '', message: 'Use switch_project function' },
    valueSchema: z.object({
      success: z.boolean(),
      currentProject: z.string().optional(),
      message: z.string().optional(),
    }),
  });

  useTool({
    mcp,
    name: 'update_project_result',
    description: 'Result of updating project metadata',
    value: { success: false, projectId: '', projectName: '', message: 'Use update_project function' },
    valueSchema: z.object({
      success: z.boolean(),
      projectId: z.string(),
      projectName: z.string(),
      message: z.string().optional(),
    }),
  });

  // Register statistical analysis tools for AI insights
  useTool({
    mcp,
    name: 'project_statistics',
    description: 'Get comprehensive project statistics including completion rates, task distribution, and performance metrics',
    value: () => {
      const now = new Date();
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'done').length;
      const overdueTasks = tasks.filter(task =>
        task.dueDate && new Date(task.dueDate) < now && task.status !== 'done'
      ).length;

      // Status distribution
      const statusDistribution = {
        todo: tasks.filter(task => task.status === 'todo').length,
        'in-progress': tasks.filter(task => task.status === 'in-progress').length,
        review: tasks.filter(task => task.status === 'review').length,
        done: tasks.filter(task => task.status === 'done').length,
      };

      // Priority distribution
      const priorityDistribution = {
        urgent: tasks.filter(task => task.priority === 'urgent').length,
        high: tasks.filter(task => task.priority === 'high').length,
        medium: tasks.filter(task => task.priority === 'medium').length,
        low: tasks.filter(task => task.priority === 'low').length,
      };

      // Average task age in days
      const avgTaskAge = Math.round(
        tasks.reduce((total, task) => {
          const age = (now.getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          return total + age;
        }, 0) / Math.max(tasks.length, 1)
      );

      return {
        summary: {
          totalTasks,
          completedTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          overdueTasks,
          averageTaskAge: avgTaskAge
        },
        distributions: {
          status: statusDistribution,
          priority: priorityDistribution
        },
        insights: [
          totalTasks === 0 ? "Project has no tasks yet - consider creating initial tasks to get started" : null,
          overdueTasks > 0 ? `${overdueTasks} tasks are overdue and need attention` : null,
          avgTaskAge > 30 ? "Tasks are aging - consider reviewing old tasks for completion or archival" : null,
          statusDistribution.review > statusDistribution['in-progress'] ? "Review bottleneck detected - more tasks in review than in progress" : null
        ].filter(Boolean)
      };
    },
    setValue: () => { },
    valueSchema: z.object({
      summary: z.object({
        totalTasks: z.number(),
        completedTasks: z.number(),
        completionRate: z.number(),
        overdueTasks: z.number(),
        averageTaskAge: z.number()
      }),
      distributions: z.object({
        status: z.object({
          todo: z.number(),
          'in-progress': z.number(),
          review: z.number(),
          done: z.number()
        }),
        priority: z.object({
          urgent: z.number(),
          high: z.number(),
          medium: z.number(),
          low: z.number()
        })
      }),
      insights: z.array(z.string())
    }) as any
  });

  useTool({
    mcp,
    name: 'team_performance_analysis',
    description: 'Analyze individual team member performance including task completion rates, workload balance, and efficiency metrics',
    value: () => {
      const teamStats = teamMembers.map(member => {
        const memberTasks = tasks.filter(task => task.assigneeId === member.id);
        const completedTasks = memberTasks.filter(task => task.status === 'done').length;
        const overdueTasks = memberTasks.filter(task => {
          const now = new Date();
          return task.dueDate && new Date(task.dueDate) < now && task.status !== 'done';
        }).length;

        const completionRate = memberTasks.length > 0 ? Math.round((completedTasks / memberTasks.length) * 100) : 0;

        // Average time to complete (estimated from completed tasks in last 30 days)
        const recentCompletedTasks = memberTasks.filter(task => {
          if (task.status !== 'done') return false;
          const completedDate = new Date(task.updatedAt);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return completedDate >= thirtyDaysAgo;
        });

        const avgCompletionTime = recentCompletedTasks.length > 0
          ? Math.round(recentCompletedTasks.reduce((total, task) => {
            const created = new Date(task.createdAt).getTime();
            const completed = new Date(task.updatedAt).getTime();
            return total + (completed - created) / (1000 * 60 * 60 * 24);
          }, 0) / recentCompletedTasks.length)
          : 0;

        return {
          member: {
            id: member.id,
            name: member.name,
            role: member.role
          },
          metrics: {
            totalTasks: memberTasks.length,
            completedTasks,
            completionRate,
            overdueTasks,
            avgCompletionTimeDays: avgCompletionTime,
            currentWorkload: memberTasks.filter(task => task.status !== 'done').length
          }
        };
      });

      // Add unassigned tasks analysis
      const unassignedTasks = tasks.filter(task => !task.assigneeId);

      return {
        teamStats,
        unassignedTasks: {
          count: unassignedTasks.length,
          breakdown: {
            urgent: unassignedTasks.filter(task => task.priority === 'urgent').length,
            high: unassignedTasks.filter(task => task.priority === 'high').length,
            medium: unassignedTasks.filter(task => task.priority === 'medium').length,
            low: unassignedTasks.filter(task => task.priority === 'low').length,
          }
        },
        insights: [
          unassignedTasks.length > 0 ? `${unassignedTasks.length} tasks need to be assigned to team members` : null,
          teamStats.some(stat => stat.metrics.overdueTasks > 0) ? "Some team members have overdue tasks that need attention" : null,
          teamStats.length > 0 && Math.max(...teamStats.map(s => s.metrics.currentWorkload)) - Math.min(...teamStats.map(s => s.metrics.currentWorkload)) > 5
            ? "Workload imbalance detected - consider redistributing tasks" : null
        ].filter(Boolean)
      };
    },
    setValue: () => { },
    valueSchema: z.object({
      teamStats: z.array(z.object({
        member: z.object({
          id: z.string(),
          name: z.string(),
          role: z.string()
        }),
        metrics: z.object({
          totalTasks: z.number(),
          completedTasks: z.number(),
          completionRate: z.number(),
          overdueTasks: z.number(),
          avgCompletionTimeDays: z.number(),
          currentWorkload: z.number()
        })
      })),
      unassignedTasks: z.object({
        count: z.number(),
        breakdown: z.object({
          urgent: z.number(),
          high: z.number(),
          medium: z.number(),
          low: z.number()
        })
      }),
      insights: z.array(z.string())
    }) as any
  });

  useTool({
    mcp,
    name: 'bottleneck_analysis',
    description: 'Identify workflow bottlenecks and inefficiencies in the task pipeline',
    value: () => {
      const statusCounts = {
        todo: tasks.filter(task => task.status === 'todo').length,
        'in-progress': tasks.filter(task => task.status === 'in-progress').length,
        review: tasks.filter(task => task.status === 'review').length,
        done: tasks.filter(task => task.status === 'done').length,
      };

      // Identify bottlenecks based on task accumulation patterns
      const bottlenecks = [];

      if (statusCounts.review > statusCounts['in-progress'] * 1.5) {
        bottlenecks.push({
          stage: 'review',
          severity: 'high',
          description: 'Tasks are accumulating in review - review process may be slow',
          recommendation: 'Consider adding more reviewers or streamlining review process'
        });
      }

      if (statusCounts['in-progress'] > statusCounts.todo * 2 && statusCounts.todo > 0) {
        bottlenecks.push({
          stage: 'in-progress',
          severity: 'medium',
          description: 'Many tasks in progress relative to backlog',
          recommendation: 'Focus on completing current tasks before starting new ones'
        });
      }

      if (statusCounts.todo > statusCounts['in-progress'] * 3) {
        bottlenecks.push({
          stage: 'todo',
          severity: 'medium',
          description: 'Large backlog of unstarted tasks',
          recommendation: 'Prioritize backlog and increase development velocity'
        });
      }

      // Analyze overdue tasks by status
      const now = new Date();
      const overdueByStatus = Object.keys(statusCounts).reduce((acc, status) => {
        acc[status] = tasks.filter(task =>
          task.status === status &&
          task.dueDate &&
          new Date(task.dueDate) < now
        ).length;
        return acc;
      }, {} as Record<string, number>);

      return {
        statusDistribution: statusCounts,
        bottlenecks,
        overdueByStatus,
        flowEfficiency: {
          todoToProgress: statusCounts['in-progress'] / Math.max(statusCounts.todo, 1),
          progressToReview: statusCounts.review / Math.max(statusCounts['in-progress'], 1),
          reviewToDone: statusCounts.done / Math.max(statusCounts.review, 1)
        },
        recommendations: bottlenecks.length === 0
          ? ["Workflow appears balanced - maintain current pace"]
          : bottlenecks.map(b => b.recommendation)
      };
    },
    setValue: () => { },
    valueSchema: z.object({
      statusDistribution: z.object({
        todo: z.number(),
        'in-progress': z.number(),
        review: z.number(),
        done: z.number()
      }),
      bottlenecks: z.array(z.object({
        stage: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
        description: z.string(),
        recommendation: z.string()
      })),
      overdueByStatus: z.record(z.string(), z.number()),
      flowEfficiency: z.object({
        todoToProgress: z.number(),
        progressToReview: z.number(),
        reviewToDone: z.number()
      }),
      recommendations: z.array(z.string())
    }) as any
  });

  // Keep only the working statistical analysis tools

  // Register object tools with decomposition
  useTool({
    mcp,
    name: 'board_settings',
    description: 'Board display and notification settings',
    value: boardSettings,
    setValue: (newSettings: any) => {
      setProjects(prevProjects =>
        prevProjects.map(project => {
          if (project.id === currentProjectId) {
            return {
              ...project,
              settings: newSettings,
              updatedAt: new Date().toISOString(),
            };
          }
          return project;
        })
      );
    },
    valueSchema: BoardSettingsSchema,
    valueSchemaSplit: boardSettingsSplitPlan as any,
  });

  useTool({
    mcp,
    name: 'user_preferences',
    description: 'User preferences for sorting, display, and defaults',
    value: userPreferences,
    setValue: (newPreferences: any) => {
      setProjects(prevProjects =>
        prevProjects.map(project => {
          if (project.id === currentProjectId) {
            return {
              ...project,
              preferences: newPreferences,
              updatedAt: new Date().toISOString(),
            };
          }
          return project;
        })
      );
    },
    valueSchema: UserPreferencesSchema,
    valueSchemaSplit: userPreferencesSplitPlan as any,
  });

  useTool({
    mcp,
    name: 'current_project_metadata',
    description: 'Current project metadata including name, description, and timeline',
    value: {
      id: currentProject.id,
      name: currentProject.name,
      description: currentProject.description,
      deadline: currentProject.deadline,
      status: currentProject.status,
      ownerId: currentProject.ownerId,
      createdAt: currentProject.createdAt,
      updatedAt: currentProject.updatedAt,
    },
    valueSchema: ProjectMetadataSchema,
    valueSchemaSplit: projectMetadataSplitPlan as any,
  });

  // Multi-MCP Integration Tools (Google Drive simulation)
  useTool({
    mcp,
    name: 'google_drive_meeting_document',
    description: 'Mock Google Drive meeting notes document for demo purposes',
    value: mockMeetingNotesDocument,
    valueSchema: GoogleDriveDocumentSchema,
  });

  useTool({
    mcp,
    name: 'extracted_action_items',
    description: 'Action items extracted from Google Drive meeting notes',
    value: extractedActionItems,
    valueSchema: ActionItemListSchema,
  });

  useTool({
    mcp,
    name: 'import_tasks_result',
    description: 'Result of importing tasks from Google Drive meeting notes',
    value: { success: false, tasksCreated: 0, taskIds: [], message: 'Use import_tasks_from_google_drive action' },
    valueSchema: z.object({
      success: z.boolean(),
      tasksCreated: z.number(),
      taskIds: z.array(z.string()),
      message: z.string().optional(),
    }),
  });

  useTool({
    mcp,
    name: 'google_drive_search_results',
    description: 'Mock search results from Google Drive',
    value: [mockMeetingNotesDocument],
    valueSchema: z.array(GoogleDriveDocumentSchema),
  });

  useTool({
    mcp,
    name: 'multi_mcp_workflow_demo',
    description: 'Demo workflow showing multi-MCP integration: Google Drive + Kanban',
    value: {
      step1: 'Fetch meeting notes from Google Drive',
      step2: 'Extract action items using AI',
      step3: 'Import tasks to kanban board',
      step4: 'Update project timeline from meeting decisions',
      demoDocument: mockMeetingNotesDocument.name,
      actionItemsFound: extractedActionItems.length,
      ready: true
    },
    valueSchema: z.object({
      step1: z.string(),
      step2: z.string(),
      step3: z.string(),
      step4: z.string(),
      demoDocument: z.string(),
      actionItemsFound: z.number(),
      ready: z.boolean(),
    }),
  });

  // Register user-aware MCP tools using useTool with reactive state
  const [currentUserTasks, setCurrentUserTasks] = useState(() => {
    return tasks.filter(task => task.assigneeId === currentUser.id);
  });

  const [userWorkload, setUserWorkload] = useState(() => {
    const userTasks = tasks.filter(task => task.assigneeId === currentUser.id);
    return {
      user: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      },
      totalTasks: userTasks.length,
      activeTasks: userTasks.filter(t => t.status !== 'done').length,
      completedTasks: userTasks.filter(t => t.status === 'done').length,
      overdueTasks: userTasks.filter(t =>
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
      ).length,
      tasksByStatus: {
        todo: userTasks.filter(t => t.status === 'todo').length,
        'in-progress': userTasks.filter(t => t.status === 'in-progress').length,
        review: userTasks.filter(t => t.status === 'review').length,
        done: userTasks.filter(t => t.status === 'done').length,
      },
      tasksByPriority: {
        urgent: userTasks.filter(t => t.priority === 'urgent').length,
        high: userTasks.filter(t => t.priority === 'high').length,
        medium: userTasks.filter(t => t.priority === 'medium').length,
        low: userTasks.filter(t => t.priority === 'low').length,
      }
    };
  });

  const [userPriorityTasks, setUserPriorityTasks] = useState(() => {
    const userTasks = tasks.filter(task => task.assigneeId === currentUser.id);
    return userTasks.filter(task => task.priority === 'urgent' || task.priority === 'high');
  });

  // Update user-specific data when user or tasks change
  useEffect(() => {
    const userTasks = tasks.filter(task => task.assigneeId === currentUser.id);
    setCurrentUserTasks(userTasks);

    setUserWorkload({
      user: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      },
      totalTasks: userTasks.length,
      activeTasks: userTasks.filter(t => t.status !== 'done').length,
      completedTasks: userTasks.filter(t => t.status === 'done').length,
      overdueTasks: userTasks.filter(t =>
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
      ).length,
      tasksByStatus: {
        todo: userTasks.filter(t => t.status === 'todo').length,
        'in-progress': userTasks.filter(t => t.status === 'in-progress').length,
        review: userTasks.filter(t => t.status === 'review').length,
        done: userTasks.filter(t => t.status === 'done').length,
      },
      tasksByPriority: {
        urgent: userTasks.filter(t => t.priority === 'urgent').length,
        high: userTasks.filter(t => t.priority === 'high').length,
        medium: userTasks.filter(t => t.priority === 'medium').length,
        low: userTasks.filter(t => t.priority === 'low').length,
      }
    });

    setUserPriorityTasks(userTasks.filter(task => task.priority === 'urgent' || task.priority === 'high'));
  }, [currentUser, tasks]);

  useTool({
    mcp,
    name: 'current_user_info',
    description: 'Information about the currently logged in user',
    value: {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      isActive: currentUser.isActive,
    },
    setValue: () => {}, // Read-only
    valueSchema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string(),
      isActive: z.boolean(),
    }),
  });

  useTool({
    mcp,
    name: 'current_user_tasks',
    description: 'All tasks assigned to the current user',
    value: currentUserTasks,
    setValue: setCurrentUserTasks,
    valueSchema: TaskListSchema,
  });

  useTool({
    mcp,
    name: 'current_user_workload',
    description: 'Workload summary for the current user including task counts by status and priority',
    value: userWorkload,
    setValue: setUserWorkload,
    valueSchema: z.any(),
  });

  useTool({
    mcp,
    name: 'current_user_priority_tasks',
    description: 'High priority (urgent and high) tasks assigned to the current user',
    value: userPriorityTasks,
    setValue: setUserPriorityTasks,
    valueSchema: TaskListSchema,
  });

  useTool({
    mcp,
    name: 'available_users',
    description: 'List of all users available for demonstration of user switching',
    value: mockUsers.map(u => ({ id: u.id, name: u.name, role: u.role, email: u.email })),
    setValue: () => {}, // Read-only
    valueSchema: z.array(z.object({
      id: z.string(),
      name: z.string(),
      role: z.string(),
      email: z.string(),
    })),
  });

  useEffect(() => {
    const keyDownHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTaskModalOpen(false);
        setIsProjectSettingsOpen(false);
        setIsCreateProjectOpen(false);
        setIsUserSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', keyDownHandler);
    return () => window.removeEventListener('keydown', keyDownHandler);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <BoardHeader
          title={boardTitle}
          projectName={currentProject.name}
          projectDescription={currentProject.description}
          filterText={filterText}
          onFilterChange={setFilterText}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          teamMembers={teamMembers}
          settings={boardSettings}
          assigneeFilter={assigneeFilter}
          onAssigneeFilterChange={setAssigneeFilter}
          onCreateTask={() => handleCreateTask()}
          projects={projects.map(project => ({
            id: project.id,
            name: project.name,
            description: project.description,
            deadline: project.deadline,
            status: project.status,
            ownerId: project.ownerId,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          }))}
          currentProjectId={currentProjectId}
          onProjectSwitch={handleProjectSwitch}
          currentUser={currentUser}
          users={mockUsers}
          onUserSwitch={handleUserSwitch}
          onCreateBoard={() => setIsCreateProjectOpen(true)}
          onOpenUserSettings={() => setIsUserSettingsOpen(true)}
          onOpenProjectSettings={() => setIsProjectSettingsOpen(true)}
        />

        <div className="mt-6">
          <KanbanBoard
            tasks={tasks}
            setTasks={(newTasks: Task[]) => {
              setProjects(prevProjects =>
                prevProjects.map(project => {
                  if (project.id === currentProjectId) {
                    return {
                      ...project,
                      tasks: newTasks,
                      updatedAt: new Date().toISOString(),
                    };
                  }
                  return project;
                })
              );
            }}
            teamMembers={teamMembers}
            settings={boardSettings}
            preferences={userPreferences}
            filterText={filterText}
            selectedColumn={selectedColumn}
            assigneeFilter={assigneeFilter}
            activityLog={activityLog}
            setActivityLog={setActivityLog}
            viewMode={viewMode}
            onTaskClick={handleTaskClick}
            onCreateTask={handleCreateTask}
          />
        </div>

        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={handleTaskModalClose}
          task={selectedTask}
          teamMembers={teamMembers}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
          defaultStatus={(selectedColumn || 'todo') as TaskStatus}
          activityLog={activityLog}
          setActivityLog={setActivityLog}
        />

        <UserSettingsModal
          isOpen={isUserSettingsOpen}
          onClose={() => setIsUserSettingsOpen(false)}
          currentUser={currentUser}
          users={mockUsers}
          onUserSwitch={handleUserSwitch}
          onThemeChange={handleThemeChange}
        />

        <ProjectSettingsModal
          isOpen={isProjectSettingsOpen}
          onClose={() => setIsProjectSettingsOpen(false)}
          project={currentProject}
          currentUser={currentUser}
          onSave={handleProjectSave}
        />

        <CreateProjectModal
          isOpen={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
          currentUser={currentUser}
          onCreate={handleCreateProject}
        />
      </div>
    </div>
  );
}

export default App;
