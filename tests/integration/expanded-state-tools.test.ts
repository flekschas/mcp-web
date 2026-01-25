import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCPWebClient, type MCPWebClientConfig, type TextContent } from '@mcp-web/client';
import { id, MCPWeb, system } from '@mcp-web/core';
import type { MCPWebConfig } from '@mcp-web/types';
import { z } from 'zod';
import { killProcess } from '../helpers/kill-process';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

// Single port for both WebSocket and HTTP (new architecture)
const BRIDGE_PORT = 3011; // Different port to avoid conflicts with other tests
const authToken = 'test-auth-token-expanded-tools';

const mcpWebConfig = {
  name: 'test-expanded-tools',
  description: 'Test expanded state tools',
  bridgeUrl: `localhost:${BRIDGE_PORT}`,
  persistAuthToken: false,
  autoConnect: false,
  authToken,
} satisfies MCPWebConfig;

const mcpWebClientConfig: MCPWebClientConfig = {
  serverUrl: `http://${mcpWebConfig.bridgeUrl}`,
  authToken,
};

// ============================================================================
// Schemas
// ============================================================================

const TodoSchema = z.object({
  id: id(system(z.string().default(() => crypto.randomUUID()))),
  projectId: z.string().nullable().default(null),
  value: z.string(),
  created_at: system(z.number().default(() => Date.now())),
  updated_at: system(z.number().default(() => Date.now())),
  completed_at: z.number().nullable().default(null),
  priority: z.number().min(1).max(5).default(3),
  tags: z.array(z.string()).default([]),
});

const ProjectSchema = z.object({
  id: id(system(z.string().default(() => crypto.randomUUID()))),
  title: z.string(),
  description: z.string().nullable().default(null),
  color: z.string().nullable().default(null),
  created_at: system(z.number().default(() => Date.now())),
  updated_at: system(z.number().default(() => Date.now())),
});

const AppSchema = z.object({
  todos: z.array(TodoSchema),
  projects: z.record(z.string(), ProjectSchema),
  sortBy: z.enum(['created_at', 'completed_at', 'priority']),
  sortOrder: z.enum(['asc', 'desc']),
  showCompleted: z.boolean(),
  theme: z.enum(['system', 'light', 'dark']),
});

type App = z.infer<typeof AppSchema>;
type Todo = z.infer<typeof TodoSchema>;
type Project = z.infer<typeof ProjectSchema>;

// ============================================================================
// Test Setup
// ============================================================================

let bridgeProcess: ReturnType<typeof spawn>;
let mcpWeb: MCPWeb;
let client: MCPWebClient;
let sessionId: string;
let state: App;

// Start bridge as separate process using Bun
const spawnBridge = () =>
  spawn('bun', ['run', join(__dirname, '../helpers/start-bridge.ts')], {
    env: {
      ...process.env,
      PORT: BRIDGE_PORT.toString(),
    },
    stdio: ['ignore', 'ignore', 'pipe'],
    detached: false,
  });

beforeAll(async () => {
  bridgeProcess = spawnBridge();

  // Wait for bridge to be ready
  await new Promise<void>((resolve) => {
    bridgeProcess?.stderr?.on('data', (data) => {
      if (data.toString().includes('[Bridge] Ready')) {
        resolve();
      }
    });
  });

  state = {
    todos: [],
    projects: {},
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  };

  mcpWeb = new MCPWeb({
    ...mcpWebConfig,
    autoConnect: false,
  });

  mcpWeb.addStateTools({
    name: 'app',
    description: 'Todo app',
    get: () => state,
    set: (value) => {
      Object.assign(state, value);
    },
    schema: AppSchema,
    expand: true,
  });

  await mcpWeb.connect();

  sessionId = mcpWeb.sessionId;

  client = new MCPWebClient(mcpWebClientConfig);
});

afterAll(async () => {
  if (mcpWeb) {
    mcpWeb.disconnect();
  }
  if (bridgeProcess) {
    await killProcess(bridgeProcess);
  }
});

