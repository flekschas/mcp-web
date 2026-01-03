# Structuring Your App for MCP-Web

This guide explains how to structure your web application to work effectively
with MCP-Web. The key is organizing your project around **declarative, reactive state**
that can be easily exposed to AI agents via tools.

---

## Project Structure

Organize your project with clear separation of concerns:

```
your-project/
├── mcp-web.config.js      # MCPWeb configuration
├── bridge.ts              # Bridge server (dev mode)
├── agent.ts               # Agent server (optional, for frontend queries)
├── src/
│   ├── schemas.ts         # Zod schemas describing resources
│   ├── types.ts           # TypeScript types (derived from schemas)
│   ├── state.ts           # Reactive state management
│   ├── mcp.ts             # MCPWeb instantiation + tool registration
│   ├── queries.ts         # Frontend-triggered queries (optional)
│   └── <app files>        # Your application code
└── package.json
```

### Key Files

#### 1. `mcp-web.config.js`

Central configuration for your MCP integration:

```javascript
export const MCP_WEB_CONFIG = {
  name: 'My App',
  description: 'Description of what your app does',
  host: 'localhost',
  wsPort: 3001,      // Bridge WebSocket port
  mcpPort: 3002,     // Bridge MCP server port
  autoConnect: true,
  // Optional: for frontend-triggered queries
  agentUrl: 'http://localhost:3003',
};
```

#### 2. `src/schemas.ts`

Define your application's data structures with Zod:

```typescript
import { z } from 'zod';

// Define entities with detailed descriptions
export const TodoSchema = z.object({
  id: z.string().describe('Unique identifier'),
  title: z.string().min(1).describe('Todo title'),
  description: z.string().describe('Detailed description'),
  completed: z.boolean().describe('Completion status'),
  dueDate: z.string().datetime().nullable()
    .describe('ISO 8601 due date or null if no deadline'),
  priority: z.enum(['low', 'medium', 'high'])
    .describe('Priority level'),
}).describe('A single todo item');

// Collections
export const TodoListSchema = z.array(TodoSchema)
  .describe('Collection of all todos');

// Input schemas (for tool inputs)
export const CreateTodoSchema = z.object({
  title: z.string().min(1).describe('Title is required'),
  description: z.string().optional().default(''),
  dueDate: z.string().datetime().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});
```

**Key principle**: Use `.describe()` extensively—these descriptions help AI agents understand your data.

#### 3. `src/types.ts`

Derive TypeScript types from your Zod schemas:

```typescript
import type { z } from 'zod';
import type {
  TodoSchema,
  TodoListSchema,
  CreateTodoSchema,
} from './schemas';

export type Todo = z.infer<typeof TodoSchema>;
export type TodoList = z.infer<typeof TodoListSchema>;
export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;
```

#### 4. `src/state.ts`

Create reactive state using your framework's state management:

```typescript
// Example: Vue with Pinia
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Todo } from './types';

export const useAppStore = defineStore('app', () => {
  // Atomic state (expose to AI)
  const todos = ref<Todo[]>([]);

  // Derived state (keep in frontend only)
  const activeTodos = computed(() =>
    todos.value.filter(t => !t.completed)
  );

  const statistics = computed(() => ({
    total: todos.value.length,
    completed: todos.value.filter(t => t.completed).length,
  }));

  return { todos, activeTodos, statistics };
});
```

```typescript
// Example: Svelte with runes
import type { GameState } from './types';

let gameState = $state<GameState>({
  board: createInitialBoard(),
  currentTurn: 'red',
  gameStatus: 'ongoing',
});

const validMoves = $derived(calculateValidMoves(gameState));

export const state = {
  get gameState() { return gameState; },
  set gameState(value) { gameState = value; },
  get validMoves() { return validMoves; },
};
```

#### 5. `src/mcp.ts`

Instantiate MCPWeb and register tools:

