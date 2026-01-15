# Framework Integrations

MCP-Web is framework agnostic. Here we describe how you can use MCP-Web with
several popular frameworks and state management libraries.

::: tip
If you don't see your favorite framework or state management library described
here, feel free to [open a PR](https://github.com/flekschas/mcp-web) for
another integration.
:::

## React with `useState`

Integrate MCP-Web with [React](https://react.dev) using the provider
pattern for clean state management with React's `useState` hook.

Use `MCPWebProvider` to wrap your application. It automatically creates and
the MCPWeb instance and manages its connection to the bridge server:

```typescript
// App.tsx
import { MCPWebProvider } from '@mcp-web/react';
import { MCP_WEB_CONFIG } from './mcp-web.config';

function App() {
  return (
    <MCPWebProvider config={MCP_WEB_CONFIG}>
      <YourApp />
    </MCPWebProvider>
  );
}
```

The provider automatically:
- Creates the MCPWeb instance
- Connects to the bridge server on mount
- Disconnects on unmount
- Makes the instance available to all child components

### State and Tool Management

Use the `useTool` hook to expose React state as MCP tools. When used inside `MCPWebProvider`, you don't need to pass the `mcpWeb` instance:

```typescript
import { useState } from 'react';
import { useTool } from '@mcp-web/react';
import { z } from 'zod';

const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

type Todo = z.infer<typeof TodoSchema>;

function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);

  // Automatically creates get_todos and set_todos tools
  useTool({
    name: 'todos',
    description: 'List of all todos',
    value: todos,
    setValue: setTodos,
    valueSchema: z.array(TodoSchema),
  });

  return <div>{/* Your UI */}</div>;
}
```

The `useTool` hook handles:
- Tool registration and cleanup
- Schema validation
- Automatic decomposition for complex objects (when using `valueSchemaSplit`)

::: info
Internally, the `useTool` hook is essentially just a fancy `useEffect` call to
simplify the registration and unregistration of tools.
:::

### Manual MCPWeb Instance (Advanced)

For advanced use cases where you need manual control over the MCPWeb instance,
you can create it yourself and pass it to `useTool`:

```typescript
import { MCPWeb } from '@mcp-web/web';
import { useTool } from '@mcp-web/react';

// Create instance outside React
const mcpWeb = new MCPWeb({
  name: 'My App',
  description: 'My app',
  autoConnect: true,  // Or use `mcpWeb.connect()` to manually connect
});

function MyComponent() {
  const [todos, setTodos] = useState([]);

  useTool({
    mcpWeb, // Explicit instance (overrides context if both exist)
    name: 'todos',
    description: 'Todo list',
    value: todos,
    setValue: setTodos,
    valueSchema: z.array(TodoSchema),
  });

  return <div>{/* Your UI */}</div>;
}
```

::: warning
Using this approach means you're responsible for managing the connection
lifecycle yourself via `mcpWeb.connect()` and `mcpWeb.disconnect()`. For most
use cases, `MCPWebProvider` is the recommended approach.
:::

## React with Jotai

MCP-Web integrates seamlessly with [Jotai](https://jotai.org) for atomic state
management.

::: tip No React Integration Needed
Since Jotai allows state to be externalized (atoms can be created outside React components), you don't need the React integration provider or hooks. Simply use `addAtomTool()` directly with a shared MCPWeb instance. This approach is simpler because Jotai's architecture naturally separates state management from React components.
:::

For this example, we assume you want to expose the following atom states:

```typescript
// atoms.ts
import { atom } from 'jotai';
import type { TodoSchema, GroupSchema } from './schema.ts';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  groupId?: string;
}

interface Group {
  id: string;
  name: string;
  color: string;
}

// Read-write atoms
export const todosAtom = atom<Todo[]>([]);
export const groupsAtom = atom<Group[]>([]);

// Derived atom (read-only)
export const activeTodosAtom = atom((get) => {
  const todos = get(todosAtom);
  return todos.filter(t => !t.completed);
});

export const statisticsAtom = atom((get) => {
  const todos = get(todosAtom);
  return {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    active: todos.filter(t => !t.completed).length,
  };
});
```

To expose these atoms as tools to AI, it can make sense to create a separate
file called `tools.ts` and directly register the tools using MCP-Web's
`addTool()` and `addStateTools()`.

```typescript
// tools.ts
import { getDefaultStore } from 'jotai';
import { z } from 'zod';
import { mcp } from './mcp';
import { todosAtom, groupsAtom, activeTodosAtom, statisticsAtom } from './atoms';

const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  groupId: z.string().optional(),
});

const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
});

// Register read-write atom with MCP-Web's `addStateTool`
mcp.addStateTools({
  name: 'todos',
  description: 'List of all todos',
  get: () => getDefaultStore().get(todosAtom),
  set: (value) => getDefaultStore().set(todosAtom, value),
  schema: z.array(TodoSchema),
});

mcp.addStateTools({
  name: 'groups',
  description: 'Todo groups for organization',
  get: () => getDefaultStore().get(groupsAtom),
  set: (value) => getDefaultStore().set(groupsAtom, value),
  schema: z.array(GroupSchema),
});

// For read-only derived atoms use MCP-Web's `addTool`
mcp.addTool({
  name: 'active_todos',
  description: 'Active (incomplete) todos',
  handler: () => getDefaultStore().get(activeTodosAtom),
  schema: z.array(TodoSchema),
});

mcp.addTool({
  name: 'statistics',
  description: 'Todo statistics (total, completed, active counts)',
  handler: () => getDefaultStore().get(statisticsAtom),
  schema: z.object({
    total: z.number(),
    completed: z.number(),
    active: z.number(),
  }),
});
```

::: warning Import `tools.ts` in a React component
To execute the tool registration, you need to import the `tools.ts` in a React
component. E.g.: `import './tools.ts';`.
:::

For shape changing or more complex operations, use `mcp.addTool()`:

```typescript
// Add to tools.ts
mcp.addTool({
  name: 'create_todo',
  description: 'Create a new todo',
  handler: ({ title, groupId }) => {
    const store = getDefaultStore();
    const todos = store.get(todosAtom);
    const newTodo = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      groupId,
    };
    store.set(todosAtom, [...todos, newTodo]);
    return newTodo;
  },
  inputSchema: z.object({
    title: z.string(),
    groupId: z.string().optional(),
  }),
  outputSchema: TodoSchema,
});

mcp.addTool({
  name: 'toggle_todo',
  description: 'Toggle todo completion status',
  handler: ({ id }) => {
    const store = getDefaultStore();
    const todos = store.get(todosAtom);
    const updated = todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    store.set(todosAtom, updated);
    return updated.find(t => t.id === id);
  },
  inputSchema: z.object({ id: z.string() }),
  outputSchema: TodoSchema,
});
```

## React with Zustand

Similar to Jotai, MCP-Web integrates seamlessly with [Zustand](https://github.com/pmndrs/zustand).

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
import { z } from 'zod';
import { mcp } from './mcp';
import { useTodoStore } from './store';

export function registerTools() {
  const { todos, setTodos, addTodo } = useTodoStore.getState();

  const [getTodos, setTodosState] = mcp.addStateTools({
    name: 'todos',
    description: 'All todos',
    get: () => useTodoStore.getState().todos,
    set: (value) => useTodoStore.getState().setTodos(value),
    schema: z.array(z.object({
      id: z.string(),
      title: z.string(),
      completed: z.boolean(),
    })),
  });

  mcp.addTool({
    name: 'create_todo',
    description: 'Create a todo',
    handler: ({ title }) => {
      useTodoStore.getState().addTodo(title);
      return useTodoStore.getState().todos.at(-1)!;
    },
  });
}
```

## Vue with `ref`

You can use MCP-Web with vanilla [Vue]() using `ref()`, `onMount()`, and
`onUnmount()`.

**`App.vue`**:

```vue
<!-- App.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { z } from 'zod';
import { MCPWeb } from '@mcp-web/web';
import { MCP_WEB_CONFIG } from './mcp-web.config';

const mcp = new MCPWeb(MCP_WEB_CONFIG);

const todos = ref<Todo[]>([]);

onMounted(async () => {
  // Register tools
  const [getTodos, setTodos] = mcp.addStateTools({
    name: 'todos',
    description: 'List of all todos',
    get: () => todos.value,
    set: (value) => { todos.value = value; },
    schema: z.array(TodoSchema),
  });

  // Connect to bridge
  await mcp.connect();
});

onUnmounted(() => {
  mcp.disconnect();
});
</script>
```

## Vue with Pinia

MCP-Web integrates seamlessly with Vue's [Pinia store](https://pinia.vuejs.org/).

```typescript
// stores/appStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Todo } from '../types';

export const useAppStore = defineStore('app', () => {
  // State
  const todos = ref<Todo[]>([]);
  const groups = ref<Group[]>([]);

  // Computed (derived state)
  const activeTodos = computed(() =>
    todos.value.filter(t => !t.completed)
  );

  const statistics = computed(() => ({
    total: todos.value.length,
    completed: todos.value.filter(t => t.completed).length,
    active: activeTodos.value.length,
  }));

  // Actions
  function createTodo(input: Omit<Todo, 'id' | 'completed'>) {
    const todo: Todo = {
      id: crypto.randomUUID(),
      ...input,
      completed: false,
    };
    todos.value.push(todo);
    return todo;
  }

  function updateTodo(id: string, updates: Partial<Todo>) {
    const index = todos.value.findIndex(t => t.id === id);
    if (index === -1) return null;
    todos.value[index] = { ...todos.value[index], ...updates };
    return todos.value[index];
  }

  return {
    todos,
    groups,
    activeTodos,
    statistics,
    createTodo,
    updateTodo,
  };
});
```

```typescript
// mcp/index.ts
import { MCPWeb } from '@mcp-web/web';
import { MCP_WEB_CONFIG } from '../mcp-web.config';
import type { useAppStore } from '../stores/appStore';
import { registerTodoTools } from './tools/todos';
import { registerAnalyticsTools } from './tools/analytics';

export function createMCP() {
  return new MCPWeb(MCP_WEB_CONFIG);
}

export function registerAllTools(
  mcp: MCPWeb,
  store: ReturnType<typeof useAppStore>
) {
  registerTodoTools(mcp, store);
  registerAnalyticsTools(mcp, store);
}
```

```typescript
// mcp/tools/todos.ts
import { z } from 'zod';
import type { MCPWeb } from '@mcp-web/web';
import type { useAppStore } from '../../stores/appStore';
import { TodoSchema, CreateTodoSchema, UpdateTodoSchema } from '../schemas';

export function registerTodoTools(
  mcp: MCPWeb,
  store: ReturnType<typeof useAppStore>
) {
  // Expose todos as state
  const [getTodos, setTodos] = mcp.addStateTools({
    name: 'todos',
    description: 'List of all todos',
    get: () => store.todos,
    set: (value) => { store.todos = value; },
    schema: z.array(TodoSchema),
  });

  // CRUD operations
  mcp.addTool({
    name: 'create_todo',
    description: 'Create a new todo',
    handler: (input) => store.createTodo(input),
    inputSchema: CreateTodoSchema,
    outputSchema: TodoSchema,
  });

  mcp.addTool({
    name: 'update_todo',
    description: 'Update a todo',
    handler: ({ id, ...updates }) => {
      const result = store.updateTodo(id, updates);
      if (!result) throw new Error(`Todo ${id} not found`);
      return result;
    },
    inputSchema: UpdateTodoSchema,
    outputSchema: TodoSchema,
  });
}
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useAppStore } from './stores/appStore';
import { createMCP, registerAllTools } from './mcp';

const store = useAppStore();
const mcp = createMCP();

onMounted(async () => {
  registerAllTools(mcp, store);
  await mcp.connect();
});

onUnmounted(() => {
  mcp.disconnect();
});
</script>
```

## Svelte with Runes

MCP-Web integrates seamlessly with [Svelte 5's runes](https://svelte.dev/docs/svelte/what-are-runes) for reactive state.

**`state.svelte.ts`**:

```typescript
import type { GameState } from './types';

let gameState = $state<GameState>({
  board: createInitialBoard(),
  currentTurn: 'red',
  moveHistory: [],
  gameStatus: 'ongoing',
});

const allValidMoves = $derived(getLegalMoves(gameState));

// Export state with getter/setter
export const state = {
  get gameState() { return gameState; },
  set gameState(value: GameState) { gameState = value; },
  get allValidMoves() { return allValidMoves; },
};
```

**`mcp.ts`**:

```typescript
import { MCPWeb } from '@mcp-web/web';
import { z } from 'zod';
import { MCP_WEB_CONFIG } from './mcp-web.config';
import { GameStateSchema, MoveSchema } from './schemas';
import { state } from './state.svelte';
import { makeMove } from './game-logic';

export const mcpWeb = new MCPWeb(MCP_WEB_CONFIG);

// Register tools
mcpWeb.addTool({
  name: 'get_game_state',
  description: 'Get the current game state including board, turn, and all valid moves',
  handler: () => ({ ...state.gameState, valid_moves: state.allValidMoves }),
  outputSchema: GameStateSchema,
});

mcpWeb.addTool({
  name: 'make_move',
  description: 'Make a move for the current player',
  handler: (move) => {
    // Validate move
    const isValid = state.allValidMoves.some(m =>
      m.from.row === move.from.row &&
      m.from.col === move.from.col &&
      m.to.row === move.to.row &&
      m.to.col === move.to.col
    );

    if (!isValid) {
      throw new Error('Invalid move - not in valid moves list');
    }

    // Apply move
    const newState = makeMove(state.gameState, move);
    state.gameState = newState;

    return {
      success: true,
      gameStatus: state.gameState.gameStatus,
    };
  },
  inputSchema: MoveSchema,
  outputSchema: z.object({
    success: z.boolean(),
    gameStatus: z.enum(['ongoing', 'won', 'draw']),
  }),
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
  <h1>Game Status: {state.gameState.gameStatus}</h1>
  <p>Current Turn: {state.gameState.currentTurn}</p>
  <!-- Board UI -->
</div>
```

## Svelte with Stores

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
import { MCPWeb } from '@mcp-web/web';
import { todos } from './stores';

const mcp = new MCPWeb({
  name: 'Svelte Todo',
  description: 'Todo app with Svelte stores',
});

const [getTodos, setTodos] = mcp.addStateTools({
  name: 'todos',
  description: 'All todos',
  get: () => get(todos),
  set: (value) => todos.set(value),
  schema: TodoListSchema,
});
```