afterEach(() => {
  // Reset state after each test
  state.todos = [];
  state.projects = {};
  state.sortBy = 'created_at';
  state.sortOrder = 'asc';
  state.showCompleted = true;
  state.theme = 'system';
});

// Helper to parse tool result
function parseResult<T>(result: { content: Array<{ type: string; text?: string }> }): T {
  const textContent = result.content[0] as TextContent;
  return JSON.parse(textContent.text) as T;
}

// ============================================================================
// Tool Discovery Tests
// ============================================================================

test('listTools returns all 9 expected expanded tools', async () => {
  const toolsResult = await client.listTools(sessionId);
  const toolNames = toolsResult.tools.map((t) => t.name);

  // Should have list_sessions + 9 expanded tools = 10 total
  expect(toolsResult.tools.length).toBe(10);

  // Root tools
  expect(toolNames).toContain('get_app');
  expect(toolNames).toContain('set_app');

  // Todos array tools (ID-based due to id() marker)
  expect(toolNames).toContain('get_app_todos');
  expect(toolNames).toContain('add_app_todos');
  expect(toolNames).toContain('set_app_todos');
  expect(toolNames).toContain('delete_app_todos');

  // Projects record tools
  expect(toolNames).toContain('get_app_projects');
  expect(toolNames).toContain('set_app_projects');
  expect(toolNames).toContain('delete_app_projects');
});

// ============================================================================
// Root Tool Tests (get_app, set_app)
// ============================================================================

test('get_app returns full state including collections', async () => {
  // Add some data first
  state.todos.push({
    id: 'todo-1',
    value: 'Test todo',
    priority: 3,
    projectId: null,
    created_at: 123456,
    updated_at: 123456,
    completed_at: null,
    tags: [],
  });
  state.projects.work = {
    id: 'proj-1',
    title: 'Work',
    description: null,
    color: null,
    created_at: 123456,
    updated_at: 123456,
  };

  const result = await client.callTool('get_app', {}, sessionId);
  const appState = parseResult<App>(result);

  expect(appState.todos).toHaveLength(1);
  expect(appState.todos[0].value).toBe('Test todo');
  expect(Object.keys(appState.projects)).toHaveLength(1);
  expect(appState.projects.work.title).toBe('Work');
  expect(appState.sortBy).toBe('created_at');
  expect(appState.theme).toBe('system');
});

test('get_app with excludeCollections returns only settings', async () => {
  // Add some data
  state.todos.push({
    id: 'todo-1',
    value: 'Test todo',
    priority: 3,
    projectId: null,
    created_at: 123456,
    updated_at: 123456,
    completed_at: null,
    tags: [],
  });

  const result = await client.callTool('get_app', { excludeCollections: true }, sessionId);
  const settings = parseResult<Record<string, unknown>>(result);

  expect(settings.sortBy).toBe('created_at');
  expect(settings.sortOrder).toBe('asc');
  expect(settings.showCompleted).toBe(true);
  expect(settings.theme).toBe('system');
  expect(settings.todos).toBeUndefined();
  expect(settings.projects).toBeUndefined();
});

test('set_app updates only provided fixed props', async () => {
  const result = await client.callTool(
    'set_app',
    {
      theme: 'dark',
      showCompleted: false,
    },
    sessionId
  );

  const response = parseResult<{ success: boolean; value: Record<string, unknown> }>(result);
  expect(response.success).toBe(true);

  // Verify state was updated
  expect(state.theme).toBe('dark');
  expect(state.showCompleted).toBe(false);
  // Other props unchanged
  expect(state.sortBy).toBe('created_at');
  expect(state.sortOrder).toBe('asc');
});

test('set_app preserves collections', async () => {
  // Add data before update
  state.todos.push({
    id: 'todo-1',
    value: 'Existing todo',
    priority: 3,
    projectId: null,
    created_at: 123456,
    updated_at: 123456,
    completed_at: null,
    tags: [],
  });

  await client.callTool('set_app', { theme: 'light' }, sessionId);

  // Collections should be preserved
  expect(state.todos).toHaveLength(1);
  expect(state.todos[0].value).toBe('Existing todo');
});

