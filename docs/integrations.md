# Framework Integrations

MCP-Web is framework agnostic and integrates easily. Here we describe how you
can use MCP-Web with several popular frameworks and state management libraries.

::: tip
If you don't see your favorite framework or state management library described
here, feel free to [open a PR](https://github.com/flekschas/mcp-web) for
another integration.
:::

## React

Integrate MCP-Web with React using hooks and context for clean state management.

### Basic Setup

```typescript
// mcp.ts - Create and export MCP-Web instance
import { MCPWeb } from '@mcp-web/web';
import { MCP_WEB_CONFIG } from './mcp-web.config';

export const mcp = new MCPWeb(MCP_WEB_CONFIG);
```

### Connection Management with `useMCP`

Use the `useMCP` hook from `@mcp-web/react` to manage the MCP-Web connection
lifecycle. The main benefit of this hook over `mcp.connect()` is that it
triggers a re-render of the caller component when the connection status changes.

```typescript
// App.tsx
import { useMCP } from '@mcp-web/react';
import { mcp } from './mcp';

function App() {
  const { isConnected } = useMCP(mcp);

  if (!isConnected) {
    return <div>Connecting to MCP...</div>;
  }

  return <div>{/* Your app */}</div>;
}
```

The hook automatically:
- Connects to the bridge server on mount
- Disconnects on unmount
- Provides reactive `isConnected` state for re-renders

Ideally, call this hook in your root component to avoid unnecessary reconnections.

### State and Tool Management

Use the `useTool` hook from `@mcp-web/react` to expose React state as MCP tools:

```typescript
import { useState } from 'react';
import { useTool } from '@mcp-web/react';
import { z } from 'zod';
import { mcp } from './mcp';

const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

type Todo = z.infer<typeof TodoSchema>;

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);

  // Automatically creates get_todos and set_todos tools
  useTool({
    mcp,
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

::: tip Large Schemas
For complex state objects with nested structures, you can use schema decomposition to create focused setter tools. See the [Large Schema guide](./large-schema.md) for details.
:::

### Context Provider Pattern

For larger apps, use the `MCPProvider` from `@mcp-web/react` to share the MCP instance:

```typescript
// App.tsx
import { useState } from 'react';
import { MCPProvider, useMCPContext, useTool } from '@mcp-web/react';
import { MCPWeb } from '@mcp-web/web';
import { z } from 'zod';
import { MCP_WEB_CONFIG } from './mcp-web.config';

// Create MCP instance outside component
const mcp = new MCPWeb(MCP_WEB_CONFIG);

const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

type Todo = z.infer<typeof TodoSchema>;

function TodoApp() {
  const { mcp, isConnected } = useMCPContext();
  const [todos, setTodos] = useState<Todo[]>([]);

  // Register tools using mcp from context
  useTool({
    mcp,
    name: 'todos',
    description: 'List of all todos',
    value: todos,
    setValue: setTodos,
    valueSchema: z.array(TodoSchema),
  });

  if (!isConnected) {
    return <div>Connecting...</div>;
  }

  return <div>{/* Your UI */}</div>;
}

function Root() {
  return (
    <MCPProvider mcp={mcp}>
      <TodoApp />
    </MCPProvider>
  );
}
```

The provider:
- Handles connection lifecycle automatically
- Makes MCP instance available to all child components
- Provides reactive `isConnected` state

### React with Jotai

Integrate MCP-Web with Jotai atoms for atomic state management.

#### Atom-Based State Tools

```typescript
// atoms.ts
import { atom } from 'jotai';

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

```typescript
// tools.ts
import { addAtomTool } from '@mcp-web/web/integrations/jotai';
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

// Register read-write atom as MCP tool
addAtomTool({
  mcp,
  atom: todosAtom,
  name: 'todos',
  description: 'List of all todos',
  atomSchema: z.array(TodoSchema),
});

addAtomTool({
  mcp,
  atom: groupsAtom,
  name: 'groups',
  description: 'Todo groups for organization',
  atomSchema: z.array(GroupSchema),
});

// Read-only derived atoms
addAtomTool({
  mcp,
  atom: activeTodosAtom,
  name: 'active_todos',
  description: 'Active (incomplete) todos',
  atomSchema: z.array(TodoSchema),
  // No split = read-only (derived atoms can't be written)
});

addAtomTool({
  mcp,
  atom: statisticsAtom,
  name: 'statistics',
  description: 'Todo statistics (total, completed, active counts)',
  atomSchema: z.object({
    total: z.number(),
    completed: z.number(),
    active: z.number(),
  }),
});
```

::: tip Large Schemas
For complex state objects with nested structures, you can use schema decomposition to create focused setter tools. See the [Large Schema guide](./large-schema.md) for details.
:::

#### Manual Tool Registration with Atoms

If you prefer more control:

```typescript
// mcp-tools.ts
import { z } from 'zod';
import { mcp } from './mcp';
import { store } from './store'; // Jotai store
import { todosAtom } from './atoms';

// Get/set with Jotai store
const [getTodos, setTodos] = mcp.addStateTool({
  name: 'todos',
  description: 'Todo list',
  get: () => store.get(todosAtom),
  set: (value) => store.set(todosAtom, value),
  schema: z.array(TodoSchema),
});

// Add custom action tools
mcp.addTool({
  name: 'create_todo',
  description: 'Create a new todo',
  handler: ({ title, groupId }) => {
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
});
```

### React with Zustand

```typescript
// store.ts
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

```typescript
// mcp-tools.ts
import { z } from 'zod';
import { mcp } from './mcp';
import { useTodoStore } from './store';

export function registerTools() {
  const { todos, setTodos, addTodo } = useTodoStore.getState();

  const [getTodos, setTodosState] = mcp.addStateTool({
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

---

## Vue

Integrate MCP-Web with Vue 3 using Composition API and Pinia stores.

### Basic Setup

```typescript
// mcp.ts
import { MCPWeb } from '@mcp-web/web';
import { MCP_WEB_CONFIG } from './mcp-web.config';

export function createMCP() {
  return new MCPWeb(MCP_WEB_CONFIG);
}
```

### Composition API

```vue
<!-- App.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { z } from 'zod';
import { createMCP } from './mcp';

const mcp = createMCP();
const todos = ref<Todo[]>([]);

onMounted(async () => {
  // Register tools
  const [getTodos, setTodos] = mcp.addStateTool({
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

### Pinia Store Integration

Based on the [todo demo](../demos/todo/):

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
  const [getTodos, setTodos] = mcp.addStateTool({
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

---

## Svelte

Integrate MCP-Web with Svelte 5 using runes for reactive state.

### Basic Setup

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

### Svelte Stores (Classic)

For Svelte 4 or when using stores:

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

const [getTodos, setTodos] = mcp.addStateTool({
  name: 'todos',
  description: 'All todos',
  get: () => get(todos),
  set: (value) => todos.set(value),
  schema: TodoListSchema,
});
```