```typescript
import { MCPWeb } from '@mcp-web/web';
import { MCP_WEB_CONFIG } from '../mcp-web.config';
import { TodoListSchema, CreateTodoSchema } from './schemas';
import { store } from './state';

export const mcp = new MCPWeb(MCP_WEB_CONFIG);

// Expose state as tools
const [getTodos, setTodos] = mcp.addStateTool({
  name: 'todos',
  description: 'List of all todo items',
  get: () => store.todos,
  set: (value) => { store.todos = value; },
  schema: TodoListSchema,
});

// Add action tools
mcp.addTool({
  name: 'create_todo',
  description: 'Create a new todo item',
  handler: (input) => {
    const todo = {
      id: crypto.randomUUID(),
      ...input,
      completed: false,
    };
    store.todos.push(todo);
    return todo;
  },
  inputSchema: CreateTodoSchema,
  outputSchema: TodoSchema,
});
```

#### 6. `src/queries.ts` (Optional)

For [frontend-triggered AI queries](/frontend-triggered-queries):

```typescript
import { mcp } from './mcp';
import { state } from './state';

export async function askAIForMove() {
  const query = mcp.query({
    prompt: 'Analyze the board and suggest the best move',
    context: [
      {
        name: 'game_state',
        value: state.gameState,
        schema: GameStateSchema,
        description: 'Current game state',
      },
    ],
  });

  for await (const event of query) {
    if (event.type === 'query_complete') {
      return event.result;
    }
  }
}
```

#### 7. `bridge.ts`

A NodeJS script for running the bridge server:

```typescript
import { startBridge } from '@mcp-web/bridge';
import { MCP_WEB_CONFIG } from './mcp-web.config';

startBridge({
  wsPort: MCP_WEB_CONFIG.wsPort,
  mcpPort: MCP_WEB_CONFIG.mcpPort,
});
```

#### 8. `agent.ts` (Optional)

A NodeJS scriot for starting the AI agent server for
[frontend-triggered AI queries](/frontend-triggered-queries):

```typescript
import { MCP_WEB_CONFIG } from './mcp-web.config';

const port = new URL(MCP_WEB_CONFIG.agentURL).port;

startAgent({ port });
```