// ============================================================================
// Array Tools Tests (todos)
// ============================================================================

test('add_app_todos returns complete instance with generated id and timestamps', async () => {
  const result = await client.callTool(
    'add_app_todos',
    {
      value: {
        value: 'Buy milk',
        priority: 2,
      },
    },
    sessionId
  );

  const response = parseResult<{ success: boolean; value: Todo }>(result);

  expect(response.success).toBe(true);
  expect(response.value.value).toBe('Buy milk');
  expect(response.value.priority).toBe(2);

  // System-generated fields should be present
  expect(response.value.id).toBeDefined();
  expect(typeof response.value.id).toBe('string');
  expect(response.value.id.length).toBeGreaterThan(0);
  expect(response.value.created_at).toBeDefined();
  expect(typeof response.value.created_at).toBe('number');
  expect(response.value.updated_at).toBeDefined();

  // Defaults should be applied
  expect(response.value.completed_at).toBe(null);
  expect(response.value.projectId).toBe(null);
  expect(response.value.tags).toEqual([]);

  // Verify state was updated
  expect(state.todos).toHaveLength(1);
  expect(state.todos[0].id).toBe(response.value.id);
});

test('add_app_todos respects provided defaults', async () => {
  const result = await client.callTool(
    'add_app_todos',
    {
      value: {
        value: 'Tagged todo',
        priority: 5,
        tags: ['urgent', 'work'],
        projectId: 'proj-123',
      },
    },
    sessionId
  );

  const response = parseResult<{ success: boolean; value: Todo }>(result);

  expect(response.value.priority).toBe(5);
  expect(response.value.tags).toEqual(['urgent', 'work']);
  expect(response.value.projectId).toBe('proj-123');
});

test('get_app_todos returns all todos', async () => {
  // Add multiple todos
  state.todos = [
    {
      id: 'todo-1',
      value: 'First',
      priority: 1,
      projectId: null,
      created_at: 1000,
      updated_at: 1000,
      completed_at: null,
      tags: [],
    },
    {
      id: 'todo-2',
      value: 'Second',
      priority: 2,
      projectId: null,
      created_at: 2000,
      updated_at: 2000,
      completed_at: null,
      tags: [],
    },
  ];

  const result = await client.callTool('get_app_todos', {}, sessionId);
  const todos = parseResult<Todo[]>(result);

  expect(todos).toHaveLength(2);
  expect(todos[0].value).toBe('First');
  expect(todos[1].value).toBe('Second');
});

test('get_app_todos by ID returns single todo', async () => {
  state.todos = [
    {
      id: 'todo-abc',
      value: 'Target todo',
      priority: 3,
      projectId: null,
      created_at: 1000,
      updated_at: 1000,
      completed_at: null,
      tags: [],
    },
  ];

  const result = await client.callTool('get_app_todos', { id: 'todo-abc' }, sessionId);
  const todo = parseResult<Todo>(result);

  expect(todo.id).toBe('todo-abc');
  expect(todo.value).toBe('Target todo');
});

test('get_app_todos by ID returns undefined for non-existent', async () => {
  state.todos = [];

  const result = await client.callTool('get_app_todos', { id: 'non-existent' }, sessionId);
  const textContent = result.content[0] as TextContent;

  // undefined becomes empty string in JSON response
  expect(textContent.text).toBe('');
});

test('set_app_todos partial update by ID', async () => {
  state.todos = [
    {
      id: 'todo-update',
      value: 'Original value',
      priority: 3,
      projectId: null,
      created_at: 1000,
      updated_at: 1000,
      completed_at: null,
      tags: ['old'],
    },
  ];

  const result = await client.callTool(
    'set_app_todos',
    {
      id: 'todo-update',
      value: { priority: 5 },
    },
    sessionId
  );

  const response = parseResult<{ success: boolean; value: Todo }>(result);

  expect(response.success).toBe(true);
  expect(response.value.priority).toBe(5);
  // Other fields preserved
  expect(response.value.value).toBe('Original value');
  expect(response.value.tags).toEqual(['old']);

  // Verify state
  expect(state.todos[0].priority).toBe(5);
  expect(state.todos[0].value).toBe('Original value');
});

