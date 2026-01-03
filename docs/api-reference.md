# API Reference

Complete reference for the MCPWeb class and its configuration options.

## MCPWeb Class

The main class for integrating your web application with AI agents via the Model Context Protocol (MCP).

### Constructor

```typescript
new MCPWeb(config: MCPWebConfig)
```

Creates a new MCPWeb instance with the specified configuration.

**Example:**
```typescript
import { MCPWeb } from '@mcp-web/web';

const mcp = new MCPWeb({
  name: 'My Todo App',
  description: 'A todo application that AI agents can control',
  host: 'localhost',
  wsPort: 3001,
  mcpPort: 3002,
  autoConnect: true,
});
```

---

## Configuration

### MCPWebConfig

Configuration object for initializing MCPWeb.

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `name` | `string` | Yes | - | Name of your application, displayed in the AI host app (e.g., Claude Desktop) |
| `description` | `string` | Yes | - | Description of what your web app does and how the AI can control it |
| `host` | `string` | No | `'localhost'` | Hostname of the bridge server |
| `wsPort` | `number` | No | `3001` | WebSocket port for frontend connections (1-65535) |
| `mcpPort` | `number` | No | `3002` | MCP server port for AI agent connections (1-65535) |
| `icon` | `string` | No | - | URL or data URI for the app icon shown in the AI host app |
| `agentUrl` | `string` | No | - | URL of the agent server for frontend-triggered queries |
| `authToken` | `string` | No | auto-generated | Authentication token (auto-generated if not provided) |
| `persistAuthToken` | `boolean` | No | `true` | Whether to persist auth token in localStorage |
| `autoConnect` | `boolean` | No | `true` | Whether to auto-connect to bridge on initialization |

**Example with all options:**
```typescript
const mcp = new MCPWeb({
  name: 'Checkers Game',
  description: 'Interactive checkers game controllable by AI agents',
  host: 'localhost',
  wsPort: 3001,
  mcpPort: 3002,
  icon: 'https://example.com/icon.png',
  agentUrl: 'http://localhost:3003',
  authToken: 'my-secure-token',
  persistAuthToken: true,
  autoConnect: true,
});
```

---

## Connection Methods

### connect()

Establishes connection to the bridge server.

```typescript
await mcp.connect(): Promise<true>
```

Returns a promise that resolves when authenticated and ready.

**Example:**
```typescript
// Manual connection (when autoConnect: false)
await mcp.connect();
console.log('Connected to bridge');
```

### disconnect()

Disconnects from the bridge server.

```typescript
mcp.disconnect(): void
```

**Example:**
```typescript
// Cleanup on component unmount
onUnmounted(() => {
  mcp.disconnect();
});
```

### connected

Check current connection status.

```typescript
mcp.connected: boolean
```

Returns `true` if connected to the bridge server.

**Example:**
```typescript
if (mcp.connected) {
  console.log('Ready to receive tool calls');
}
```

---

## Tool Registration

### addTool()

Register a tool that AI agents can call.

```typescript
mcp.addTool(config: ToolConfig): ToolDefinition
```

Supports both Zod schemas (recommended for type safety) and JSON schemas.

#### ToolConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Unique tool identifier (use snake_case) |
| `description` | `string` | Yes | What the tool does (be descriptive for AI understanding) |
| `handler` | `function` | Yes | Function that executes when tool is called |
| `inputSchema` | `ZodType` or `JSONSchema` | No | Schema for validating input |
| `outputSchema` | `ZodType` or `JSONSchema` | No | Schema for validating output |

**Basic Example:**
```typescript
mcp.addTool({
  name: 'get_current_time',
  description: 'Get the current time in ISO format',
  handler: () => ({ time: new Date().toISOString() }),
});
```

**With Zod Schemas (Recommended):**
```typescript
import { z } from 'zod';

const CreateTodoSchema = z.object({
  title: z.string().describe('Todo title'),
  description: z.string().optional().describe('Optional description'),
});

const TodoSchema = z.object({
  id: z.string().describe('Unique identifier'),
  title: z.string(),
  description: z.string(),
  completed: z.boolean(),
});

mcp.addTool({
  name: 'create_todo',
  description: 'Create a new todo item',
  handler: (input) => {
    const todo = {
      id: crypto.randomUUID(),
      ...input,
      completed: false,
    };
    todos.push(todo);
    return todo;
  },
  inputSchema: CreateTodoSchema,
  outputSchema: TodoSchema,
});
```

**With JSON Schema:**
```typescript
mcp.addTool({
  name: 'search_items',
  description: 'Search for items by keyword',
  handler: ({ keyword }) => {
    return items.filter(item => item.name.includes(keyword));
  },
  inputSchema: {
    type: 'object',
    properties: {
      keyword: { type: 'string', description: 'Search keyword' }
    },
    required: ['keyword']
  },
  outputSchema: {
    type: 'array',
    items: { type: 'object' }
  },
});
```