::: tip
See the [checkers game demo](https://github.com/flekschas/mcp-web/blob/main/demos/checkers/agent.ts)
for a complete example for an AI agent.
:::

## State Architecture

### The Core Principle

If your frontend is built around declarative state and reactive values, making
it AI-controllable is easy: expose the declarative state as tools.

### Schema → Type → Declarative State → Reactive Values

When you follow the following approach, it's trivial to make your web app
AI controllable.

```
1. Define Zod schema
   ↓
2. Derive TypeScript type
   ↓
3. Create declarative state with that type  →  Expose as MCP tools
   ↓
4. Derive reactive values from the declarative state
```

**Example:**

```typescript
// 1. Zod schema
const CounterSchema = z.number().describe('Current counter value');

// 2. TypeScript type
type Counter = z.infer<typeof CounterSchema>;

// 3. Reactive state
let counter = $state<Counter>(0);

// 4. MCP tool
const [getCounter, setCounter] = mcp.addStateTool({
  name: 'counter',
  description: 'Application counter',
  get: () => counter,
  set: (value) => { counter = value; },
  schema: CounterSchema,
});
```

### Declarative State vs. Derived Values

**Expose declarative state to AI while keeping derived values in the frontend:**

```typescript
// ✅ EXPOSE: Atomic state (source of truth)
const todos = ref<Todo[]>([]);
const [getTodos, setTodos] = mcp.addStateTool({
  name: 'todos',
  description: 'List of all todos',
  get: () => todos.value,
  set: (v) => { todos.value = v; },
  schema: TodoListSchema,
});

// ❌ DON'T EXPOSE: Derived state (computed from atomic state)
const activeTodos = computed(() => todos.value.filter(t => !t.completed));
const completionPercentage = computed(() => {
  const total = todos.value.length;
  const completed = todos.value.filter(t => t.completed).length;
  return total === 0 ? 0 : (completed / total) * 100;
});
// Keep these in frontend—AI can compute from todos if needed
```

::: tip
Of course, there are edge cases where it can make sense to expose derived values
as getter tools to AI. For instance, when the computation is non-trivial and
useful for certain AI queries. For a deep dive see the guide on
[declarative reactive state](/declarative-reactive-state).
:::

### When to Use State Tools vs. Action Tools

#### Use State Tools (Direct Access)

For semantically related declarative state where you do not want the shape of
the state to change.

```typescript
// ✅ Good: Simple state
const [getTheme, setTheme] = mcp.addStateTool({
  name: 'theme',
  description: 'Application theme',
  get: () => settings.theme,
  set: (value) => { settings.theme = value; },
  schema: z.enum(['light', 'dark']),
});
```

**Best for:**
- Simple values (strings, numbers, booleans)
- Objects without complex validation
- State that doesn't require coordination

#### Use Action Tools (Explicit Commands)

When operations change the shape of declarative state (e.g., adding a record to
an object or an item to an array) or when operations involve logic, validation,
or multiple state updates:

```typescript
// ✅ Good: Complex operation
mcp.addTool({
  name: 'make_move',
  description: 'Make a chess move',
  handler: (move) => {
    // 1. Validate move is legal
    if (!isValidMove(move)) {
      throw new Error('Illegal move');
    }

    // 2. Update multiple state variables
    state.board = applyMove(state.board, move);
    state.moveHistory.push(move);
    state.currentPlayer = switchPlayer(state.currentPlayer);

    // 3. Check game end conditions
    state.gameStatus = checkGameStatus(state.board);

    return { success: true, gameStatus: state.gameStatus };
  },
  inputSchema: MoveSchema,
});
```

**Best for:**
- Complex validation logic
- Multi-step/state operations
- Side effects (logging, analytics, etc.)

**Example:** HiGlass viewconf is very complex—better to expose actions like `add_track` than letting AI set the entire config.

### Schema Decomposition for Large Objects

For complex state objects, use schema decomposition to create focused setters:

```typescript
const GameStateSchema = z.object({
  board: z.array(z.array(PieceSchema)),
  players: z.array(PlayerSchema),
  currentPlayer: z.number(),
  scores: z.object({
    red: z.number(),
    black: z.number(),
  }),
  settings: z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']),
    timeLimit: z.number().nullable(),
  }),
});

const [getGameState, setGameStateTools] = mcp.addStateTool({
  name: 'game_state',
  description: 'Complete game state',
  get: () => state.gameState,
  set: (value) => { state.gameState = value; },
  schema: GameStateSchema,
  // Split into focused setters
  schemaSplit: [
    'board',                           // set_game_state_board
    ['currentPlayer'],                  // set_game_state_current_player
    ['scores.red', 'scores.black'],     // set_game_state_scores
    ['settings'],                       // set_game_state_settings
  ],
});
// setGameStateTools is an array of 4 setter tools

// AI agents can now:
// - get_game_state() → read full state
// - set_game_state_board(newBoard) → update just the board
// - set_game_state_scores({ red: 10, black: 8 }) → update scores
```

---

## Complete Example

Putting it all together for a todo app:

```
todo-app/
├── mcp-web.config.js
│   └── Configuration for MCPWeb
├── src/
│   ├── schemas.ts
│   │   └── TodoSchema, TodoListSchema, CreateTodoSchema
│   ├── types.ts
│   │   └── Todo, TodoList (derived from schemas)
│   ├── state.ts
│   │   └── Pinia store with todos[], activeTodos, statistics
│   ├── mcp.ts
│   │   ├── MCPWeb instance
│   │   ├── addStateTool for todos
│   │   └── addTool for create_todo, update_todo, delete_todo
│   └── App.vue
│       └── UI that reads from store and calls store actions
└── bridge.ts
    └── Development server on ports 3001/3002
```

**Flow:**

1. User interacts with UI → Updates Pinia store
2. AI agent calls MCP tools → Updates Pinia store
3. Pinia store changes → UI reactively updates
4. Both user and AI control the same reactive state

---

## Development Workflow

### 1. Start the Bridge Server

```bash
# Terminal 1: Run bridge server
npm run bridge
# or
npx tsx bridge.ts
```

### 2. Start Your App

```bash
# Terminal 2: Run your app
npm run dev
```

### 3. Configure AI Host App

Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "your-app": {
      "command": "npx",
      "args": ["@mcp-web/client"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3002",
        "AUTH_TOKEN": "<your-auth-token>"
      }
    }
  }
}
```

Get your auth token:
```typescript
console.log('Auth token:', mcp.authToken);
```

### 4. Start Building

- Define schemas in `schemas.ts`
- Create reactive state in `state.ts`
- Register tools in `mcp.ts`
- Build your UI
- Test with AI agent!

---

## Best Practices

### 1. Schema-First Design

Define Zod schemas with descriptive annotations:

```typescript
// ❌ Bad: No descriptions
const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