test('set_app_todos returns complete updated instance', async () => {
  state.todos = [
    {
      id: 'todo-full',
      value: 'Full todo',
      priority: 2,
      projectId: null,
      created_at: 1000,
      updated_at: 1000,
      completed_at: null,
      tags: [],
    },
  ];

  const result = await client.callTool(
    'set_app_todos',
    {
      id: 'todo-full',
      value: { completed_at: 9999 },
    },
    sessionId
  );

  const response = parseResult<{ success: boolean; value: Todo }>(result);

  // Should return complete object
  expect(response.value.id).toBe('todo-full');
  expect(response.value.value).toBe('Full todo');
  expect(response.value.priority).toBe(2);
  expect(response.value.completed_at).toBe(9999);
  expect(response.value.created_at).toBe(1000);
});

test('set_app_todos throws error for non-existent ID', async () => {
  state.todos = [];

  const result = await client.callTool(
    'set_app_todos',
    {
      id: 'non-existent',
      value: { priority: 1 },
    },
    sessionId
  );

  expect(result.isError).toBe(true);
  const textContent = result.content[0] as TextContent;
  expect(textContent.text).toContain('not found');
});

test('delete_app_todos by ID removes todo', async () => {
  state.todos = [
    {
      id: 'todo-delete',
      value: 'To be deleted',
      priority: 3,
      projectId: null,
      created_at: 1000,
      updated_at: 1000,
      completed_at: null,
      tags: [],
    },
    {
      id: 'todo-keep',
      value: 'Keep this',
      priority: 3,
      projectId: null,
      created_at: 2000,
      updated_at: 2000,
      completed_at: null,
      tags: [],
    },
  ];

  const result = await client.callTool('delete_app_todos', { id: 'todo-delete' }, sessionId);
  const response = parseResult<{ success: boolean }>(result);

  expect(response.success).toBe(true);
  expect(state.todos).toHaveLength(1);
  expect(state.todos[0].id).toBe('todo-keep');
});

test('delete_app_todos all clears entire array', async () => {
  state.todos = [
    {
      id: 'todo-1',
      value: 'First',
      priority: 1,
      projectId: null,
      created_at: 1000,
      updated_at: 1000,
      completed_at: null,
      tags: [],
    },
    {
      id: 'todo-2',
      value: 'Second',
      priority: 2,
      projectId: null,
      created_at: 2000,
      updated_at: 2000,
      completed_at: null,
      tags: [],
    },
  ];

  const result = await client.callTool('delete_app_todos', { all: true }, sessionId);
  const response = parseResult<{ success: boolean }>(result);

  expect(response.success).toBe(true);
  expect(state.todos).toEqual([]);
});

// ============================================================================
// Record Tools Tests (projects)
// ============================================================================

test('set_app_projects inserts new project with generated fields', async () => {
  const result = await client.callTool(
    'set_app_projects',
    {
      key: 'work',
      value: {
        title: 'Work Projects',
        description: 'Work-related tasks',
      },
    },
    sessionId
  );

  const response = parseResult<{ success: boolean; value: Project }>(result);

  expect(response.success).toBe(true);
  expect(response.value.title).toBe('Work Projects');
  expect(response.value.description).toBe('Work-related tasks');

  // System-generated fields
  expect(response.value.id).toBeDefined();
  expect(typeof response.value.id).toBe('string');
  expect(response.value.created_at).toBeDefined();
  expect(response.value.updated_at).toBeDefined();

  // Defaults
  expect(response.value.color).toBe(null);

  // Verify state
  expect(state.projects.work).toBeDefined();
  expect(state.projects.work.title).toBe('Work Projects');
});

