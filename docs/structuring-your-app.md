# Structuring Your App for MCP-Web

This guide explains how to structure your web application to work effectively
with MCP-Web. The key is organizing your project around **declarative, reactive state**
that can be easily exposed to AI agents via tools.

## Project Structure

Organize your project with clear separation of concerns:

```
your-project/
├── mcp-web.config.js      # MCPWeb configuration
├── bridge.ts              # Bridge server
├── agent.ts               # Agent server (optional, for frontend queries)
├── src/
│   ├── schemas.ts         # Zod schemas describing resources
│   ├── types.ts           # TypeScript types (derived from schemas)
│   ├── state.ts           # Declarative reactive state management
│   ├── mcp.ts             # MCPWeb instantiation + tool registration
│   ├── queries.ts         # Frontend-triggered queries (optional)
│   └── <app files>        # Your application code
└── package.json
```

## Key Files

### 1. `mcp-web.config.js`

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

### 2. `src/schemas.ts`

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

// Input schemas (for action tool)
export const CreateTodoSchema = z.object({
  title: z.string().min(1).describe('Title is required'),
  description: z.string().default(''),
  dueDate: z.string().datetime().nullable().default(null),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});
```

**Key principle**: Use `.describe()` extensively! The descriptions are critical
for AI agents to understand your state and how to change it.

### 3. `src/types.ts`

While not necessariy, it's nice to have a single source of truth for your
resources types: your Zod schemas. Hence, it's convenient to derive TypeScript
types from your Zod schemas whereever possible:

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

### 4. `src/state.ts`

Create declarative and reactive state using your framework's state management:

```typescript
// Example: Vue with Pinia
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Todo } from './types';

export const useAppStore = defineStore('app', () => {
  // Declarative "atomic" state (expose to AI)
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

### 5. `src/mcp.ts`

Instantiate MCPWeb and register tools:

```typescript
import { MCPWeb } from '@mcp-web/core';
import { MCP_WEB_CONFIG } from '../mcp-web.config';
import { TodoListSchema, CreateTodoSchema } from './schemas';
import { store } from './state';

export const mcp = new MCPWeb(MCP_WEB_CONFIG);

// Expose state as tools
const [getTodos, setTodos] = mcp.addStateTools({
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

::: info
For vanilla React, where the state is bound to the component hierarchy, you
need to expose tools within your components rather than in a separate file.
See [our React integration guide](/integrations#react) for details.
:::

### 6. `src/queries.ts` (Optional)

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

### 7. `bridge.ts`

A NodeJS script for running the bridge server:

```typescript
import { startBridge } from '@mcp-web/bridge';
import { MCP_WEB_CONFIG } from './mcp-web.config';

startBridge({
  wsPort: MCP_WEB_CONFIG.wsPort,
  mcpPort: MCP_WEB_CONFIG.mcpPort,
});
```

### 8. `agent.ts` (Optional)

A NodeJS script for starting the AI agent server for
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