// ✅ Good: Rich descriptions
const TodoSchema = z.object({
  id: z.string().describe('Unique identifier for the todo'),
  title: z.string().min(1).describe('Title of the todo item'),
  completed: z.boolean().describe('Whether the todo is completed'),
  dueDate: z.string().datetime().nullable()
    .describe('ISO 8601 datetime when todo is due, or null if no deadline'),
}).describe('A single todo item in the application');
```

### 2. Separate MCP Integration

Keep MCP code separate from UI components:

```
src/
├── mcp.ts              # MCPWeb instance
├── schemas.ts          # Zod schemas
├── state.ts            # State management
├── components/         # UI components
└── stores/             # Framework stores
```

Depending on your framework and state library, we recommend keeping tool
registrations (i.e., `mcp.addTool` and `mcp.addStateTool`) in either the
`mcp.ts`, a separate `tools.ts` file, or as part of component. The latter is
most useful for conditional tools that are only useful in the context of a
specific component.

### 3. Use State Tools for Declarative State

```typescript
// ✅ Good: Simple state with addStateTool
const [getCounter, setCounter] = mcp.addStateTool({
  name: 'counter',
  description: 'Application counter',
  get: () => count,
  set: (v) => { count = v; },
  schema: z.number(),
});
```

### 4. Use Action Tools for Shape-Changing Operations

```typescript
// ✅ Good: Complex operation with addTool
mcp.addTool({
  name: 'make_move',
  handler: (move) => {
    if (!isValid(move)) throw new Error('Invalid move');
    updateBoard(move);
    updateTurn();
    checkWinner();
    return { success: true };
  },
});
```

### 5. Cleanup on Unmount

```typescript
// React
useEffect(() => {
  const [getTodos, setTodos, cleanup] = mcp.addStateTool({...});
  return cleanup;
}, []);

// Vue
onUnmounted(() => {
  mcp.disconnect();
});

// Svelte
onDestroy(() => {
  mcpWeb.disconnect();
});
```

### 6. Keep It Simple

Start with state tools, add action tools only when needed:

```typescript
// ✅ Start simple
const [getTodos, setTodos] = mcp.addStateTool({
  name: 'todos',
  description: 'List of all todos',
  get: () => todos,
  set: (v) => { todos = v; },
  schema: TodoListSchema,
});

// ✅ Add actions as complexity grows
mcp.addTool({
  name: 'create_todo',
  handler: (input) => {
    // Validation + side effects
    return newTodo;
  },
});
```

### 7. Use Framework-Specific Patterns

Don't fight your framework—use its state management:

- **React**: useState, Zustand, Redux
- **Vue**: Pinia stores, ref/reactive
- **Svelte**: Runes ($state/$derived), stores
- **Jotai**: Atoms with `addAtomTool()`

See [Framework Integrations](/integrations) for examples.