### addStateTool()

Register tools for getting and setting state.

```typescript
// Without schema decomposition - returns single setter
mcp.addStateTool<T>(config: StateToolConfig): [ToolDefinition, ToolDefinition, () => void]

// With schema decomposition - returns array of setters
mcp.addStateTool<T>(config: StateToolConfig & { schemaSplit: SplitPlan | DecompositionOptions }): [ToolDefinition, ToolDefinition[], () => void]
```

Creates a getter tool (`get_<name>`) and setter tool(s) (`set_<name>`).

**Returns:** Tuple of `[getter, setter(s), cleanup]`
- `[0]` - Getter tool
- `[1]` - Setter tool (single) or array of setter tools (when using `schemaSplit`)
- `[2]` - Cleanup function

#### StateToolConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Base name for the state tools |
| `description` | `string` | Yes | Description of the state |
| `get` | `() => T` | Yes | Function that returns current state |
| `set` | `(value: T) => void` | **Yes** | Function to update state |
| `schema` | `ZodType<T>` | Yes | Zod schema describing the state structure |
| `schemaSplit` | `SplitPlan \| DecompositionOptions` | No | Split large state into multiple focused setters |

**Basic State:**
```typescript
import { z } from 'zod';

const CounterSchema = z.number().describe('Application counter value');
let counter = 0;

const [getCounter, setCounter, cleanup] = mcp.addStateTool({
  name: 'counter',
  description: 'Application counter',
  get: () => counter,
  set: (value) => { counter = value; },
  schema: CounterSchema,
});
// Creates: get_counter, set_counter
```

**With Schema Decomposition:**
```typescript
const GameStateSchema = z.object({
  board: z.array(z.array(z.string())),
  currentPlayer: z.enum(['red', 'black']),
  redScore: z.number(),
  blackScore: z.number(),
  gameStatus: z.enum(['ongoing', 'won', 'draw']),
});

const [getGameState, setGameStateTools] = mcp.addStateTool({
  name: 'game_state',
  description: 'Current game state',
  get: () => gameState,
  set: (value) => { gameState = value; },
  schema: GameStateSchema,
  schemaSplit: [
    'board',                    // Separate setter for board
    ['currentPlayer'],           // Separate setter for current player
    ['redScore', 'blackScore'],  // Combined setter for scores
  ],
});
// setGameStateTools is an array of 3 setters:
// - set_game_state_board
// - set_game_state_current_player
// - set_game_state_scores
```

**Read-Only State:**

For read-only state, use `addTool` directly instead:

```typescript
const ConfigSchema = z.object({
  theme: z.enum(['light', 'dark']),
  language: z.string(),
});

mcp.addTool({
  name: 'get_app_config',
  description: 'Get application configuration',
  handler: () => appConfig,
  outputSchema: ConfigSchema,
});
```

### removeTool()

Remove a registered tool.

```typescript
mcp.removeTool(name: string): void
```

**Example:**
```typescript
// Add a tool
mcp.addTool({
  name: 'temporary_tool',
  description: 'A temporary tool',
  handler: () => ({ result: 'done' }),
});

// Remove it later
mcp.removeTool('temporary_tool');
```

### getTools()

Get list of all registered tool names.

```typescript
mcp.getTools(): string[]
```

**Example:**
```typescript
const toolNames = mcp.getTools();
console.log('Available tools:', toolNames);
// Output: ['get_todos', 'create_todo', 'update_todo', ...]
```

---

## Frontend-Triggered Queries

### query()

Trigger an AI agent query from your frontend code.

```typescript
mcp.query(request: QueryRequest, signal?: AbortSignal): QueryResponse
```

Requires `agentUrl` to be configured in MCPWeb config.

#### QueryRequest

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `prompt` | `string` | Yes | The question or instruction for the AI agent |
| `context` | `ContextItem[]` | No | Additional context (tools or ephemeral data) |
| `responseTool` | `ToolDefinition` | No | Tool that AI must call with its response |
| `timeout` | `number` | No | Query timeout in milliseconds (default: 300000 / 5min) |

#### QueryResponse

The query response is an async iterable that streams events:

```typescript
class QueryResponse {
  uuid: string;                           // Unique query identifier
  cancel(): void;                         // Cancel the query
  [Symbol.asyncIterator](): AsyncIterator<QueryResponseResult>;
}
```

#### QueryResponseResult Types

- `query_accepted`: Query was accepted by the agent
- `query_progress`: Progress update from the agent
- `query_complete`: Query completed successfully
- `query_failure`: Query failed
- `query_cancel`: Query was canceled

**Basic Example:**
```typescript
const query = mcp.query({
  prompt: 'Analyze the current todos and suggest priorities',
});

for await (const event of query) {
  if (event.type === 'query_progress') {
    console.log('Progress:', event.content);
  } else if (event.type === 'query_complete') {
    console.log('Result:', event.result);
  } else if (event.type === 'query_failure') {
    console.error('Error:', event.error);
  }
}
```

