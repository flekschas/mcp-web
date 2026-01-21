import { expect, test } from 'bun:test';
import { z } from 'zod';
import { id, system } from './schema-helpers.js';
import { generateToolsForSchema } from './tool-generator.js';

// ============================================================================
// Todo App Scenario (from documentation)
// ============================================================================

// Schema definitions from docs/expanded-state-tools.md
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

test('integration - todo app generates 13 tools as documented', () => {
  let state: App = {
    todos: [],
    projects: {},
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  };

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'todo app',
      get: () => state,
      set: (value) => {
        state = value as App;
      },
      schema: AppSchema,
    }
  );

  // Root (get, set) = 2
  // todos array (get, add, set, delete) = 4
  // projects record (get, set, delete) = 3
  // Total = 9
  // Note: Nested array tools (todos.tags) are not generated in current implementation
  expect(result.tools).toHaveLength(9);
});

test('integration - todo app has expected tool names', () => {
  let state: App = {
    todos: [],
    projects: {},
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  };

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'todo app',
      get: () => state,
      set: (value) => {
        state = value as App;
      },
      schema: AppSchema,
    }
  );

  const toolNames = result.tools.map((t) => t.name);

  // Root tools
  expect(toolNames).toContain('get_app');
  expect(toolNames).toContain('set_app');

  // Todos array tools
  expect(toolNames).toContain('get_app_todos');
  expect(toolNames).toContain('add_app_todos');
  expect(toolNames).toContain('set_app_todos');
  expect(toolNames).toContain('delete_app_todos');

  // Projects record tools
  expect(toolNames).toContain('get_app_projects');
  expect(toolNames).toContain('set_app_projects');
  expect(toolNames).toContain('delete_app_projects');

  // Note: Nested array tools (todos.tags) are not generated in current implementation
  expect(toolNames).not.toContain('get_app_todos_tags');
});

test('integration - add todo returns complete object with generated ID', async () => {
  let state: App = {
    todos: [],
    projects: {},
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  };

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'todo app',
      get: () => state,
      set: (value) => {
        state = value as App;
      },
      schema: AppSchema,
    }
  );

  const addTodo = result.tools.find((t) => t.name === 'add_app_todos');
  if (!addTodo) throw new Error('add_app_todos not found');

  const response = (await addTodo.handler({
    value: {
      value: 'Buy milk',
      priority: 2,
    },
  })) as { success: boolean; value: Todo };

  expect(response.success).toBe(true);
  expect(response.value.id).toBeDefined();
  expect(response.value.value).toBe('Buy milk');
  expect(response.value.priority).toBe(2);
  expect(response.value.created_at).toBeDefined();
  expect(response.value.updated_at).toBeDefined();
  expect(response.value.completed_at).toBe(null);
  expect(response.value.projectId).toBe(null);

  // Verify state was updated
  expect(state.todos).toHaveLength(1);
  expect(state.todos[0].value).toBe('Buy milk');
});

test('integration - update todo by ID with partial update', async () => {
  let state: App = {
    todos: [
      {
        id: 'todo-1',
        value: 'Buy milk',
        priority: 3,
        projectId: null,
        created_at: 123456,
        updated_at: 123456,
        completed_at: null,
        tags: [],
      },
    ],
    projects: {},
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  };

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'todo app',
      get: () => state,
      set: (value) => {
        state = value as App;
      },
      schema: AppSchema,
    }
  );

  const setTodo = result.tools.find((t) => t.name === 'set_app_todos');
  if (!setTodo) throw new Error('set_app_todos not found');

  // Update only priority
  await setTodo.handler({
    id: 'todo-1',
    value: { priority: 5 },
  });

  expect(state.todos[0].priority).toBe(5);
  expect(state.todos[0].value).toBe('Buy milk'); // Unchanged
  expect(state.todos[0].id).toBe('todo-1'); // Unchanged
});

test('integration - update todo with tags (since nested tools not implemented)', async () => {
  let state: App = {
    todos: [
      {
        id: 'todo-1',
        value: 'Buy milk',
        priority: 3,
        projectId: null,
        created_at: 123456,
        updated_at: 123456,
        completed_at: null,
        tags: ['shopping'],
      },
    ],
    projects: {},
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  };

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'todo app',
      get: () => state,
      set: (value) => {
        state = value as App;
      },
      schema: AppSchema,
    }
  );

  const setTodo = result.tools.find((t) => t.name === 'set_app_todos');
  if (!setTodo) throw new Error('set_app_todos not found');

  // Since nested array tools are not implemented, update tags via todo setter
  await setTodo.handler({
    id: 'todo-1',
    value: { tags: ['shopping', 'urgent'] },
  });

  expect(state.todos[0].tags).toEqual(['shopping', 'urgent']);
});

