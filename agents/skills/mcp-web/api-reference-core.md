# MCP-Web

## Classes

### MCPWeb

Defined in: [core/src/web.ts:69](packages/core/src/web.ts#L69)

Main class for integrating web applications with AI agents via the Model Context Protocol (MCP).

MCPWeb enables your web application to expose state and actions as tools that AI agents can
interact with. It handles the WebSocket connection to the bridge server, tool registration,
and bi-directional communication between your frontend and AI agents.

#### Examples

```typescript
import { MCPWeb } from '@mcp-web/core';

const mcp = new MCPWeb({
  name: 'My Todo App',
  description: 'A todo application that AI agents can control',
  autoConnect: true,
});

// Register a tool
mcp.addTool({
  name: 'create_todo',
  description: 'Create a new todo item',
  handler: (input) => {
    const todo = { id: crypto.randomUUID(), ...input };
    todos.push(todo);
    return todo;
  },
});
```

```typescript
const mcp = new MCPWeb({
  name: 'Checkers Game',
  description: 'Interactive checkers game controllable by AI agents',
  host: 'localhost',
  wsPort: 3001,
  mcpPort: 3002,
  icon: 'https://example.com/icon.png',
  agentUrl: 'http://localhost:3003',
  autoConnect: true,
});
```

#### Constructors

##### Constructor

```ts
new MCPWeb(config: {
  agentUrl?: string;
  authToken?: string;
  autoConnect?: boolean;
  description: string;
  host?: string;
  icon?: string;
  maxInFlightQueriesPerToken?: number;
  maxSessionsPerToken?: number;
  mcpPort?: number;
  name: string;
  onSessionLimitExceeded?: "reject" | "close_oldest";
  persistAuthToken?: boolean;
  sessionMaxDurationMs?: number;
  wsPort?: number;
}): MCPWeb;
```

Defined in: [core/src/web.ts:109](packages/core/src/web.ts#L109)

Creates a new MCPWeb instance with the specified configuration.

The constructor initializes the WebSocket connection settings, generates or loads
authentication credentials, and optionally auto-connects to the bridge server.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `config` | \{ `agentUrl?`: `string`; `authToken?`: `string`; `autoConnect?`: `boolean`; `description`: `string`; `host?`: `string`; `icon?`: `string`; `maxInFlightQueriesPerToken?`: `number`; `maxSessionsPerToken?`: `number`; `mcpPort?`: `number`; `name`: `string`; `onSessionLimitExceeded?`: `"reject"` \| `"close_oldest"`; `persistAuthToken?`: `boolean`; `sessionMaxDurationMs?`: `number`; `wsPort?`: `number`; \} | Configuration object for MCPWeb |
| `config.agentUrl?` | `string` | - |
| `config.authToken?` | `string` | - |
| `config.autoConnect?` | `boolean` | - |
| `config.description` | `string` | - |
| `config.host?` | `string` | - |
| `config.icon?` | `string` | - |
| `config.maxInFlightQueriesPerToken?` | `number` | - |
| `config.maxSessionsPerToken?` | `number` | - |
| `config.mcpPort?` | `number` | - |
| `config.name` | `string` | - |
| `config.onSessionLimitExceeded?` | `"reject"` \| `"close_oldest"` | - |
| `config.persistAuthToken?` | `boolean` | - |
| `config.sessionMaxDurationMs?` | `number` | - |
| `config.wsPort?` | `number` | - |

###### Returns

[`MCPWeb`](#mcpweb)

###### Throws

If configuration validation fails

###### Example

```typescript
const mcp = new MCPWeb({
  name: 'My Todo App',
  description: 'A todo application that AI agents can control',
  host: 'localhost',
  wsPort: 3001,
  mcpPort: 3002,
  autoConnect: true,
});
```

#### Accessors

##### authToken

###### Get Signature

```ts
get authToken(): string;
```

Defined in: [core/src/web.ts:152](packages/core/src/web.ts#L152)

Authentication token for this session.

The auth token is either auto-generated, loaded from localStorage, or provided via config.
By default, it's persisted in localStorage to maintain the same token across page reloads.

###### Returns

`string`

The authentication token string

##### config

###### Get Signature

```ts
get config(): {
  agentUrl?: string;
  authToken?: string;
  autoConnect: boolean;
  description: string;
  host: string;
  icon?: string;
  maxInFlightQueriesPerToken?: number;
  maxSessionsPerToken?: number;
  mcpPort: number;
  name: string;
  onSessionLimitExceeded: "reject" | "close_oldest";
  persistAuthToken: boolean;
  sessionMaxDurationMs?: number;
  wsPort: number;
};
```

Defined in: [core/src/web.ts:174](packages/core/src/web.ts#L174)

The processed MCPWeb configuration.

Returns the validated and processed configuration with all defaults applied.

###### Returns

```ts
{
  agentUrl?: string;
  authToken?: string;
  autoConnect: boolean;
  description: string;
  host: string;
  icon?: string;
  maxInFlightQueriesPerToken?: number;
  maxSessionsPerToken?: number;
  mcpPort: number;
  name: string;
  onSessionLimitExceeded: "reject" | "close_oldest";
  persistAuthToken: boolean;
  sessionMaxDurationMs?: number;
  wsPort: number;
}
```

The complete configuration object

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `agentUrl?` | `string` | types/dist/config.d.ts:9 |
| `authToken?` | `string` | types/dist/config.d.ts:10 |
| `autoConnect` | `boolean` | types/dist/config.d.ts:12 |
| `description` | `string` | types/dist/config.d.ts:4 |
| `host` | `string` | types/dist/config.d.ts:5 |
| `icon?` | `string` | types/dist/config.d.ts:8 |
| `maxInFlightQueriesPerToken?` | `number` | types/dist/config.d.ts:18 |
| `maxSessionsPerToken?` | `number` | types/dist/config.d.ts:13 |
| `mcpPort` | `number` | types/dist/config.d.ts:7 |
| `name` | `string` | types/dist/config.d.ts:3 |
| `onSessionLimitExceeded` | `"reject"` \| `"close_oldest"` | types/dist/config.d.ts:14 |
| `persistAuthToken` | `boolean` | types/dist/config.d.ts:11 |
| `sessionMaxDurationMs?` | `number` | types/dist/config.d.ts:19 |
| `wsPort` | `number` | types/dist/config.d.ts:6 |

##### connected

###### Get Signature

```ts
get connected(): boolean;
```

Defined in: [core/src/web.ts:979](packages/core/src/web.ts#L979)

Whether the client is currently connected to the bridge server.

###### Example

```typescript
if (mcp.connected) {
  console.log('Ready to receive tool calls');
} else {
  await mcp.connect();
}
```

###### Returns

`boolean`

`true` if connected, `false` otherwise

##### mcpConfig

###### Get Signature

```ts
get mcpConfig(): {
[serverName: string]: {
  args: ["@mcp-web/client"];
  command: "npx";
  env: {
     AUTH_TOKEN: string;
     MCP_SERVER_URL: string;
  };
};
};
```

Defined in: [core/src/web.ts:193](packages/core/src/web.ts#L193)

Configuration object for the AI host app (e.g., Claude Desktop).

Use this to configure the MCP client in your AI host application.
It contains the connection details and authentication credentials needed
for the AI agent to connect to the bridge server.

###### Example

```typescript
console.log('Add this to your Claude Desktop config:');
console.log(JSON.stringify(mcp.mcpConfig, null, 2));
```

###### Returns

```ts
{
[serverName: string]: {
  args: ["@mcp-web/client"];
  command: "npx";
  env: {
     AUTH_TOKEN: string;
     MCP_SERVER_URL: string;
  };
};
}
```

MCP client configuration object

##### sessionId

###### Get Signature

```ts
get sessionId(): string;
```

Defined in: [core/src/web.ts:140](packages/core/src/web.ts#L140)

Unique session identifier for this frontend instance.

The session ID is automatically generated and persisted in localStorage across page reloads.
It's used to identify this specific frontend instance in the bridge server.

###### Returns

`string`

The session ID string

##### tools

###### Get Signature

```ts
get tools(): Map<string, ProcessedToolDefinition>;
```

Defined in: [core/src/web.ts:163](packages/core/src/web.ts#L163)

Map of all registered tools.

Provides access to the internal tool registry. Each tool is keyed by its name.

###### Returns

`Map`\<`string`, `ProcessedToolDefinition`\>

Map of tool names to processed tool definitions

#### Methods

##### addStateTools()

###### Call Signature

```ts
addStateTools<T>(created: CreatedStateTools<T> & {
  isExpanded: false;
}): [ToolDefinition, ToolDefinition, () => void];
```

Defined in: [core/src/web.ts:759](packages/core/src/web.ts#L759)

Add state management tools with optional expanded tool generation.
When `expand` is true, automatically generates targeted tools for
arrays and records instead of a single setter.

Can also accept pre-created state tools from `createStateTools()`.

###### Type Parameters

| Type Parameter |
| ------ |
| `T` |

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `created` | [`CreatedStateTools`](#createdstatetools)\<`T`\> & \{ `isExpanded`: `false`; \} |

###### Returns

\[`ToolDefinition`, `ToolDefinition`, () => `void`\]

Tuple of [getter tool, setter tool(s), cleanup function]
- Without schemaSplit and expand: [ToolDefinition, ToolDefinition, () => void]
- With schemaSplit or expand: [ToolDefinition, ToolDefinition[], () => void]

###### Example

```typescript
// Basic read-write state (returns single setter)
const [getTodos, setTodos, cleanup] = mcp.addStateTools({
  name: 'todos',
  description: 'List of all todos',
  get: () => todos,
  set: (val) => { todos = val },
  schema: TodoListSchema
});

// With pre-created state tools
import { createStateTools } from '@mcp-web/core';

const todoTools = createStateTools({
  name: 'todos',
  description: 'Todo list',
  get: () => store.get(todosAtom),
  set: (value) => store.set(todosAtom, value),
  schema: TodosSchema,
  expand: true,
});

const [getter, setters, cleanup] = mcp.addStateTools(todoTools);

// With schema decomposition (returns array of setters)
const [getGameState, setters, cleanup] = mcp.addStateTools({
  name: 'game_state',
  description: 'Game board state',
  get: () => gameState,
  set: (val) => { gameState = val },
  schema: GameStateSchema,
  schemaSplit: ['board', ['currentPlayer'], ['redScore', 'blackScore']]
});

// With expanded tools for collections (returns array of setters)
const [getApp, tools, cleanup] = mcp.addStateTools({
  name: 'app',
  description: 'App state',
  get: () => appState,
  set: (val) => { appState = val },
  schema: AppSchema,
  expand: true
});
```

###### Call Signature

```ts
addStateTools<T>(created: CreatedStateTools<T> & {
  isExpanded: true;
}): [ToolDefinition, ToolDefinition[], () => void];
```

Defined in: [core/src/web.ts:761](packages/core/src/web.ts#L761)

Add state management tools with optional expanded tool generation.
When `expand` is true, automatically generates targeted tools for
arrays and records instead of a single setter.

Can also accept pre-created state tools from `createStateTools()`.

###### Type Parameters

| Type Parameter |
| ------ |
| `T` |

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `created` | [`CreatedStateTools`](#createdstatetools)\<`T`\> & \{ `isExpanded`: `true`; \} |

###### Returns

\[`ToolDefinition`, `ToolDefinition`[], () => `void`\]

Tuple of [getter tool, setter tool(s), cleanup function]
- Without schemaSplit and expand: [ToolDefinition, ToolDefinition, () => void]
- With schemaSplit or expand: [ToolDefinition, ToolDefinition[], () => void]

###### Example

```typescript
// Basic read-write state (returns single setter)
const [getTodos, setTodos, cleanup] = mcp.addStateTools({
  name: 'todos',
  description: 'List of all todos',
  get: () => todos,
  set: (val) => { todos = val },
  schema: TodoListSchema
});

// With pre-created state tools
import { createStateTools } from '@mcp-web/core';

const todoTools = createStateTools({
  name: 'todos',
  description: 'Todo list',
  get: () => store.get(todosAtom),
  set: (value) => store.set(todosAtom, value),
  schema: TodosSchema,
  expand: true,
});

const [getter, setters, cleanup] = mcp.addStateTools(todoTools);

// With schema decomposition (returns array of setters)
const [getGameState, setters, cleanup] = mcp.addStateTools({
  name: 'game_state',
  description: 'Game board state',
  get: () => gameState,
  set: (val) => { gameState = val },
  schema: GameStateSchema,
  schemaSplit: ['board', ['currentPlayer'], ['redScore', 'blackScore']]
});

// With expanded tools for collections (returns array of setters)
const [getApp, tools, cleanup] = mcp.addStateTools({
  name: 'app',
  description: 'App state',
  get: () => appState,
  set: (val) => { appState = val },
  schema: AppSchema,
  expand: true
});
```

###### Call Signature

```ts
addStateTools<T>(created: CreatedStateTools<T>): [ToolDefinition, ToolDefinition | ToolDefinition[], () => void];
```

Defined in: [core/src/web.ts:763](packages/core/src/web.ts#L763)

Add state management tools with optional expanded tool generation.
When `expand` is true, automatically generates targeted tools for
arrays and records instead of a single setter.

Can also accept pre-created state tools from `createStateTools()`.

###### Type Parameters

| Type Parameter |
| ------ |
| `T` |

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `created` | [`CreatedStateTools`](#createdstatetools)\<`T`\> |

###### Returns

\[`ToolDefinition`, `ToolDefinition` \| `ToolDefinition`[], () => `void`\]

Tuple of [getter tool, setter tool(s), cleanup function]
- Without schemaSplit and expand: [ToolDefinition, ToolDefinition, () => void]
- With schemaSplit or expand: [ToolDefinition, ToolDefinition[], () => void]

###### Example

```typescript
// Basic read-write state (returns single setter)
const [getTodos, setTodos, cleanup] = mcp.addStateTools({
  name: 'todos',
  description: 'List of all todos',
  get: () => todos,
  set: (val) => { todos = val },
  schema: TodoListSchema
});

// With pre-created state tools
import { createStateTools } from '@mcp-web/core';

const todoTools = createStateTools({
  name: 'todos',
  description: 'Todo list',
  get: () => store.get(todosAtom),
  set: (value) => store.set(todosAtom, value),
  schema: TodosSchema,
  expand: true,
});

const [getter, setters, cleanup] = mcp.addStateTools(todoTools);

// With schema decomposition (returns array of setters)
const [getGameState, setters, cleanup] = mcp.addStateTools({
  name: 'game_state',
  description: 'Game board state',
  get: () => gameState,
  set: (val) => { gameState = val },
  schema: GameStateSchema,
  schemaSplit: ['board', ['currentPlayer'], ['redScore', 'blackScore']]
});

// With expanded tools for collections (returns array of setters)
const [getApp, tools, cleanup] = mcp.addStateTools({
  name: 'app',
  description: 'App state',
  get: () => appState,
  set: (val) => { appState = val },
  schema: AppSchema,
  expand: true
});
```

###### Call Signature

```ts
addStateTools<T>(options: {
  description: string;
  expand?: false;
  get: () => T;
  name: string;
  schema: ZodType<T>;
  schemaSplit?: undefined;
  set: (value: T) => void;
}): [ToolDefinition, ToolDefinition, () => void];
```

Defined in: [core/src/web.ts:765](packages/core/src/web.ts#L765)

Add state management tools with optional expanded tool generation.
When `expand` is true, automatically generates targeted tools for
arrays and records instead of a single setter.

Can also accept pre-created state tools from `createStateTools()`.

###### Type Parameters

| Type Parameter |
| ------ |
| `T` |

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `description`: `string`; `expand?`: `false`; `get`: () => `T`; `name`: `string`; `schema`: `ZodType`\<`T`\>; `schemaSplit?`: `undefined`; `set`: (`value`: `T`) => `void`; \} |
| `options.description` | `string` |
| `options.expand?` | `false` |
| `options.get` | () => `T` |
| `options.name` | `string` |
| `options.schema` | `ZodType`\<`T`\> |
| `options.schemaSplit?` | `undefined` |
| `options.set` | (`value`: `T`) => `void` |

###### Returns

\[`ToolDefinition`, `ToolDefinition`, () => `void`\]

Tuple of [getter tool, setter tool(s), cleanup function]
- Without schemaSplit and expand: [ToolDefinition, ToolDefinition, () => void]
- With schemaSplit or expand: [ToolDefinition, ToolDefinition[], () => void]

###### Example

```typescript
// Basic read-write state (returns single setter)
const [getTodos, setTodos, cleanup] = mcp.addStateTools({
  name: 'todos',
  description: 'List of all todos',
  get: () => todos,
  set: (val) => { todos = val },
  schema: TodoListSchema
});

// With pre-created state tools
import { createStateTools } from '@mcp-web/core';

const todoTools = createStateTools({
  name: 'todos',
  description: 'Todo list',
  get: () => store.get(todosAtom),
  set: (value) => store.set(todosAtom, value),
  schema: TodosSchema,
  expand: true,
});

const [getter, setters, cleanup] = mcp.addStateTools(todoTools);

// With schema decomposition (returns array of setters)
const [getGameState, setters, cleanup] = mcp.addStateTools({
  name: 'game_state',
  description: 'Game board state',
  get: () => gameState,
  set: (val) => { gameState = val },
  schema: GameStateSchema,
  schemaSplit: ['board', ['currentPlayer'], ['redScore', 'blackScore']]
});

// With expanded tools for collections (returns array of setters)
const [getApp, tools, cleanup] = mcp.addStateTools({
  name: 'app',
  description: 'App state',
  get: () => appState,
  set: (val) => { appState = val },
  schema: AppSchema,
  expand: true
});
```

###### Call Signature

```ts
addStateTools<T>(options: {
  description: string;
  expand?: boolean;
  get: () => T;
  name: string;
  schema: ZodType<T>;
  schemaSplit: SplitPlan;
  set: (value: T) => void;
}): [ToolDefinition, ToolDefinition[], () => void];
```

Defined in: [core/src/web.ts:775](packages/core/src/web.ts#L775)

Add state management tools with optional expanded tool generation.
When `expand` is true, automatically generates targeted tools for
arrays and records instead of a single setter.

Can also accept pre-created state tools from `createStateTools()`.

###### Type Parameters

| Type Parameter |
| ------ |
| `T` |

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `description`: `string`; `expand?`: `boolean`; `get`: () => `T`; `name`: `string`; `schema`: `ZodType`\<`T`\>; `schemaSplit`: `SplitPlan`; `set`: (`value`: `T`) => `void`; \} |
| `options.description` | `string` |
| `options.expand?` | `boolean` |
| `options.get` | () => `T` |
| `options.name` | `string` |
| `options.schema` | `ZodType`\<`T`\> |
| `options.schemaSplit` | `SplitPlan` |
| `options.set` | (`value`: `T`) => `void` |

###### Returns

\[`ToolDefinition`, `ToolDefinition`[], () => `void`\]

Tuple of [getter tool, setter tool(s), cleanup function]
- Without schemaSplit and expand: [ToolDefinition, ToolDefinition, () => void]
- With schemaSplit or expand: [ToolDefinition, ToolDefinition[], () => void]

###### Example

```typescript
// Basic read-write state (returns single setter)
const [getTodos, setTodos, cleanup] = mcp.addStateTools({
  name: 'todos',
  description: 'List of all todos',
  get: () => todos,
  set: (val) => { todos = val },
  schema: TodoListSchema
});

// With pre-created state tools
import { createStateTools } from '@mcp-web/core';

const todoTools = createStateTools({
  name: 'todos',
  description: 'Todo list',
  get: () => store.get(todosAtom),
  set: (value) => store.set(todosAtom, value),
  schema: TodosSchema,
  expand: true,
});

const [getter, setters, cleanup] = mcp.addStateTools(todoTools);

// With schema decomposition (returns array of setters)
const [getGameState, setters, cleanup] = mcp.addStateTools({
  name: 'game_state',
  description: 'Game board state',
  get: () => gameState,
  set: (val) => { gameState = val },
  schema: GameStateSchema,
  schemaSplit: ['board', ['currentPlayer'], ['redScore', 'blackScore']]
});

// With expanded tools for collections (returns array of setters)
const [getApp, tools, cleanup] = mcp.addStateTools({
  name: 'app',
  description: 'App state',
  get: () => appState,
  set: (val) => { appState = val },
  schema: AppSchema,
  expand: true
});
```

###### Call Signature

```ts
addStateTools<T>(options: {
  description: string;
  expand: true;
  get: () => T;
  name: string;
  schema: ZodType<T>;
  schemaSplit?: SplitPlan;
  set: (value: T) => void;
}): [ToolDefinition, ToolDefinition[], () => void];
```

Defined in: [core/src/web.ts:784](packages/core/src/web.ts#L784)

Add state management tools with optional expanded tool generation.
When `expand` is true, automatically generates targeted tools for
arrays and records instead of a single setter.

Can also accept pre-created state tools from `createStateTools()`.

###### Type Parameters

| Type Parameter |
| ------ |
| `T` |

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `description`: `string`; `expand`: `true`; `get`: () => `T`; `name`: `string`; `schema`: `ZodType`\<`T`\>; `schemaSplit?`: `SplitPlan`; `set`: (`value`: `T`) => `void`; \} |
| `options.description` | `string` |
| `options.expand` | `true` |
| `options.get` | () => `T` |
| `options.name` | `string` |
| `options.schema` | `ZodType`\<`T`\> |
| `options.schemaSplit?` | `SplitPlan` |
| `options.set` | (`value`: `T`) => `void` |

###### Returns

\[`ToolDefinition`, `ToolDefinition`[], () => `void`\]

Tuple of [getter tool, setter tool(s), cleanup function]
- Without schemaSplit and expand: [ToolDefinition, ToolDefinition, () => void]
- With schemaSplit or expand: [ToolDefinition, ToolDefinition[], () => void]

###### Example

```typescript
// Basic read-write state (returns single setter)
const [getTodos, setTodos, cleanup] = mcp.addStateTools({
  name: 'todos',
  description: 'List of all todos',
  get: () => todos,
  set: (val) => { todos = val },
  schema: TodoListSchema
});

// With pre-created state tools
import { createStateTools } from '@mcp-web/core';

const todoTools = createStateTools({
  name: 'todos',
  description: 'Todo list',
  get: () => store.get(todosAtom),
  set: (value) => store.set(todosAtom, value),
  schema: TodosSchema,
  expand: true,
});

const [getter, setters, cleanup] = mcp.addStateTools(todoTools);

// With schema decomposition (returns array of setters)
const [getGameState, setters, cleanup] = mcp.addStateTools({
  name: 'game_state',
  description: 'Game board state',
  get: () => gameState,
  set: (val) => { gameState = val },
  schema: GameStateSchema,
  schemaSplit: ['board', ['currentPlayer'], ['redScore', 'blackScore']]
});

// With expanded tools for collections (returns array of setters)
const [getApp, tools, cleanup] = mcp.addStateTools({
  name: 'app',
  description: 'App state',
  get: () => appState,
  set: (val) => { appState = val },
  schema: AppSchema,
  expand: true
});
```

##### addTool()

###### Call Signature

```ts
addTool<TInput, TOutput>(tool: CreatedTool<TInput, TOutput>): ToolDefinition;
```

Defined in: [core/src/web.ts:606](packages/core/src/web.ts#L606)

Registers a tool that AI agents can call.

Supports both Zod schemas (recommended for type safety) and JSON schemas.
When using Zod schemas, TypeScript enforces that your handler signature matches the schemas.

Can also accept pre-created tools from `createTool()`.

###### Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TInput` *extends* `ZodObject`\<`$ZodLooseShape`, `$strip`\> \| `undefined` | `undefined` |
| `TOutput` *extends* \| `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> \| `undefined` | `undefined` |

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tool` | [`CreatedTool`](#createdtool)\<`TInput`, `TOutput`\> | Tool configuration including name, description, handler, and schemas, or a CreatedTool |

###### Returns

`ToolDefinition`

The registered tool definition that can be used as context or responseTool in queries

###### Throws

If tool definition is invalid

###### Examples

```typescript
mcp.addTool({
  name: 'get_current_time',
  description: 'Get the current time in ISO format',
  handler: () => ({ time: new Date().toISOString() }),
});
```

```typescript
import { createTool } from '@mcp-web/core';

const timeTool = createTool({
  name: 'get_current_time',
  description: 'Get the current time',
  handler: () => ({ time: new Date().toISOString() }),
});

mcp.addTool(timeTool);
```

```typescript
import { z } from 'zod';

const CreateTodoSchema = z.object({
  title: z.string().describe('Todo title'),
  description: z.string().optional().describe('Optional description'),
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
  outputSchema: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    completed: z.boolean(),
  }),
});
```

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
});
```

###### Call Signature

```ts
addTool<TInput, TOutput>(tool: {
  description: string;
  handler: TInput extends ZodObject<$ZodLooseShape, $strip> ? (input: output<TInput<TInput>>) => TOutput extends ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>> ? 
     | output<TOutput<TOutput>>
     | Promise<output<TOutput<TOutput>>> : void | Promise<void> : TOutput extends ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>> ? () => 
     | output<TOutput<TOutput>>
    | Promise<output<TOutput<TOutput>>> : () => void | Promise<void>;
  inputSchema?: TInput;
  name: string;
  outputSchema?: TOutput;
}): ToolDefinition;
```

Defined in: [core/src/web.ts:612](packages/core/src/web.ts#L612)

Registers a tool that AI agents can call.

Supports both Zod schemas (recommended for type safety) and JSON schemas.
When using Zod schemas, TypeScript enforces that your handler signature matches the schemas.

Can also accept pre-created tools from `createTool()`.

###### Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TInput` *extends* `ZodObject`\<`$ZodLooseShape`, `$strip`\> \| `undefined` | `undefined` |
| `TOutput` *extends* \| `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> \| `undefined` | `undefined` |

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tool` | \{ `description`: `string`; `handler`: `TInput` *extends* `ZodObject`\<`$ZodLooseShape`, `$strip`\> ? (`input`: `output`\<`TInput`\<`TInput`\>\>) => `TOutput` *extends* `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> ? \| `output`\<`TOutput`\<`TOutput`\>\> \| `Promise`\<`output`\<`TOutput`\<`TOutput`\>\>\> : `void` \| `Promise`\<`void`\> : `TOutput` *extends* `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> ? () => \| `output`\<`TOutput`\<`TOutput`\>\> \| `Promise`\<`output`\<`TOutput`\<`TOutput`\>\>\> : () => `void` \| `Promise`\<`void`\>; `inputSchema?`: `TInput`; `name`: `string`; `outputSchema?`: `TOutput`; \} | Tool configuration including name, description, handler, and schemas, or a CreatedTool |
| `tool.description` | `string` | - |
| `tool.handler` | `TInput` *extends* `ZodObject`\<`$ZodLooseShape`, `$strip`\> ? (`input`: `output`\<`TInput`\<`TInput`\>\>) => `TOutput` *extends* `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> ? \| `output`\<`TOutput`\<`TOutput`\>\> \| `Promise`\<`output`\<`TOutput`\<`TOutput`\>\>\> : `void` \| `Promise`\<`void`\> : `TOutput` *extends* `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> ? () => \| `output`\<`TOutput`\<`TOutput`\>\> \| `Promise`\<`output`\<`TOutput`\<`TOutput`\>\>\> : () => `void` \| `Promise`\<`void`\> | - |
| `tool.inputSchema?` | `TInput` | - |
| `tool.name` | `string` | - |
| `tool.outputSchema?` | `TOutput` | - |

###### Returns

`ToolDefinition`

The registered tool definition that can be used as context or responseTool in queries

###### Throws

If tool definition is invalid

###### Examples

```typescript
mcp.addTool({
  name: 'get_current_time',
  description: 'Get the current time in ISO format',
  handler: () => ({ time: new Date().toISOString() }),
});
```

```typescript
import { createTool } from '@mcp-web/core';

const timeTool = createTool({
  name: 'get_current_time',
  description: 'Get the current time',
  handler: () => ({ time: new Date().toISOString() }),
});

mcp.addTool(timeTool);
```

```typescript
import { z } from 'zod';

const CreateTodoSchema = z.object({
  title: z.string().describe('Todo title'),
  description: z.string().optional().describe('Optional description'),
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
  outputSchema: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    completed: z.boolean(),
  }),
});
```

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
});
```

###### Call Signature

```ts
addTool(tool: {
  description: string;
  handler: (input?: unknown) => unknown;
  inputSchema?: {
   [key: string]: unknown;
     type: string;
  };
  name: string;
  outputSchema?: {
   [key: string]: unknown;
     type: string;
  };
}): ToolDefinition;
```

Defined in: [core/src/web.ts:631](packages/core/src/web.ts#L631)

Registers a tool that AI agents can call.

Supports both Zod schemas (recommended for type safety) and JSON schemas.
When using Zod schemas, TypeScript enforces that your handler signature matches the schemas.

Can also accept pre-created tools from `createTool()`.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tool` | \{ `description`: `string`; `handler`: (`input?`: `unknown`) => `unknown`; `inputSchema?`: \{ \[`key`: `string`\]: `unknown`; `type`: `string`; \}; `name`: `string`; `outputSchema?`: \{ \[`key`: `string`\]: `unknown`; `type`: `string`; \}; \} | Tool configuration including name, description, handler, and schemas, or a CreatedTool |
| `tool.description` | `string` | - |
| `tool.handler` | (`input?`: `unknown`) => `unknown` | - |
| `tool.inputSchema?` | \{ \[`key`: `string`\]: `unknown`; `type`: `string`; \} | - |
| `tool.inputSchema.type` | `string` | - |
| `tool.name` | `string` | - |
| `tool.outputSchema?` | \{ \[`key`: `string`\]: `unknown`; `type`: `string`; \} | - |
| `tool.outputSchema.type` | `string` | - |

###### Returns

`ToolDefinition`

The registered tool definition that can be used as context or responseTool in queries

###### Throws

If tool definition is invalid

###### Examples

```typescript
mcp.addTool({
  name: 'get_current_time',
  description: 'Get the current time in ISO format',
  handler: () => ({ time: new Date().toISOString() }),
});
```

```typescript
import { createTool } from '@mcp-web/core';

const timeTool = createTool({
  name: 'get_current_time',
  description: 'Get the current time',
  handler: () => ({ time: new Date().toISOString() }),
});

mcp.addTool(timeTool);
```

```typescript
import { z } from 'zod';

const CreateTodoSchema = z.object({
  title: z.string().describe('Todo title'),
  description: z.string().optional().describe('Optional description'),
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
  outputSchema: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    completed: z.boolean(),
  }),
});
```

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
});
```

##### connect()

```ts
connect(): Promise<true>;
```

Defined in: [core/src/web.ts:295](packages/core/src/web.ts#L295)

Establishes connection to the bridge server.

Opens a WebSocket connection to the bridge server and authenticates using the session's
auth token. If `autoConnect` is enabled in the config, this is called automatically
during construction.

This method is idempotent - calling it multiple times while already connected or
connecting will return the same promise.

###### Returns

`Promise`\<`true`\>

Promise that resolves to `true` when authenticated and ready

###### Throws

If WebSocket connection fails

###### Examples

```typescript
const mcp = new MCPWeb({
  name: 'My App',
  description: 'My application',
  autoConnect: false,  // Disable auto-connect
});

// Connect when ready
await mcp.connect();
console.log('Connected to bridge');
```

```typescript
if (!mcp.connected) {
  await mcp.connect();
}
```

##### disconnect()

```ts
disconnect(): void;
```

Defined in: [core/src/web.ts:997](packages/core/src/web.ts#L997)

Disconnects from the bridge server.

Closes the WebSocket connection and cleans up event handlers.
Useful for cleanup when unmounting components or closing the application.

###### Returns

`void`

###### Example

```typescript
// In a Vue component lifecycle hook
onUnmounted(() => {
  mcp.disconnect();
});
```

##### getTools()

```ts
getTools(): string[];
```

Defined in: [core/src/web.ts:1020](packages/core/src/web.ts#L1020)

Gets list of all registered tool names.

###### Returns

`string`[]

Array of tool names

###### Example

```typescript
const toolNames = mcp.getTools();
console.log('Available tools:', toolNames);
```

##### query()

```ts
query(request: QueryRequest, signal?: AbortSignal): QueryResponse;
```

Defined in: [core/src/web.ts:1072](packages/core/src/web.ts#L1072)

Triggers an AI agent query from your frontend code.

Requires `agentUrl` to be configured in MCPWeb config. Sends a query to the AI agent
and returns a QueryResponse object that can be iterated to stream events.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`QueryRequest`](#queryrequest) | Query request with prompt and optional context |
| `signal?` | `AbortSignal` | Optional AbortSignal for canceling the query |

###### Returns

[`QueryResponse`](#queryresponse)

QueryResponse object that streams events

###### Throws

If `agentUrl` is not configured or not connected to bridge

###### Examples

```typescript
const query = mcp.query({
  prompt: 'Analyze the current todos and suggest priorities',
});

for await (const event of query) {
  if (event.type === 'query_complete') {
    console.log('Result:', event.result);
  }
}
```

```typescript
const query = mcp.query({
  prompt: 'Update the todo with highest priority',
  context: [todosTool],  // Provide specific tools as context
});

for await (const event of query) {
  console.log('Event:', event);
}
```

```typescript
const abortController = new AbortController();
const query = mcp.query(
  { prompt: 'Long running task' },
  abortController.signal
);

// Cancel after 5 seconds
setTimeout(() => abortController.abort(), 5000);
```

##### removeTool()

```ts
removeTool(name: string): void;
```

Defined in: [core/src/web.ts:697](packages/core/src/web.ts#L697)

Removes a registered tool.

After removal, AI agents will no longer be able to call this tool.
Useful for dynamically disabling features or cleaning up when tools are no longer needed.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `name` | `string` | Name of the tool to remove |

###### Returns

`void`

###### Example

```typescript
// Remove a specific tool
mcp.removeTool('create_todo');
```

***

### QueryResponse

Defined in: [core/src/query.ts:3](packages/core/src/query.ts#L3)

#### Constructors

##### Constructor

```ts
new QueryResponse(
   uuid: string, 
   stream: AsyncIterableIterator<
  | {
  type: "query_accepted";
  uuid: string;
}
  | {
  message: string;
  type: "query_progress";
  uuid: string;
}
  | {
  message?: string;
  toolCalls: {
     arguments: unknown;
     result: unknown;
     tool: string;
  }[];
  type: "query_complete";
  uuid: string;
}
  | {
  error: string;
  type: "query_failure";
  uuid: string;
}
  | {
  reason?: string;
  type: "query_cancel";
  uuid: string;
}>, 
   cancelFn?: () => void): QueryResponse;
```

Defined in: [core/src/query.ts:8](packages/core/src/query.ts#L8)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `uuid` | `string` |
| `stream` | `AsyncIterableIterator`\< \| \{ `type`: `"query_accepted"`; `uuid`: `string`; \} \| \{ `message`: `string`; `type`: `"query_progress"`; `uuid`: `string`; \} \| \{ `message?`: `string`; `toolCalls`: \{ `arguments`: `unknown`; `result`: `unknown`; `tool`: `string`; \}[]; `type`: `"query_complete"`; `uuid`: `string`; \} \| \{ `error`: `string`; `type`: `"query_failure"`; `uuid`: `string`; \} \| \{ `reason?`: `string`; `type`: `"query_cancel"`; `uuid`: `string`; \}\> |
| `cancelFn?` | () => `void` |

###### Returns

[`QueryResponse`](#queryresponse)

#### Accessors

##### result

###### Get Signature

```ts
get result(): Promise<
  | {
  message?: string;
  toolCalls: {
     arguments: unknown;
     result: unknown;
     tool: string;
  }[];
  type: "query_complete";
  uuid: string;
}
  | {
  error: string;
  type: "query_failure";
  uuid: string;
}>;
```

Defined in: [core/src/query.ts:52](packages/core/src/query.ts#L52)

Simplified interface: just get the final result
Waits for query completion and returns the result or throws on failure

###### Example

```typescript
try {
  const result = await query.result;
  console.log('Query completed:', result);
} catch (error) {
  console.error('Query failed:', error);
}
```

###### Returns

`Promise`\<
  \| \{
  `message?`: `string`;
  `toolCalls`: \{
     `arguments`: `unknown`;
     `result`: `unknown`;
     `tool`: `string`;
  \}[];
  `type`: `"query_complete"`;
  `uuid`: `string`;
\}
  \| \{
  `error`: `string`;
  `type`: `"query_failure"`;
  `uuid`: `string`;
\}\>

##### stream

###### Get Signature

```ts
get stream(): AsyncIterableIterator<
  | {
  type: "query_accepted";
  uuid: string;
}
  | {
  message: string;
  type: "query_progress";
  uuid: string;
}
  | {
  message?: string;
  toolCalls: {
     arguments: unknown;
     result: unknown;
     tool: string;
  }[];
  type: "query_complete";
  uuid: string;
}
  | {
  error: string;
  type: "query_failure";
  uuid: string;
}
  | {
  reason?: string;
  type: "query_cancel";
  uuid: string;
}>;
```

Defined in: [core/src/query.ts:34](packages/core/src/query.ts#L34)

Stream of query events (progress, completion, failure)
Use this for fine-grained control over query lifecycle

###### Example

```typescript
for await (const event of query.stream) {
  if (event.type === 'query_progress') {
    console.log(event.message);
  }
}
```

###### Returns

`AsyncIterableIterator`\<
  \| \{
  `type`: `"query_accepted"`;
  `uuid`: `string`;
\}
  \| \{
  `message`: `string`;
  `type`: `"query_progress"`;
  `uuid`: `string`;
\}
  \| \{
  `message?`: `string`;
  `toolCalls`: \{
     `arguments`: `unknown`;
     `result`: `unknown`;
     `tool`: `string`;
  \}[];
  `type`: `"query_complete"`;
  `uuid`: `string`;
\}
  \| \{
  `error`: `string`;
  `type`: `"query_failure"`;
  `uuid`: `string`;
\}
  \| \{
  `reason?`: `string`;
  `type`: `"query_cancel"`;
  `uuid`: `string`;
\}\>

##### uuid

###### Get Signature

```ts
get uuid(): string;
```

Defined in: [core/src/query.ts:17](packages/core/src/query.ts#L17)

The unique identifier for this query

###### Returns

`string`

#### Methods

##### cancel()

```ts
cancel(): void;
```

Defined in: [core/src/query.ts:67](packages/core/src/query.ts#L67)

Cancel this query
Triggers cancellation either via AbortController or directly through the bridge

###### Returns

`void`

## Interfaces

### CreatedStateToolsBasic

Defined in: [core/src/create-state-tools.ts:32](packages/core/src/create-state-tools.ts#L32)

Result type for created state tools without schemaSplit or expand.
Returns a single getter and single setter.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="__brand"></a> `__brand` | `readonly` | `"CreatedStateTools"` | Marker to identify this as created state tools. | [core/src/create-state-tools.ts:34](packages/core/src/create-state-tools.ts#L34) |
| <a id="config-1"></a> `config` | `readonly` | [`CreateStateToolsConfig`](#createstatetoolsconfig)\<`T`\> | The original config. | [core/src/create-state-tools.ts:42](packages/core/src/create-state-tools.ts#L42) |
| <a id="getter"></a> `getter` | `readonly` | \{ `description`: `string`; `handler`: (...`args`: `any`[]) => `any`; `inputSchema?`: `ZodObject`\<`$ZodLooseShape`, `$strip`\>; `name`: `string`; `outputSchema?`: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \} | The getter tool definition. | [core/src/create-state-tools.ts:36](packages/core/src/create-state-tools.ts#L36) |
| `getter.description` | `public` | `string` | - | types/dist/tools.d.ts:14 |
| `getter.handler` | `public` | (...`args`: `any`[]) => `any` | - | types/dist/tools.d.ts:15 |
| `getter.inputSchema?` | `public` | `ZodObject`\<`$ZodLooseShape`, `$strip`\> | - | types/dist/tools.d.ts:16 |
| `getter.name` | `public` | `string` | - | types/dist/tools.d.ts:13 |
| `getter.outputSchema?` | `public` | `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> | - | types/dist/tools.d.ts:17 |
| <a id="isexpanded"></a> `isExpanded` | `readonly` | `false` | Whether this uses expanded/decomposed tools. | [core/src/create-state-tools.ts:44](packages/core/src/create-state-tools.ts#L44) |
| <a id="setters"></a> `setters` | `readonly` | \{ `description`: `string`; `handler`: (...`args`: `any`[]) => `any`; `inputSchema?`: `ZodObject`\<`$ZodLooseShape`, `$strip`\>; `name`: `string`; `outputSchema?`: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \} | The setter tool definition(s). Single setter for basic mode. | [core/src/create-state-tools.ts:38](packages/core/src/create-state-tools.ts#L38) |
| `setters.description` | `public` | `string` | - | types/dist/tools.d.ts:14 |
| `setters.handler` | `public` | (...`args`: `any`[]) => `any` | - | types/dist/tools.d.ts:15 |
| `setters.inputSchema?` | `public` | `ZodObject`\<`$ZodLooseShape`, `$strip`\> | - | types/dist/tools.d.ts:16 |
| `setters.name` | `public` | `string` | - | types/dist/tools.d.ts:13 |
| `setters.outputSchema?` | `public` | `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> | - | types/dist/tools.d.ts:17 |
| <a id="tools-1"></a> `tools` | `readonly` | \{ `description`: `string`; `handler`: (...`args`: `any`[]) => `any`; `inputSchema?`: `ZodObject`\<`$ZodLooseShape`, `$strip`\>; `name`: `string`; `outputSchema?`: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \}[] | All tool definitions as an array. | [core/src/create-state-tools.ts:40](packages/core/src/create-state-tools.ts#L40) |

***

### CreatedStateToolsExpanded

Defined in: [core/src/create-state-tools.ts:51](packages/core/src/create-state-tools.ts#L51)

Result type for created state tools with schemaSplit or expand.
Returns a getter and array of setters.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="__brand-1"></a> `__brand` | `readonly` | `"CreatedStateTools"` | Marker to identify this as created state tools. | [core/src/create-state-tools.ts:53](packages/core/src/create-state-tools.ts#L53) |
| <a id="config-2"></a> `config` | `readonly` | [`CreateStateToolsConfig`](#createstatetoolsconfig)\<`T`\> | The original config. | [core/src/create-state-tools.ts:61](packages/core/src/create-state-tools.ts#L61) |
| <a id="getter-1"></a> `getter` | `readonly` | \{ `description`: `string`; `handler`: (...`args`: `any`[]) => `any`; `inputSchema?`: `ZodObject`\<`$ZodLooseShape`, `$strip`\>; `name`: `string`; `outputSchema?`: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \} | The getter tool definition. | [core/src/create-state-tools.ts:55](packages/core/src/create-state-tools.ts#L55) |
| `getter.description` | `public` | `string` | - | types/dist/tools.d.ts:14 |
| `getter.handler` | `public` | (...`args`: `any`[]) => `any` | - | types/dist/tools.d.ts:15 |
| `getter.inputSchema?` | `public` | `ZodObject`\<`$ZodLooseShape`, `$strip`\> | - | types/dist/tools.d.ts:16 |
| `getter.name` | `public` | `string` | - | types/dist/tools.d.ts:13 |
| `getter.outputSchema?` | `public` | `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> | - | types/dist/tools.d.ts:17 |
| <a id="isexpanded-1"></a> `isExpanded` | `readonly` | `true` | Whether this uses expanded/decomposed tools. | [core/src/create-state-tools.ts:63](packages/core/src/create-state-tools.ts#L63) |
| <a id="setters-1"></a> `setters` | `readonly` | \{ `description`: `string`; `handler`: (...`args`: `any`[]) => `any`; `inputSchema?`: `ZodObject`\<`$ZodLooseShape`, `$strip`\>; `name`: `string`; `outputSchema?`: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \}[] | The setter tool definition(s). Array for expanded/decomposed mode. | [core/src/create-state-tools.ts:57](packages/core/src/create-state-tools.ts#L57) |
| <a id="tools-2"></a> `tools` | `readonly` | \{ `description`: `string`; `handler`: (...`args`: `any`[]) => `any`; `inputSchema?`: `ZodObject`\<`$ZodLooseShape`, `$strip`\>; `name`: `string`; `outputSchema?`: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \}[] | All tool definitions as an array. | [core/src/create-state-tools.ts:59](packages/core/src/create-state-tools.ts#L59) |

***

### CreatedTool

Defined in: [core/src/create-tool.ts:36](packages/core/src/create-tool.ts#L36)

A created tool that can be registered with MCPWeb.

Created tools are validated at creation time but not yet registered.
Use `mcpWeb.addTool(createdTool)` or `useTools(createdTool)` to register.

#### Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TInput` *extends* `z.ZodObject` \| `undefined` | `undefined` |
| `TOutput` *extends* `z.ZodType` \| `undefined` | `undefined` |

#### Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="__brand-2"></a> `__brand` | `readonly` | `"CreatedTool"` | Marker to identify this as a created tool. | [core/src/create-tool.ts:41](packages/core/src/create-tool.ts#L41) |
| <a id="config-3"></a> `config` | `readonly` | [`CreateToolConfig`](#createtoolconfig)\<`TInput`, `TOutput`\> | The original config for type inference. | [core/src/create-tool.ts:45](packages/core/src/create-tool.ts#L45) |
| <a id="definition"></a> `definition` | `readonly` | \{ `description`: `string`; `handler`: (...`args`: `any`[]) => `any`; `inputSchema?`: `ZodObject`\<`$ZodLooseShape`, `$strip`\>; `name`: `string`; `outputSchema?`: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \} | The tool definition. | [core/src/create-tool.ts:43](packages/core/src/create-tool.ts#L43) |
| `definition.description` | `public` | `string` | - | types/dist/tools.d.ts:14 |
| `definition.handler` | `public` | (...`args`: `any`[]) => `any` | - | types/dist/tools.d.ts:15 |
| `definition.inputSchema?` | `public` | `ZodObject`\<`$ZodLooseShape`, `$strip`\> | - | types/dist/tools.d.ts:16 |
| `definition.name` | `public` | `string` | - | types/dist/tools.d.ts:13 |
| `definition.outputSchema?` | `public` | `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> | - | types/dist/tools.d.ts:17 |

***

### CreateStateToolsConfig

Defined in: [core/src/create-state-tools.ts:11](packages/core/src/create-state-tools.ts#L11)

Configuration for creating state tools.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="description"></a> `description` | `string` | Description of what this state represents. | [core/src/create-state-tools.ts:15](packages/core/src/create-state-tools.ts#L15) |
| <a id="expand"></a> `expand?` | `boolean` | When true, generates expanded tools for arrays and records. | [core/src/create-state-tools.ts:25](packages/core/src/create-state-tools.ts#L25) |
| <a id="get"></a> `get` | () => `T` | Function to get the current state value. | [core/src/create-state-tools.ts:17](packages/core/src/create-state-tools.ts#L17) |
| <a id="name"></a> `name` | `string` | The name of the state (used as prefix for tool names). | [core/src/create-state-tools.ts:13](packages/core/src/create-state-tools.ts#L13) |
| <a id="schema"></a> `schema` | `ZodType`\<`T`\> | Zod schema for validating state values. | [core/src/create-state-tools.ts:21](packages/core/src/create-state-tools.ts#L21) |
| <a id="schemasplit"></a> `schemaSplit?` | `SplitPlan` | Optional split plan for decomposing the schema into multiple setter tools. | [core/src/create-state-tools.ts:23](packages/core/src/create-state-tools.ts#L23) |
| <a id="set"></a> `set` | (`value`: `T`) => `void` | Function to set the state value. | [core/src/create-state-tools.ts:19](packages/core/src/create-state-tools.ts#L19) |

***

### CreateToolConfig

Defined in: [core/src/create-tool.ts:8](packages/core/src/create-tool.ts#L8)

Configuration for creating a tool with Zod schemas.

#### Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TInput` *extends* `z.ZodObject` \| `undefined` | `undefined` |
| `TOutput` *extends* `z.ZodType` \| `undefined` | `undefined` |

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="description-1"></a> `description` | `string` | Description of what the tool does. | [core/src/create-tool.ts:15](packages/core/src/create-tool.ts#L15) |
| <a id="handler"></a> `handler` | `TInput` *extends* `ZodObject`\<`$ZodLooseShape`, `$strip`\> ? (`input`: `output`\<`TInput`\<`TInput`\>\>) => `TOutput` *extends* `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> ? \| `output`\<`TOutput`\<`TOutput`\>\> \| `Promise`\<`output`\<`TOutput`\<`TOutput`\>\>\> : `void` \| `Promise`\<`void`\> : `TOutput` *extends* `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> ? () => \| `output`\<`TOutput`\<`TOutput`\>\> \| `Promise`\<`output`\<`TOutput`\<`TOutput`\>\>\> : () => `void` \| `Promise`\<`void`\> | The function that handles the tool execution. | [core/src/create-tool.ts:17](packages/core/src/create-tool.ts#L17) |
| <a id="inputschema"></a> `inputSchema?` | `TInput` | Optional Zod schema for validating input. | [core/src/create-tool.ts:25](packages/core/src/create-tool.ts#L25) |
| <a id="name-1"></a> `name` | `string` | The name of the tool (must be unique). | [core/src/create-tool.ts:13](packages/core/src/create-tool.ts#L13) |
| <a id="outputschema"></a> `outputSchema?` | `TOutput` | Optional Zod schema for validating output. | [core/src/create-tool.ts:27](packages/core/src/create-tool.ts#L27) |

## Type Aliases

### ContextItem

```ts
type ContextItem = z.infer<typeof ContextItemSchema>;
```

Defined in: [core/src/types.ts:25](packages/core/src/types.ts#L25)

***

### CreatedStateTools

```ts
type CreatedStateTools<T> = 
  | CreatedStateToolsBasic<T>
| CreatedStateToolsExpanded<T>;
```

Defined in: [core/src/create-state-tools.ts:67](packages/core/src/create-state-tools.ts#L67)

Union type for created state tools.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

***

### EphemeralContext

```ts
type EphemeralContext = z.infer<typeof EphemeralContextSchema>;
```

Defined in: [core/src/types.ts:26](packages/core/src/types.ts#L26)

***

### GroupedState

```ts
type GroupedState<T> = {
  get: () => { [K in keyof T]: InferTripleType<T[K]> };
  schema: z.ZodObject<{ [K in keyof T]: z.ZodOptional<T[K] extends StateTriple<infer U> ? z.ZodType<U> : never> }>;
  set: (value: Partial<{ [K in keyof T]: InferTripleType<T[K]> }>) => void;
};
```

Defined in: [core/src/group-state.ts:24](packages/core/src/group-state.ts#L24)

The result of groupState: combined schema, getter, and setter.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* [`StateTriples`](#statetriples) |

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="get-1"></a> `get` | () => `{ [K in keyof T]: InferTripleType<T[K]> }` | [core/src/group-state.ts:28](packages/core/src/group-state.ts#L28) |
| <a id="schema-1"></a> `schema` | `z.ZodObject`\<`{ [K in keyof T]: z.ZodOptional<T[K] extends StateTriple<infer U> ? z.ZodType<U> : never> }`\> | [core/src/group-state.ts:25](packages/core/src/group-state.ts#L25) |
| <a id="set-1"></a> `set` | (`value`: `Partial`\<`{ [K in keyof T]: InferTripleType<T[K]> }`\>) => `void` | [core/src/group-state.ts:29](packages/core/src/group-state.ts#L29) |

***

### QueryRequest

```ts
type QueryRequest = Omit<z.input<typeof QueryRequestSchema>, "responseTool" | "tools" | "context"> & {
  context?: (ToolDefinition | EphemeralContext)[];
  responseTool?: ToolDefinition;
  tools?: ToolDefinition[];
};
```

Defined in: [core/src/types.ts:15](packages/core/src/types.ts#L15)

#### Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `context?` | (`ToolDefinition` \| [`EphemeralContext`](#ephemeralcontext))[] | [core/src/types.ts:18](packages/core/src/types.ts#L18) |
| `responseTool?` | `ToolDefinition` | [core/src/types.ts:16](packages/core/src/types.ts#L16) |
| `tools?` | `ToolDefinition`[] | [core/src/types.ts:17](packages/core/src/types.ts#L17) |

***

### QueryResponseResult

```ts
type QueryResponseResult = z.infer<typeof QueryResponseResultSchema>;
```

Defined in: [core/src/types.ts:14](packages/core/src/types.ts#L14)

***

### QueryResponseResultAccepted

```ts
type QueryResponseResultAccepted = z.infer<typeof QueryResponseResultAcceptedSchema>;
```

Defined in: [core/src/types.ts:21](packages/core/src/types.ts#L21)

***

### QueryResponseResultComplete

```ts
type QueryResponseResultComplete = z.infer<typeof QueryResponseResultCompleteSchema>;
```

Defined in: [core/src/types.ts:23](packages/core/src/types.ts#L23)

***

### QueryResponseResultFailure

```ts
type QueryResponseResultFailure = z.infer<typeof QueryResponseResultFailureSchema>;
```

Defined in: [core/src/types.ts:24](packages/core/src/types.ts#L24)

***

### QueryResponseResultProgress

```ts
type QueryResponseResultProgress = z.infer<typeof QueryResponseResultProgressSchema>;
```

Defined in: [core/src/types.ts:22](packages/core/src/types.ts#L22)

***

### StateTriple

```ts
type StateTriple<T> = [() => T, (value: T) => void, z.ZodType<T>];
```

Defined in: [core/src/group-state.ts:7](packages/core/src/group-state.ts#L7)

A tuple representing a single piece of state: [getter, setter, schema]
Follows the familiar [value, setter] pattern from React/Jotai hooks.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

***

### StateTriples

```ts
type StateTriples = Record<string, StateTriple<any>>;
```

Defined in: [core/src/group-state.ts:14](packages/core/src/group-state.ts#L14)

Configuration object mapping state names to their getter/setter/schema triples.
Uses `any` instead of `unknown` to avoid contravariance issues with the setter function.

## Functions

### createStateTools()

Creates state tool definitions without registering them.

This follows the Jotai pattern of creating atoms outside React components.
State tools can be defined at module scope and registered when needed.

#### Examples

```typescript
// tools.ts
import { createStateTools } from '@mcp-web/core';
import { z } from 'zod';
import { store, todosAtom } from './states';

const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

export const todoTools = createStateTools({
  name: 'todos',
  description: 'Todo list',
  get: () => store.get(todosAtom),
  set: (value) => store.set(todosAtom, value),
  schema: z.array(TodoSchema),
  expand: true, // Generates get_todos, add_todos, set_todos, delete_todos
});
```

```typescript
// Option 1: Direct registration
mcpWeb.addStateTools(todoTools);

// Option 2: React hook (auto cleanup on unmount)
function App() {
  useTools(todoTools);
  return <div>...</div>;
}
```

```typescript
export const settingsTools = createStateTools({
  name: 'settings',
  description: 'App settings',
  get: () => store.get(settingsAtom),
  set: (value) => store.set(settingsAtom, value),
  schema: SettingsSchema,
  schemaSplit: ['theme', ['sortBy', 'sortOrder']], // Creates separate setter tools
});
```

#### Call Signature

```ts
function createStateTools<T>(config: CreateStateToolsConfig<T> & {
  expand?: false;
  schemaSplit?: undefined;
}): CreatedStateToolsBasic<T>;
```

Defined in: [core/src/create-state-tools.ts:70](packages/core/src/create-state-tools.ts#L70)

##### Type Parameters

| Type Parameter |
| ------ |
| `T` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`CreateStateToolsConfig`](#createstatetoolsconfig)\<`T`\> & \{ `expand?`: `false`; `schemaSplit?`: `undefined`; \} |

##### Returns

[`CreatedStateToolsBasic`](#createdstatetoolsbasic)\<`T`\>

#### Call Signature

```ts
function createStateTools<T>(config: CreateStateToolsConfig<T> & {
  expand?: boolean;
  schemaSplit: SplitPlan;
}): CreatedStateToolsExpanded<T>;
```

Defined in: [core/src/create-state-tools.ts:76](packages/core/src/create-state-tools.ts#L76)

##### Type Parameters

| Type Parameter |
| ------ |
| `T` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`CreateStateToolsConfig`](#createstatetoolsconfig)\<`T`\> & \{ `expand?`: `boolean`; `schemaSplit`: `SplitPlan`; \} |

##### Returns

[`CreatedStateToolsExpanded`](#createdstatetoolsexpanded)\<`T`\>

#### Call Signature

```ts
function createStateTools<T>(config: CreateStateToolsConfig<T> & {
  expand: true;
  schemaSplit?: SplitPlan;
}): CreatedStateToolsExpanded<T>;
```

Defined in: [core/src/create-state-tools.ts:82](packages/core/src/create-state-tools.ts#L82)

##### Type Parameters

| Type Parameter |
| ------ |
| `T` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`CreateStateToolsConfig`](#createstatetoolsconfig)\<`T`\> & \{ `expand`: `true`; `schemaSplit?`: `SplitPlan`; \} |

##### Returns

[`CreatedStateToolsExpanded`](#createdstatetoolsexpanded)\<`T`\>

***

### createTool()

```ts
function createTool<TInput, TOutput>(config: CreateToolConfig<TInput, TOutput>): CreatedTool<TInput, TOutput>;
```

Defined in: [core/src/create-tool.ts:80](packages/core/src/create-tool.ts#L80)

Creates a tool definition without registering it.

This follows the Jotai pattern of creating atoms outside React components.
Tools can be defined at module scope and registered when needed.

#### Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TInput` *extends* `ZodObject`\<`$ZodLooseShape`, `$strip`\> \| `undefined` | `undefined` |
| `TOutput` *extends* \| `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> \| `undefined` | `undefined` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`CreateToolConfig`](#createtoolconfig)\<`TInput`, `TOutput`\> |

#### Returns

[`CreatedTool`](#createdtool)\<`TInput`, `TOutput`\>

#### Examples

```typescript
// tools.ts
import { createTool } from '@mcp-web/core';
import { z } from 'zod';

export const getCurrentTimeTool = createTool({
  name: 'get_current_time',
  description: 'Get the current time in ISO format',
  handler: () => ({ time: new Date().toISOString() }),
  outputSchema: z.object({ time: z.string() }),
});
```

```typescript
// Option 1: Direct registration
mcpWeb.addTool(getCurrentTimeTool);

// Option 2: React hook (auto cleanup on unmount)
function App() {
  useTools(getCurrentTimeTool);
  return <div>...</div>;
}
```

***

### deepMerge()

```ts
function deepMerge(target: unknown, source: unknown): unknown;
```

Defined in: [core/src/utils.ts:105](packages/core/src/utils.ts#L105)

Deep merge two objects recursively.
Used for partial updates to state objects.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `target` | `unknown` | The target object to merge into |
| `source` | `unknown` | The source object to merge from |

#### Returns

`unknown`

The merged result

Key behaviors:
- `undefined` in source → keep target value (no change)
- `null` in source → set to null (explicit clear)
- Nested objects → recursively merged
- Arrays → replaced entirely (not merged)

***

### groupState()

```ts
function groupState<T>(atoms: T): GroupedState<T>;
```

Defined in: [core/src/group-state.ts:60](packages/core/src/group-state.ts#L60)

Groups multiple atomic state variables into a single schema/getter/setter
that can be spread into `addStateTools`.

This reduces tool explosion when using declarative reactive state (like Jotai atoms)
by exposing semantically related state through one tool set.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* [`StateTriples`](#statetriples) |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `atoms` | `T` | Object mapping state names to [getter, setter, schema] triples |

#### Returns

[`GroupedState`](#groupedstate)\<`T`\>

Object with combined { schema, get, set } for use with addStateTools

#### Example

```typescript
import { groupState } from '@mcp-web/core';

const settingsGroup = groupState({
  sortBy: [getSortBy, setSortBy, SortBySchema],
  sortOrder: [getSortOrder, setSortOrder, SortOrderSchema],
  showCompleted: [getShowCompleted, setShowCompleted, ShowCompletedSchema],
  theme: [getTheme, setTheme, ThemeSchema],
});

mcpWeb.addStateTools({
  name: 'settings',
  description: 'Display and app settings',
  ...settingsGroup,
});
```

***

### id()

```ts
function id<T>(schema: T): T;
```

Defined in: [core/src/tool-generators/schema-helpers.ts:16](packages/core/src/tool-generators/schema-helpers.ts#L16)

Marks a field as the unique identifier for array elements.
Enables ID-based tools instead of index-based.
Only one field per schema can be marked with id().

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | `T` |

#### Returns

`T`

#### Example

```typescript
const TodoSchema = z.object({
  id: id(z.string()),
  value: z.string()
});
```

***

### isCreatedStateTools()

```ts
function isCreatedStateTools(value: unknown): value is CreatedStateTools<unknown>;
```

Defined in: [core/src/create-state-tools.ts:271](packages/core/src/create-state-tools.ts#L271)

Type guard to check if a value is CreatedStateTools.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |

#### Returns

`value is CreatedStateTools<unknown>`

***

### isCreatedTool()

```ts
function isCreatedTool(value: unknown): value is CreatedTool<undefined, undefined>;
```

Defined in: [core/src/create-tool.ts:108](packages/core/src/create-tool.ts#L108)

Type guard to check if a value is a CreatedTool.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |

#### Returns

`value is CreatedTool<undefined, undefined>`

***

### isZodSchema()

```ts
function isZodSchema(schema: 
  | ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>
  | JSONSchema): schema is ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>;
```

Defined in: [core/src/utils.ts:8](packages/core/src/utils.ts#L8)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | \| `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> \| `JSONSchema` |

#### Returns

`schema is ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>`

***

### system()

```ts
function system<T>(schema: T): T;
```

Defined in: [core/src/tool-generators/schema-helpers.ts:34](packages/core/src/tool-generators/schema-helpers.ts#L34)

Marks a field as system-generated.
Field is excluded from input schemas (add/set).
MUST have a default() — error thrown otherwise.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | `T` |

#### Returns

`T`

#### Example

```typescript
const TodoSchema = z.object({
  id: id(system(z.string().default(() => crypto.randomUUID()))),
  created_at: system(z.number().default(() => Date.now()))
});
```

***

### toJSONSchema()

```ts
function toJSONSchema(schema: 
  | ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>
  | JSONSchema): JSONSchema;
```

Defined in: [core/src/utils.ts:12](packages/core/src/utils.ts#L12)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | \| `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> \| `JSONSchema` |

#### Returns

`JSONSchema`

***

### toToolMetadataJson()

```ts
function toToolMetadataJson(tool: ToolDefinition): {
  description: string;
  inputSchema?: JSONSchema;
  name: string;
  outputSchema?: JSONSchema;
};
```

Defined in: [core/src/utils.ts:82](packages/core/src/utils.ts#L82)

Convert a ToolDefinition to ToolMetadataJson for wire transmission.
Removes the handler and converts Zod schemas to JSON Schema.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tool` | `ToolDefinition` | The tool definition to convert |

#### Returns

```ts
{
  description: string;
  inputSchema?: JSONSchema;
  name: string;
  outputSchema?: JSONSchema;
}
```

Serializable tool metadata without handler, with JSON Schema schemas

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `description` | `string` | types/dist/tools.d.ts:63 |
| `inputSchema?` | `JSONSchema` | types/dist/tools.d.ts:64 |
| `name` | `string` | types/dist/tools.d.ts:62 |
| `outputSchema?` | `JSONSchema` | types/dist/tools.d.ts:65 |

***

### toToolSchema()

```ts
function toToolSchema<T>(schema?: 
  | JSONSchema
  | ZodType<T, unknown, $ZodTypeInternals<T, unknown>>): ZodObject<$ZodLooseShape, $strip> | JSONSchema;
```

Defined in: [core/src/utils.ts:36](packages/core/src/utils.ts#L36)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema?` | \| `JSONSchema` \| `ZodType`\<`T`, `unknown`, `$ZodTypeInternals`\<`T`, `unknown`\>\> |

#### Returns

`ZodObject`\<`$ZodLooseShape`, `$strip`\> \| `JSONSchema`

***

### toToolZodSchema()

```ts
function toToolZodSchema<T>(schema?: 
  | JSONSchema
  | ZodType<T, unknown, $ZodTypeInternals<T, unknown>>): ZodObject;
```

Defined in: [core/src/utils.ts:26](packages/core/src/utils.ts#L26)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema?` | \| `JSONSchema` \| `ZodType`\<`T`, `unknown`, `$ZodTypeInternals`\<`T`, `unknown`\>\> |

#### Returns

`ZodObject`

***

### validateInput()

```ts
function validateInput<T>(input: unknown, schema: 
  | JSONSchema
  | ZodType<T, unknown, $ZodTypeInternals<T, unknown>>): T;
```

Defined in: [core/src/utils.ts:49](packages/core/src/utils.ts#L49)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `unknown` |
| `schema` | \| `JSONSchema` \| `ZodType`\<`T`, `unknown`, `$ZodTypeInternals`\<`T`, `unknown`\>\> |

#### Returns

`T`