**With Context:**
```typescript
// Provide context as ephemeral data
const query = mcp.query({
  prompt: 'What is the best move?',
  context: [
    {
      name: 'current_game_state',
      value: gameState,
      schema: GameStateSchema,
      description: 'Current board position',
    },
  ],
});
```

**With Response Tool:**
```typescript
// Define a tool that the AI must call with its response
const suggestMoveTool = mcp.addTool({
  name: 'suggest_move',
  description: 'Suggest a move on the board',
  handler: (move) => {
    applyMove(move);
    return { success: true };
  },
  inputSchema: MoveSchema,
});

const query = mcp.query({
  prompt: 'Suggest the best move for the current player',
  responseTool: suggestMoveTool,
});

for await (const event of query) {
  if (event.type === 'query_complete') {
    console.log('AI made a move via suggest_move tool');
  }
}
```

**With Cancellation:**
```typescript
const abortController = new AbortController();

const query = mcp.query({
  prompt: 'Long running analysis...',
}, abortController.signal);

// Cancel after 10 seconds
setTimeout(() => abortController.abort(), 10000);

// Or use the cancel method
setTimeout(() => query.cancel(), 10000);
```

---

## Properties

### sessionId

Unique session identifier for this frontend instance.

```typescript
mcp.sessionId: string
```

Persisted in localStorage across page reloads.

**Example:**
```typescript
console.log('Session ID:', mcp.sessionId);
// Output: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### authToken

Authentication token for this session.

```typescript
mcp.authToken: string
```

Auto-generated or from config, persisted in localStorage by default.

**Example:**
```typescript
console.log('Auth token:', mcp.authToken);
```

### config

The processed MCPWeb configuration.

```typescript
mcp.config: MCPWebConfigOutput
```

**Example:**
```typescript
console.log('App name:', mcp.config.name);
console.log('Bridge WS port:', mcp.config.wsPort);
```

### mcpConfig

Configuration object for the AI host app (e.g., Claude Desktop).

```typescript
mcp.mcpConfig: {
  [serverName: string]: {
    command: 'npx';
    args: ['@mcp-web/client'];
    env: {
      MCP_SERVER_URL: string;
      AUTH_TOKEN: string;
    }
  }
}
```

Used to configure the MCP client in your AI host app.

**Example:**
```typescript
console.log('Add this to your Claude Desktop config:');
console.log(JSON.stringify(mcp.mcpConfig, null, 2));
```

### tools

Map of all registered tools.

```typescript
mcp.tools: Map<string, ProcessedToolDefinition>
```

**Example:**
```typescript
// Check if a tool is registered
if (mcp.tools.has('create_todo')) {
  console.log('create_todo is registered');
}

// Get tool definition
const tool = mcp.tools.get('create_todo');
console.log('Tool description:', tool?.description);
```

---

## Best Practices

### Schema Annotations

Use Zod's `.describe()` method extensively for better AI understanding:

```typescript
const TodoSchema = z.object({
  id: z.string().describe('Unique identifier for the todo'),
  title: z.string().min(1).describe('Title of the todo item'),
  completed: z.boolean().describe('Whether the todo is completed'),
  dueDate: z.string().datetime().nullable()
    .describe('ISO 8601 datetime when todo is due, or null if no due date'),
});
```

### Error Handling

Tool handlers should throw errors or return error objects:

```typescript
// Option 1: Throw errors
mcp.addTool({
  name: 'delete_todo',
  handler: ({ id }) => {
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error(`Todo with id ${id} not found`);
    }
    todos.splice(index, 1);
    return { success: true };
  },
});

// Option 2: Return error objects (for union types)
mcp.addTool({
  name: 'make_move',
  handler: (move) => {
    if (!isValidMove(move)) {
      return { error: 'Invalid move' };
    }
    applyMove(move);
    return { success: true };
  },
  outputSchema: z.union([
    z.object({ success: z.boolean() }),
    z.object({ error: z.string() }),
  ]),
});
```

### Cleanup

Use the cleanup function from `addStateTool()` when unmounting:

```typescript
const [getTodos, setTodos, cleanup] = mcp.addStateTool({
  name: 'todos',
  description: 'All todos',
  get: () => todos,
  set: (value) => { todos = value; },
  schema: TodoListSchema,
});

// In component unmount
onUnmounted(() => {
  cleanup();
  mcp.disconnect();
});
```

---

## TypeScript Support

MCPWeb is fully typed with TypeScript. When using Zod schemas, the handler's input/output types are automatically inferred:

```typescript
const InputSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const OutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
});

mcp.addTool({
  name: 'create_user',
  description: 'Create a user',
  // TypeScript knows input is { name: string; age: number }
  handler: (input) => {
    return {
      id: crypto.randomUUID(),
      ...input,
    };
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
});
```