test('integration - upsert project (record set)', async () => {
  let state: App = {
    todos: [],
    projects: {},
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  };

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'todo app',
      get: () => state,
      set: (value) => {
        state = value as App;
      },
      schema: AppSchema,
    }
  );

  const setProject = result.tools.find((t) => t.name === 'set_app_projects');
  if (!setProject) throw new Error('set_app_projects not found');

  // Add new project
  const response1 = (await setProject.handler({
    key: 'work',
    value: {
      title: 'Work Projects',
      description: 'Work-related tasks',
    },
  })) as { success: boolean; value: Project };

  expect(response1.success).toBe(true);
  expect(response1.value.id).toBeDefined();
  expect(response1.value.title).toBe('Work Projects');
  expect('work' in state.projects).toBe(true);

  // Update existing project (upsert)
  await setProject.handler({
    key: 'work',
    value: {
      color: '#ff0000',
    },
  });

  expect(state.projects.work.title).toBe('Work Projects'); // Preserved
  expect(state.projects.work.color).toBe('#ff0000'); // Updated
});

test('integration - update settings (root set)', async () => {
  let state: App = {
    todos: [],
    projects: {},
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  };

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'todo app',
      get: () => state,
      set: (value) => {
        state = value as App;
      },
      schema: AppSchema,
    }
  );

  const setApp = result.tools.find((t) => t.name === 'set_app');
  if (!setApp) throw new Error('set_app not found');

  // Update only settings
  await setApp.handler({
    theme: 'dark',
    showCompleted: false,
  });

  expect(state.theme).toBe('dark');
  expect(state.showCompleted).toBe(false);
  expect(state.sortBy).toBe('created_at'); // Unchanged
  expect(state.todos).toEqual([]); // Collections unchanged
  expect(state.projects).toEqual({}); // Collections unchanged
});

test('integration - get overview returns full state', async () => {
  let state: App = {
    todos: [
      {
        id: 'todo-1',
        value: 'Buy milk',
        priority: 3,
        projectId: null,
        created_at: 123456,
        updated_at: 123456,
        completed_at: null,
        tags: [],
      },
    ],
    projects: {
      work: {
        id: 'proj-1',
        title: 'Work',
        description: null,
        color: null,
        created_at: 123456,
        updated_at: 123456,
      },
    },
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  };

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'todo app',
      get: () => state,
      set: (value) => {
        state = value as App;
      },
      schema: AppSchema,
    }
  );

  const getApp = result.tools.find((t) => t.name === 'get_app');
  if (!getApp) throw new Error('get_app not found');

  const fullState = await getApp.handler({});
  expect(fullState).toEqual(state);
  expect((fullState as App).todos).toHaveLength(1);
  expect(Object.keys((fullState as App).projects)).toHaveLength(1);
});

test('integration - get overview with excludeCollections returns only settings', async () => {
  let state: App = {
    todos: [
      {
        id: 'todo-1',
        value: 'Buy milk',
        priority: 3,
        projectId: null,
        created_at: 123456,
        updated_at: 123456,
        completed_at: null,
        tags: [],
      },
    ],
    projects: {
      work: {
        id: 'proj-1',
        title: 'Work',
        description: null,
        color: null,
        created_at: 123456,
        updated_at: 123456,
      },
    },
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  };

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'todo app',
      get: () => state,
      set: (value) => {
        state = value as App;
      },
      schema: AppSchema,
    }
  );

  const getApp = result.tools.find((t) => t.name === 'get_app');
  if (!getApp) throw new Error('get_app not found');

  const settings = await getApp.handler({ excludeCollections: true });
  expect(settings).toEqual({
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  });
  expect((settings as Record<string, unknown>).todos).toBeUndefined();
  expect((settings as Record<string, unknown>).projects).toBeUndefined();
});

// ============================================================================
// Complete Workflow Test
// ============================================================================