test('set_app_projects updates existing project with deep merge', async () => {
  // Add existing project
  state.projects.work = {
    id: 'proj-1',
    title: 'Work',
    description: 'Original description',
    color: null,
    created_at: 1000,
    updated_at: 1000,
  };

  const result = await client.callTool(
    'set_app_projects',
    {
      key: 'work',
      value: {
        color: '#ff0000',
      },
    },
    sessionId
  );

  const response = parseResult<{ success: boolean; value: Project }>(result);

  expect(response.success).toBe(true);
  // Updated field
  expect(response.value.color).toBe('#ff0000');
  // Preserved fields
  expect(response.value.title).toBe('Work');
  expect(response.value.description).toBe('Original description');
  expect(response.value.id).toBe('proj-1');

  // Verify state
  expect(state.projects.work.color).toBe('#ff0000');
  expect(state.projects.work.title).toBe('Work');
});

test('get_app_projects returns all projects', async () => {
  state.projects = {
    work: {
      id: 'proj-1',
      title: 'Work',
      description: null,
      color: null,
      created_at: 1000,
      updated_at: 1000,
    },
    personal: {
      id: 'proj-2',
      title: 'Personal',
      description: null,
      color: '#00ff00',
      created_at: 2000,
      updated_at: 2000,
    },
  };

  const result = await client.callTool('get_app_projects', {}, sessionId);
  const projects = parseResult<Record<string, Project>>(result);

  expect(Object.keys(projects)).toHaveLength(2);
  expect(projects.work.title).toBe('Work');
  expect(projects.personal.title).toBe('Personal');
});

test('get_app_projects by key returns single project', async () => {
  state.projects.work = {
    id: 'proj-1',
    title: 'Work',
    description: 'Work tasks',
    color: null,
    created_at: 1000,
    updated_at: 1000,
  };

  const result = await client.callTool('get_app_projects', { key: 'work' }, sessionId);
  const project = parseResult<Project>(result);

  expect(project.id).toBe('proj-1');
  expect(project.title).toBe('Work');
  expect(project.description).toBe('Work tasks');
});

test('get_app_projects by key returns undefined for non-existent', async () => {
  state.projects = {};

  const result = await client.callTool('get_app_projects', { key: 'non-existent' }, sessionId);
  const textContent = result.content[0] as TextContent;

  expect(textContent.text).toBe('');
});

test('delete_app_projects by key removes project', async () => {
  state.projects = {
    work: {
      id: 'proj-1',
      title: 'Work',
      description: null,
      color: null,
      created_at: 1000,
      updated_at: 1000,
    },
    personal: {
      id: 'proj-2',
      title: 'Personal',
      description: null,
      color: null,
      created_at: 2000,
      updated_at: 2000,
    },
  };

  const result = await client.callTool('delete_app_projects', { key: 'work' }, sessionId);
  const response = parseResult<{ success: boolean }>(result);

  expect(response.success).toBe(true);
  expect(state.projects.work).toBeUndefined();
  expect(state.projects.personal).toBeDefined();
});

test('delete_app_projects all clears entire record', async () => {
  state.projects = {
    work: {
      id: 'proj-1',
      title: 'Work',
      description: null,
      color: null,
      created_at: 1000,
      updated_at: 1000,
    },
    personal: {
      id: 'proj-2',
      title: 'Personal',
      description: null,
      color: null,
      created_at: 2000,
      updated_at: 2000,
    },
  };

  const result = await client.callTool('delete_app_projects', { all: true }, sessionId);
  const response = parseResult<{ success: boolean }>(result);

  expect(response.success).toBe(true);
  expect(state.projects).toEqual({});
});

// ============================================================================
// Complete Workflow Test
// ============================================================================

