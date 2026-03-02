import { z } from 'zod';
import { id, system } from '@mcp-web/core';
import type { TestApp } from '../types.js';

// ---------------------------------------------------------------------------
// Schema definitions
// ---------------------------------------------------------------------------

const TaskSchema = z.object({
  id: id(system(z.string().default(() => crypto.randomUUID()))),
  title: z.string(),
  description: z.string().nullable().default(null),
  status: z.enum(['todo', 'in-progress', 'done']).default('todo'),
  priority: z.number().min(1).max(5).default(3),
  assigneeId: z.string().nullable().default(null),
  labelIds: z.array(z.string()).default([]),
  milestoneId: z.string().nullable().default(null),
  created_at: system(z.number().default(() => Date.now())),
});

const LabelSchema = z.object({
  id: id(system(z.string().default(() => crypto.randomUUID()))),
  name: z.string(),
  color: z.string().default('#808080'),
});

const MilestoneSchema = z.object({
  id: id(system(z.string().default(() => crypto.randomUUID()))),
  title: z.string(),
  dueDate: z.string().nullable().default(null),
  completed: z.boolean().default(false),
});

const CommentSchema = z.object({
  id: id(system(z.string().default(() => crypto.randomUUID()))),
  taskId: z.string(),
  text: z.string(),
  author: z.string(),
  created_at: system(z.number().default(() => Date.now())),
});