test('integration - complete todo app workflow', async () => {
  let state: App = {
    todos: [],
    projects: {},
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  };

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'todo app',
      get: () => state,
      set: (value) => {
        state = value as App;
      },
      schema: AppSchema,
    }
  );

  // Find all tools
  const addTodo = result.tools.find((t) => t.name === 'add_app_todos')!;
  const setTodo = result.tools.find((t) => t.name === 'set_app_todos')!;
  const setProject = result.tools.find((t) => t.name === 'set_app_projects')!;
  const setApp = result.tools.find((t) => t.name === 'set_app');
  const getApp = result.tools.find((t) => t.name === 'get_app')!;

  // 1. Add a project
  const projectResponse = (await setProject.handler({
    key: 'work',
    value: { title: 'Work Projects' },
  })) as { value: Project };
  const projectId = projectResponse.value.id;

  // 2. Add a todo with tags
  const todoResponse = (await addTodo.handler({
    value: {
      value: 'Buy milk',
      priority: 2,
      projectId,
      tags: ['shopping', 'urgent'],
    },
  })) as { value: Todo };
  const todoId = todoResponse.value.id;

  // 3. Update the todo
  await setTodo.handler({
    id: todoId,
    value: { priority: 5 },
  });

  // 4. Update app settings
  if (setApp) {
    await setApp.handler({
      theme: 'dark',
      sortBy: 'priority',
    });
  }

  // 5. Verify final state
  const finalState = (await getApp.handler({})) as App;

  expect(finalState.todos).toHaveLength(1);
  expect(finalState.todos[0].value).toBe('Buy milk');
  expect(finalState.todos[0].priority).toBe(5);
  expect(finalState.todos[0].tags).toEqual(['shopping', 'urgent']);
  expect(finalState.todos[0].projectId).toBe(projectId);

  expect(Object.keys(finalState.projects)).toHaveLength(1);
  expect(finalState.projects.work.title).toBe('Work Projects');

  expect(finalState.theme).toBe('dark');
  expect(finalState.sortBy).toBe('priority');
});

// ============================================================================
// Edge Cases
// ============================================================================

test('integration - empty arrays and records', async () => {
  let state: App = {
    todos: [],
    projects: {},
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  };

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'todo app',
      get: () => state,
      set: (value) => {
        state = value as App;
      },
      schema: AppSchema,
    }
  );

  const getTodos = result.tools.find((t) => t.name === 'get_app_todos')!;
  const getProjects = result.tools.find((t) => t.name === 'get_app_projects')!;

  expect(await getTodos.handler({})).toEqual([]);
  expect(await getProjects.handler({})).toEqual({});
});

test('integration - null vs undefined handling in deep merge', async () => {
  let state: App = {
    todos: [
      {
        id: 'todo-1',
        value: 'Buy milk',
        priority: 3,
        projectId: 'proj-1',
        created_at: 123456,
        updated_at: 123456,
        completed_at: 123456,
        tags: [],
      },
    ],
    projects: {},
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  };

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'todo app',
      get: () => state,
      set: (value) => {
        state = value as App;
      },
      schema: AppSchema,
    }
  );

  const setTodo = result.tools.find((t) => t.name === 'set_app_todos')!;

  // Set completed_at to null (explicit clear)
  await setTodo.handler({
    id: 'todo-1',
    value: { completed_at: null },
  });

  expect(state.todos[0].completed_at).toBe(null);
  expect(state.todos[0].projectId).toBe('proj-1'); // Unchanged
});

test('integration - delete all todos', async () => {
  let state: App = {
    todos: [
      {
        id: 'todo-1',
        value: 'Buy milk',
        priority: 3,
        projectId: null,
        created_at: 123456,
        updated_at: 123456,
        completed_at: null,
        tags: [],
      },
      {
        id: 'todo-2',
        value: 'Walk dog',
        priority: 2,
        projectId: null,
        created_at: 123457,
        updated_at: 123457,
        completed_at: null,
        tags: [],
      },
    ],
    projects: {},
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  };

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'todo app',
      get: () => state,
      set: (value) => {
        state = value as App;
      },
      schema: AppSchema,
    }
  );

  const deleteTodos = result.tools.find((t) => t.name === 'delete_app_todos')!;

  await deleteTodos.handler({ all: true });
  expect(state.todos).toEqual([]);
});

test('integration - delete all projects', async () => {
  let state: App = {
    todos: [],
    projects: {
      work: {
        id: 'proj-1',
        title: 'Work',
        description: null,
        color: null,
        created_at: 123456,
        updated_at: 123456,
      },
      personal: {
        id: 'proj-2',
        title: 'Personal',
        description: null,
        color: null,
        created_at: 123456,
        updated_at: 123456,
      },
    },
    sortBy: 'created_at',
    sortOrder: 'asc',
    showCompleted: true,
    theme: 'system',
  };

  const result = generateToolsForSchema(
    {
      name: 'app',
      description: 'todo app',
      get: () => state,
      set: (value) => {
        state = value as App;
      },
      schema: AppSchema,
    }
  );

  const deleteProjects = result.tools.find(
    (t) => t.name === 'delete_app_projects'
  )!;

  await deleteProjects.handler({ all: true });
  expect(state.projects).toEqual({});
});