test('complete workflow: create project, add todos, update, change settings', async () => {
  // 1. Create a project
  const projectResult = await client.callTool(
    'set_app_projects',
    {
      key: 'shopping',
      value: {
        title: 'Shopping List',
        color: '#4CAF50',
      },
    },
    sessionId
  );
  const projectResponse = parseResult<{ success: boolean; value: Project }>(projectResult);
  expect(projectResponse.success).toBe(true);
  const projectId = projectResponse.value.id;

  // 2. Add a todo linked to the project
  const todo1Result = await client.callTool(
    'add_app_todos',
    {
      value: {
        value: 'Buy groceries',
        priority: 2,
        projectId,
        tags: ['shopping', 'weekly'],
      },
    },
    sessionId
  );
  const todo1Response = parseResult<{ success: boolean; value: Todo }>(todo1Result);
  expect(todo1Response.success).toBe(true);
  const todo1Id = todo1Response.value.id;

  // 3. Add another todo
  const todo2Result = await client.callTool(
    'add_app_todos',
    {
      value: {
        value: 'Buy birthday gift',
        priority: 1,
        tags: ['shopping', 'urgent'],
      },
    },
    sessionId
  );
  const todo2Response = parseResult<{ success: boolean; value: Todo }>(todo2Result);
  const todo2Id = todo2Response.value.id;

  // 4. Update first todo (mark as completed)
  const updateResult = await client.callTool(
    'set_app_todos',
    {
      id: todo1Id,
      value: { completed_at: Date.now() },
    },
    sessionId
  );
  const updateResponse = parseResult<{ success: boolean; value: Todo }>(updateResult);
  expect(updateResponse.success).toBe(true);
  expect(updateResponse.value.completed_at).not.toBe(null);

  // 5. Change app settings
  await client.callTool(
    'set_app',
    {
      sortBy: 'priority',
      theme: 'dark',
      showCompleted: false,
    },
    sessionId
  );

  // 6. Verify final state via get_app
  const finalResult = await client.callTool('get_app', {}, sessionId);
  const finalState = parseResult<App>(finalResult);

  // Verify todos
  expect(finalState.todos).toHaveLength(2);
  const completedTodo = finalState.todos.find((t) => t.id === todo1Id);
  const pendingTodo = finalState.todos.find((t) => t.id === todo2Id);
  expect(completedTodo?.completed_at).not.toBe(null);
  expect(completedTodo?.projectId).toBe(projectId);
  expect(pendingTodo?.completed_at).toBe(null);
  expect(pendingTodo?.tags).toContain('urgent');

  // Verify project
  expect(finalState.projects.shopping).toBeDefined();
  expect(finalState.projects.shopping.title).toBe('Shopping List');
  expect(finalState.projects.shopping.color).toBe('#4CAF50');

  // Verify settings
  expect(finalState.sortBy).toBe('priority');
  expect(finalState.theme).toBe('dark');
  expect(finalState.showCompleted).toBe(false);
});

// ============================================================================
// Error Handling Tests
// ============================================================================

test('validation error for priority out of range', async () => {
  const result = await client.callTool(
    'add_app_todos',
    {
      value: {
        value: 'Invalid todo',
        priority: 10, // Max is 5
      },
    },
    sessionId
  );

  expect(result.isError).toBe(true);
  const textContent = result.content[0] as TextContent;
  // Zod validation error should mention the constraint
  expect(textContent.text.toLowerCase()).toMatch(/too_big|maximum|5|invalid/);
});

test('validation error for invalid enum value', async () => {
  const result = await client.callTool(
    'set_app',
    {
      theme: 'invalid-theme' as any,
    },
    sessionId
  );

  expect(result.isError).toBe(true);
  const textContent = result.content[0] as TextContent;
  expect(textContent.text.toLowerCase()).toMatch(/invalid|enum|theme/);
});

test('tags can be updated via set_app_todos', async () => {
  // Since nested array tools are not generated, verify tags can be updated via parent
  state.todos = [
    {
      id: 'todo-tags',
      value: 'Tagged todo',
      priority: 3,
      projectId: null,
      created_at: 1000,
      updated_at: 1000,
      completed_at: null,
      tags: ['initial'],
    },
  ];

  const result = await client.callTool(
    'set_app_todos',
    {
      id: 'todo-tags',
      value: { tags: ['updated', 'tags', 'array'] },
    },
    sessionId
  );

  const response = parseResult<{ success: boolean; value: Todo }>(result);
  expect(response.success).toBe(true);
  expect(response.value.tags).toEqual(['updated', 'tags', 'array']);
  expect(state.todos[0].tags).toEqual(['updated', 'tags', 'array']);
});
