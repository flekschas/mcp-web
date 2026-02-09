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
│   ├── mcp-tools.ts       # MCPWeb instantiation + tool registration
│   ├── mcp-queries.ts     # [Optional] Frontend-triggered queries (optional)
│   ├── mcp-apps.ts        # [Optional] MCP apps
│   └── <app files>        # Your application code
└── package.json
```

While you can obviously organize your source code however you want, this
file structure helps to things tidy and easily findable. It also re-enforces
the philosophy behind MCP-Web and makes it straight forward to expose frontend
state as MCP tools.:

1. Define state schemas
2. Derive types from those schemas
3. Create declarative state with those types
4. Expose the declarative state as tools using the schemas

::: tip
See our [guide on delcarative reactive state](./declarative-reactive-state.md)
to learn why this approach is working so well.
:::

## Key Files

### 1. `mcp-web.config.js`

Central configuration for your MCP integration:

```javascript
export const MCP_WEB_CONFIG = {
  name: 'My App',
  description: 'Description of what your app does',
  host: 'localhost',
  bridgeUrl: 'localhost:3001',
  autoConnect: true,
  // Optional: for frontend-triggered queries
  agentUrl: 'localhost:3003',
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

While not necessary, it's nice to have a single source of truth for your
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
// Example: React with useState/useRef for simple state
import { useRef, useMemo } from 'react';
import type { Todo } from './types';

// For app-wide state, create a simple store
class TodoStore {
  private todos: Todo[] = [];
  private listeners = new Set<() => void>();

  getTodos() { return this.todos; }
  
  setTodos(todos: Todo[]) {
    this.todos = todos;
    this.notify();
  }

  // Derived state
  getActiveTodos() {
    return this.todos.filter(t => !t.completed);
  }

  getStatistics() {
    return {
      total: this.todos.length,
      completed: this.todos.filter(t => t.completed).length,
    };
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const store = new TodoStore();
```

::: tip
For more complex state, consider using Jotai, Zustand, or your framework's
built-in state management. MCP-Web works with any state solution that provides
get/set access to your data.
:::

### 5. `src/mcp-tools.ts`

Instantiate `MCPWeb` and register tools:

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

### 7. `src/mcp-apps.ts` (Optional)

If you want to [expose visual user interfaces](./visual-tools.md) as
[MCP apps](https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/),
install `@mcp-web/app`, and 

```typescript
import { createApp } from '@mcp-web/app';
import { Statistics, StatisticsPropsSchema } from './components/Statistics';
import { state } from './state';

const store = getDefaultStore();

export const statisticsApp = createApp({
  name: 'statistics',
  description: 'Show a dashboard of plots and charts of the game statistics.',
  component: Statistics,
  propsSchema: StatisticsPropsSchema,
  handler: () => state.statistics,
});
```

::: tip
If you have tools, queries, and apps, it can be useful to organize all three
files under a folder called `mcp`. E.g., `src/mcp/tools.ts`,
`src/mcp/queries.ts`, and `src/mcp/apps.ts`.
:::

### 8. `bridge.ts`

A NodeJS script for running the bridge server:

```typescript
import { MCPWebBridgeNode } from '@mcp-web/bridge';
import { MCP_WEB_CONFIG } from './mcp-web.config';

const bridgeUrl = MCP_WEB_CONFIG.bridgeUrl;
const url = new URL(bridgeUrl.startsWith('http') ? bridgeUrl : `http://${bridgeUrl}`);

const bridge = new MCPWebBridgeNode({
  name: MCP_WEB_CONFIG.name,
  description: MCP_WEB_CONFIG.description,
  port: url.port,
});
```

### 9. `agent.ts` (Optional)

A NodeJS script for starting the AI agent server for
[frontend-triggered AI queries](/frontend-triggered-queries):

```typescript
import { serve } from '@hono/node-server';
import { createAgent } from './agent-app';
import { MCP_WEB_CONFIG } from './mcp-web.config';

const agentUrl = MCP_WEB_CONFIG.agentUrl;
const url = new URL(agentUrl.startsWith('http') ? agentUrl : `http://${agentUrl}`);

const app = createAgent({
  bridgeUrl: MCP_WEB_CONFIG.bridgeUrl,
  // ... AI provider API keys
});

serve({ fetch: app.fetch, port: url.port });
```

::: tip
See the [checkers game demo](https://github.com/anthropics/mcp-web/tree/main/demos/checkers)
for a complete agent server example using Hono and the Vercel AI SDK.
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

::: note Test Remote MCP Locally
You can also test the remote MCP server locally as follows:
1. Install [mkcert](https://github.com/FiloSottile/mkcert) and set it up via `mkcert -instal` to use HTTPS locally.
2. Install [ngrok](https://ngrok.com/) and set it up
3. Start start the frontend dev and bridge servers
4. Start ngrok via `ngrok http https://localhost:3001` and remember the _forwarding URL_ (something like https://bla-blub-jones.ngrok-free.dev)
5. Open the demo, click on the MCP button, and copy the auth token
6. In Claude Desktop (or any other tool supporting remote MCP), add the follwing URL: <FORWARDING_URL>?token=<AUTH_TOKEN>
:::