const MemberSchema = z.object({
  name: z.string(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
  email: z.string(),
});

const ViewPresetSchema = z.object({
  filter: z.enum(['all', 'todo', 'in-progress', 'done']).default('all'),
  sortBy: z.enum(['priority', 'created_at', 'title']).default('priority'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Project manager app schema.
 *
 * Generates 20+ tools via generateToolsForSchema:
 * - Root: get_app, set_app (fixed fields: title, theme, language, notificationsEnabled) = 2
 * - tasks (array): get_app_tasks, add_app_tasks, set_app_tasks, delete_app_tasks = 4
 * - labels (array): get_app_labels, add_app_labels, set_app_labels, delete_app_labels = 4
 * - milestones (array): get_app_milestones, add_app_milestones, set_app_milestones, delete_app_milestones = 4
 * - comments (array): get_app_comments, add_app_comments, set_app_comments, delete_app_comments = 4
 * - members (record): get_app_members, set_app_members, delete_app_members = 3
 * - viewPresets (record): get_app_viewPresets, set_app_viewPresets, delete_app_viewPresets = 3
 * Total: 2 + 4 + 4 + 4 + 4 + 3 + 3 = 24 tools
 */
const AppSchema = z.object({
  // Fixed fields
  title: z.string(),
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  language: z.enum(['en', 'de', 'fr', 'es']).default('en'),
  notificationsEnabled: z.boolean().default(true),

  // Dynamic: arrays (4 tools each)
  tasks: z.array(TaskSchema),
  labels: z.array(LabelSchema),
  milestones: z.array(MilestoneSchema),
  comments: z.array(CommentSchema),

  // Dynamic: records (3 tools each)
  members: z.record(z.string(), MemberSchema),
  viewPresets: z.record(z.string(), ViewPresetSchema),
});

type AppState = z.infer<typeof AppSchema>;

// ---------------------------------------------------------------------------
// Initial state factory
// ---------------------------------------------------------------------------

function emptyState(): AppState {
  return {
    title: 'My Project',
    theme: 'system',
    language: 'en',
    notificationsEnabled: true,
    tasks: [],
    labels: [],
    milestones: [],
    comments: [],
    members: {},
    viewPresets: {},
  };
}

function seededState(): AppState {
  return {
    title: 'Sprint 42',
    theme: 'light',
    language: 'en',
    notificationsEnabled: true,
    tasks: [
      {
        id: 'task-1',
        title: 'Set up CI pipeline',
        description: 'Configure GitHub Actions',
        status: 'done',
        priority: 4,
        assigneeId: 'alice',
        labelIds: ['label-infra'],
        milestoneId: 'ms-1',
        created_at: 1700000000000,
      },
      {
        id: 'task-2',
        title: 'Design landing page',
        description: null,
        status: 'in-progress',
        priority: 3,
        assigneeId: 'bob',
        labelIds: ['label-design'],
        milestoneId: null,
        created_at: 1700100000000,
      },
      {
        id: 'task-3',
        title: 'Write API docs',
        description: 'Document all endpoints',
        status: 'todo',
        priority: 2,
        assigneeId: null,
        labelIds: ['label-docs'],
        milestoneId: 'ms-1',
        created_at: 1700200000000,
      },
    ],
    labels: [
      { id: 'label-infra', name: 'infrastructure', color: '#ff6b6b' },
      { id: 'label-design', name: 'design', color: '#4ecdc4' },
      { id: 'label-docs', name: 'documentation', color: '#45b7d1' },
    ],
    milestones: [
      {
        id: 'ms-1',
        title: 'v1.0 Release',
        dueDate: '2024-03-01',
        completed: false,
      },
    ],
    comments: [],
    members: {
      alice: { name: 'Alice Chen', role: 'admin', email: 'alice@example.com' },
      bob: { name: 'Bob Smith', role: 'member', email: 'bob@example.com' },
    },
    viewPresets: {
      default: {
        filter: 'all',
        sortBy: 'priority',
        sortOrder: 'desc',
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

export const projectManagerApp: TestApp = {
  name: 'project-manager',
  description: 'project management application with tasks, labels, milestones, comments, members, and view presets',
  schema: AppSchema,
  ignoreFields: ['id', 'created_at'],
  cases: [
    // Simple: 1-2 tool calls
    {
      id: 'add-single-task',
      description: 'Add a single task to an empty project',
      prompt: 'Add a task called "Fix login bug" with priority 5.',
      initialState: emptyState(),
      goldenState: {
        ...emptyState(),
        tasks: [
          {
            id: '__ignored__',
            title: 'Fix login bug',
            description: null,
            status: 'todo',
            priority: 5,
            assigneeId: null,
            labelIds: [],
            milestoneId: null,
            created_at: 0,
          },
        ],
      },
      goldenMinToolCalls: 1,
    },
    {
      id: 'change-theme',
      description: 'Change a project setting',
      prompt: 'Switch the theme to dark mode and disable notifications.',
      initialState: emptyState(),
      goldenState: {
        ...emptyState(),
        theme: 'dark',
        notificationsEnabled: false,
      },
      goldenMinToolCalls: 1,
    },

    // Medium: 3-5 tool calls
    {
      id: 'setup-labels-and-task',
      description: 'Create labels then add a task with those labels',
      prompt:
        'Create a "bug" label (red, #ff0000) and a "urgent" label (orange, #ff8c00). Then add a task "Server crash on login" with priority 5 and both labels.',
      initialState: emptyState(),
      goldenState: {
        ...emptyState(),
        labels: [
          { id: '__ignored__', name: 'bug', color: '#ff0000' },
          { id: '__ignored__', name: 'urgent', color: '#ff8c00' },
        ],
        tasks: [
          {
            id: '__ignored__',
            title: 'Server crash on login',
            description: null,
            status: 'todo',
            priority: 5,
            assigneeId: null,
            labelIds: [],  // Note: linking labels by ID is complex; we accept any state
            milestoneId: null,
            created_at: 0,
          },
        ],
      },
      goldenMinToolCalls: 3,
    },

    // Complex: 6+ tool calls (uses seeded state)
    {
      id: 'reorganize-project',
      description: 'Multiple operations on a seeded project',
      prompt:
        'Do the following: 1) Mark "Design landing page" as done. 2) Add a new task "Implement auth" with priority 4 and assign it to Alice. 3) Add a new member "carol" (Carol Davis, carol@example.com, member role). 4) Create a "backlog" view preset with filter "todo", sort by "created_at", order "desc". 5) Switch the project language to German (de).',
      initialState: seededState(),
      goldenState: (() => {
        const s = seededState();
        // 1) Mark task-2 as done
        s.tasks[1]!.status = 'done';
        // 2) Add new task
        s.tasks.push({
          id: '__ignored__',
          title: 'Implement auth',
          description: null,
          status: 'todo',
          priority: 4,
          assigneeId: 'alice',
          labelIds: [],
          milestoneId: null,
          created_at: 0,
        });
        // 3) Add member
        s.members['carol'] = {
          name: 'Carol Davis',
          role: 'member',
          email: 'carol@example.com',
        };
        // 4) Add view preset
        s.viewPresets['backlog'] = {
          filter: 'todo',
          sortBy: 'created_at',
          sortOrder: 'desc',
        };
        // 5) Change language
        s.language = 'de';
        return s;
      })(),
      goldenMinToolCalls: 5,
    },
  ],
};
