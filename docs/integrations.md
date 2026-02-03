# Framework Integrations

MCP-Web is framework agnostic. Here we describe how you can use MCP-Web with
several popular frameworks and state management libraries.

::: tip
If you don't see your favorite framework or state management library described
here, feel free to [open a PR](https://github.com/flekschas/mcp-web) for
another integration.
:::

## React

MCP-Web works best with external state management libraries like
[Jotai](https://jotai.org) or [Zustand](https://github.com/pmndrs/zustand).

::: warning Why not `useState`?
MCP-Web exposes state to *external* AI agents via tools. These tools need stable
`get`/`set` functions that always return fresh values. Vanilla `useState` values
captured in closures become stale after re-renders, causing tools to return
outdated data.

While you can work around this with `useRef`, external state managers like Jotai
and Zustand solve this naturally by decoupling the state tree from the component
tree and its render cycle. This makes it straightforward to ensure `get()`
always returns fresh values.
:::

### React with Jotai

[Jotai](https://jotai.org) is the **recommended approach** for React. Its
architecture separates state from components, which makes it straightforward to
to expose the state as tools with MCP-Web.

**1. Define your schemas, types, and state:**

```typescript
// schemas.ts
export const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

export type Todo = z.infer<typeof TodoSchema>;

// states.ts
import { atom } from 'jotai';
import { type Todo } from './schemas';

// Atoms (like useState but external)
export const todosAtom = atom<Todo[]>([]);
export const themeAtom = atom<'light' | 'dark'>('light');

// Derived atom (read-only)
export const activeTodosAtom = atom((get) => {
  return get(todosAtom).filter(t => !t.completed);
});
```

**2. Define your tools:**

```typescript
// tools.ts
import { createTool, createStateTools } from '@mcp-web/core';
import { getDefaultStore } from 'jotai';
import { z } from 'zod';
import { todosAtom, themeAtom, activeTodosAtom } from './states';
import { TodoSchema } from './schema';

const store = getDefaultStore();

// State tools for read-write atoms
export const todoTools = createStateTools({
  name: 'todos',
  description: 'List of all todos',
  get: () => store.get(todosAtom),
  set: (value) => store.set(todosAtom, value),
  schema: z.array(TodoSchema),
  expand: true, // Generates get_todos, add_todos, set_todos, delete_todos
});

export const themeTools = createStateTools({
  name: 'theme',
  description: 'App color theme',
  get: () => store.get(themeAtom),
  set: (value) => store.set(themeAtom, value),
  schema: z.enum(['light', 'dark']),
});

// Read-only tool for derived state
export const activeTodosTool = createTool({
  name: 'get_active_todos',
  description: 'Get active (incomplete) todos',
  handler: () => store.get(activeTodosAtom),
  outputSchema: z.array(TodoSchema),
});
```

**3. Register tools in React:**

While you can manually create a `MCBWeb()` instance, it's more convenient to
use our provider to handle auto-connection and simplify `useMCPTools()`.

```typescript
// main.tsx
import { MCPWebProvider } from '@mcp-web/react';
import { MCP_WEB_CONFIG } from './mcp-web.config';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <MCPWebProvider config={MCP_WEB_CONFIG}>
    <App />
  </MCPWebProvider>
);
```

Finally, expose the tools using `useMCPTools()`. This hook manages the lifecycle
of the tool registration automatically for you.

```typescript
// App.tsx
import { useMCPTools } from '@mcp-web/react';
import { useAtom } from 'jotai';
import { todosAtom, themeAtom } from './states';
import { todoTools, themeTools, activeTodosTool } from './tools';

function App() {
  // Register all tools - cleaned up when component unmounts
  useMCPTools(todoTools, themeTools, activeTodosTool);

  // Use Jotai atoms normally in your UI
  const [todos] = useAtom(todosAtom);
  const [theme, setTheme] = useAtom(themeAtom);

  return (
    <div className={theme}>
      {todos.map(todo => (
        <div key={todo.id}>{todo.title}</div>
      ))}
    </div>
  );
}
```

#### Dynamic Tool Registration

Tools are tied to the component lifecycle with `useMCPTools()`. Meaning, when the
component mounts, tools are registered. And when the component unmounts tools
are revoked. This makes it easy to conditionally expose tools.

```typescript
function AdminPanel() {
  // These tools only exist while AdminPanel is mounted
  useMCPTools(adminTools, dangerousTools);
  return <div>Admin controls</div>;
}

function App() {
  const [isAdmin] = useAtom(isAdminAtom);
  
  useMCPTools(todoTools, themeTools); // Always available
  
  return (
    <div>
      <TodoList />
      {isAdmin && <AdminPanel />}
    </div>
  );
}
```

### React with Zustand

[Zustand](https://github.com/pmndrs/zustand) is another excellent choice with
a slightly different API style.

**`store.ts`**:

```typescript
import { create } from 'zustand';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

interface TodoStore {
  todos: Todo[];
  addTodo: (title: string) => void;
  setTodos: (todos: Todo[]) => void;
}

export const useTodoStore = create<TodoStore>((set) => ({
  todos: [],
  addTodo: (title) => set((state) => ({
    todos: [...state.todos, {
      id: crypto.randomUUID(),
      title,
      completed: false
    }]
  })),
  setTodos: (todos) => set({ todos }),
}));
```

**`tools.ts`**:

```typescript
import { createStateTools } from '@mcp-web/core';
import { z } from 'zod';
import { useTodoStore } from './store';

const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

export const todoTools = createStateTools({
  name: 'todos',
  description: 'All todos',
  get: () => useTodoStore.getState().todos,
  set: (value) => useTodoStore.getState().setTodos(value),
  schema: z.array(TodoSchema),
  expand: true,
});
```

**`App.tsx`**:

```typescript
import { useMCPTools, useMCPWeb } from '@mcp-web/react';
import { useTodoStore } from './store';
import { todoTools } from './tools';
import { z } from 'zod';

const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

function App() {
  const mcp = useMCPWeb();
  useMCPTools(todoTools);

  // Register custom action tool
  React.useEffect(() => {
    mcp.addTool({
      name: 'create_todo',
      description: 'Create a new todo',
      handler: ({ title }) => {
        useTodoStore.getState().addTodo(title);
        return useTodoStore.getState().todos.at(-1)!;
      },
      inputSchema: z.object({ title: z.string() }),
      outputSchema: TodoSchema,
    });
  }, [mcp]);

  const todos = useTodoStore((state) => state.todos);

  return <div>{/* Your UI */}</div>;
}
```

## Svelte

Svelte's architecture also allows externalizing state, which makes it work
seamlessly with MCP-Web without any the need for a special state management
library.

### Svelte with Runes (Svelte 5)

[Svelte 5's runes](https://svelte.dev/docs/svelte/what-are-runes) are all you
need as they provide reactive state that can live outside components.

**`state.svelte.ts`**:

```typescript
import type { Todo } from './types';

let todos = $state<Todo[]>([]);

// Export state with getter/setter
export const state = {
  get todos() { return todos; },
  set todos(value: Todo[]) { todos = value; },
};
```

**`mcp.ts`**:

```typescript
import { MCPWeb } from '@mcp-web/core';
import { z } from 'zod';
import { MCP_WEB_CONFIG } from './mcp-web.config';
import { state } from './state.svelte';

const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

export const mcpWeb = new MCPWeb(MCP_WEB_CONFIG);

mcpWeb.addStateTools({
  name: 'todos',
  description: 'All todos',
  get: () => state.todos,
  set: (value) => { state.todos = value; },
  schema: z.array(TodoSchema),
  expand: true,
});
```

```svelte
<!-- App.svelte -->
<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { mcpWeb } from './mcp';
import { state } from './state.svelte';

onMount(async () => {
  await mcpWeb.connect();
});

onDestroy(() => {
  mcpWeb.disconnect();
});
</script>

<div>
  {#each state.todos as todo (todo.id)}
    <div>{todo.title}</div>
  {/each}
</div>
```

### Svelte with Stores (Svelte 4)

For Svelte 4 or when using classic [stores](https://svelte.dev/docs/svelte/stores):

```typescript
// stores.ts
import { writable, derived } from 'svelte/store';
import type { Todo } from './types';

export const todos = writable<Todo[]>([]);

export const activeTodos = derived(
  todos,
  ($todos) => $todos.filter(t => !t.completed)
);
```

```typescript
// mcp.ts
import { get } from 'svelte/store';
import { MCPWeb } from '@mcp-web/core';
import { MCP_WEB_CONFIG } from './mcp-web.config';
import { todos } from './stores';

const mcp = new MCPWeb(MCP_WEB_CONFIG);

mcp.addStateTools({
  name: 'todos',
  description: 'All todos',
  get: () => get(todos),
  set: (value) => todos.set(value),
  schema: TodoListSchema,
  expand: true,
});
```

## Vue

MCP-Web works best with [Pinia](https://pinia.vuejs.org/) for Vue applications.

::: warning Why not vanilla `ref()`?
Similar to React's `useState`, Vue's `ref()` values captured in closures can
become stale. When you pass `() => myRef.value` to a tool's `get` function,
it works, but organizing tools at module level becomes awkward since refs are
typically created inside components.

Pinia stores exist outside components, making tool organization cleaner and
avoiding closure complexity.
:::

### Vue with Pinia

```typescript
// stores/todoStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export const useTodoStore = defineStore('todos', () => {
  const todos = ref<Todo[]>([]);

  const activeTodos = computed(() =>
    todos.value.filter(t => !t.completed)
  );

  function createTodo(title: string) {
    const todo: Todo = {
      id: crypto.randomUUID(),
      title,
      completed: false,
    };
    todos.value.push(todo);
    return todo;
  }

  function setTodos(value: Todo[]) {
    todos.value = value;
  }

  return { todos, activeTodos, createTodo, setTodos };
});
```

```typescript
// mcp/tools.ts
import { z } from 'zod';
import type { MCPWeb } from '@mcp-web/core';
import { useTodoStore } from '../stores/todoStore';

const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

export function registerTools(mcp: MCPWeb) {
  const store = useTodoStore();

  mcp.addStateTools({
    name: 'todos',
    description: 'List of all todos',
    get: () => store.todos,
    set: (value) => store.setTodos(value),
    schema: z.array(TodoSchema),
    expand: true,
  });

  mcp.addTool({
    name: 'create_todo',
    description: 'Create a new todo',
    handler: ({ title }) => store.createTodo(title),
    inputSchema: z.object({ title: z.string() }),
    outputSchema: TodoSchema,
  });
}
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { MCPWeb } from '@mcp-web/core';
import { useTodoStore } from './stores/todoStore';
import { registerTools } from './mcp/tools';
import { MCP_WEB_CONFIG } from './mcp-web.config';

const store = useTodoStore();
const mcp = new MCPWeb(MCP_WEB_CONFIG);

onMounted(async () => {
  registerTools(mcp);
  await mcp.connect();
});

onUnmounted(() => {
  mcp.disconnect();
});
</script>

<template>
  <div>
    <div v-for="todo in store.todos" :key="todo.id">
      {{ todo.title }}
    </div>
  </div>
</template>
```
