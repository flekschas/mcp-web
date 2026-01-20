# MCP-Web

## Classes

### MCPWeb

Defined in: [web/src/web.ts:67](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L67)

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

Defined in: [web/src/web.ts:107](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L107)

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

Defined in: [web/src/web.ts:150](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L150)

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

Defined in: [web/src/web.ts:172](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L172)

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

Defined in: [web/src/web.ts:896](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L896)

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

Defined in: [web/src/web.ts:191](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L191)

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

Defined in: [web/src/web.ts:138](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L138)

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

Defined in: [web/src/web.ts:161](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L161)

Map of all registered tools.

Provides access to the internal tool registry. Each tool is keyed by its name.

###### Returns

`Map`\<`string`, `ProcessedToolDefinition`\>

Map of tool names to processed tool definitions

#### Methods

##### addStateTools()

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

Defined in: [web/src/web.ts:716](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L716)

Add state management tools with optional expanded tool generation.
When `expand` is true, automatically generates targeted tools for
arrays and records instead of a single setter.

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

Defined in: [web/src/web.ts:726](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L726)

Add state management tools with optional expanded tool generation.
When `expand` is true, automatically generates targeted tools for
arrays and records instead of a single setter.

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

Defined in: [web/src/web.ts:735](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L735)

Add state management tools with optional expanded tool generation.
When `expand` is true, automatically generates targeted tools for
arrays and records instead of a single setter.

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

Defined in: [web/src/web.ts:589](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L589)

Registers a tool that AI agents can call.

Supports both Zod schemas (recommended for type safety) and JSON schemas.
When using Zod schemas, TypeScript enforces that your handler signature matches the schemas.

###### Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TInput` *extends* `ZodObject`\<`$ZodLooseShape`, `$strip`\> \| `undefined` | `undefined` |
| `TOutput` *extends* \| `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> \| `undefined` | `undefined` |

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tool` | \{ `description`: `string`; `handler`: `TInput` *extends* `ZodObject`\<`$ZodLooseShape`, `$strip`\> ? (`input`: `output`\<`TInput`\<`TInput`\>\>) => `TOutput` *extends* `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> ? \| `output`\<`TOutput`\<`TOutput`\>\> \| `Promise`\<`output`\<`TOutput`\<`TOutput`\>\>\> : `void` \| `Promise`\<`void`\> : `TOutput` *extends* `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> ? () => \| `output`\<`TOutput`\<`TOutput`\>\> \| `Promise`\<`output`\<`TOutput`\<`TOutput`\>\>\> : () => `void` \| `Promise`\<`void`\>; `inputSchema?`: `TInput`; `name`: `string`; `outputSchema?`: `TOutput`; \} | Tool configuration including name, description, handler, and schemas |
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

Defined in: [web/src/web.ts:608](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L608)

Registers a tool that AI agents can call.

Supports both Zod schemas (recommended for type safety) and JSON schemas.
When using Zod schemas, TypeScript enforces that your handler signature matches the schemas.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tool` | \{ `description`: `string`; `handler`: (`input?`: `unknown`) => `unknown`; `inputSchema?`: \{ \[`key`: `string`\]: `unknown`; `type`: `string`; \}; `name`: `string`; `outputSchema?`: \{ \[`key`: `string`\]: `unknown`; `type`: `string`; \}; \} | Tool configuration including name, description, handler, and schemas |
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

Defined in: [web/src/web.ts:293](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L293)

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

Defined in: [web/src/web.ts:914](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L914)

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

Defined in: [web/src/web.ts:937](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L937)

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

Defined in: [web/src/web.ts:989](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L989)

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

Defined in: [web/src/web.ts:670](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/web.ts#L670)

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

Defined in: [web/src/query.ts:3](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/query.ts#L3)

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

Defined in: [web/src/query.ts:8](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/query.ts#L8)

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

Defined in: [web/src/query.ts:52](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/query.ts#L52)

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

Defined in: [web/src/query.ts:34](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/query.ts#L34)

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

Defined in: [web/src/query.ts:17](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/query.ts#L17)

The unique identifier for this query

###### Returns

`string`

#### Methods

##### cancel()

```ts
cancel(): void;
```

Defined in: [web/src/query.ts:67](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/query.ts#L67)

Cancel this query
Triggers cancellation either via AbortController or directly through the bridge

###### Returns

`void`

## Type Aliases

### ContextItem

```ts
type ContextItem = z.infer<typeof ContextItemSchema>;
```

Defined in: [web/src/types.ts:25](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/types.ts#L25)

***

### EphemeralContext

```ts
type EphemeralContext = z.infer<typeof EphemeralContextSchema>;
```

Defined in: [web/src/types.ts:26](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/types.ts#L26)

***

### GroupedState

```ts
type GroupedState<T> = {
  get: () => { [K in keyof T]: InferTripleType<T[K]> };
  schema: z.ZodObject<{ [K in keyof T]: z.ZodOptional<T[K] extends StateTriple<infer U> ? z.ZodType<U> : never> }>;
  set: (value: Partial<{ [K in keyof T]: InferTripleType<T[K]> }>) => void;
};
```

Defined in: [web/src/group-state.ts:22](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/group-state.ts#L22)

The result of groupState: combined schema, getter, and setter.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* [`StateTriples`](#statetriples) |

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="get"></a> `get` | () => `{ [K in keyof T]: InferTripleType<T[K]> }` | [web/src/group-state.ts:26](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/group-state.ts#L26) |
| <a id="schema"></a> `schema` | `z.ZodObject`\<`{ [K in keyof T]: z.ZodOptional<T[K] extends StateTriple<infer U> ? z.ZodType<U> : never> }`\> | [web/src/group-state.ts:23](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/group-state.ts#L23) |
| <a id="set"></a> `set` | (`value`: `Partial`\<`{ [K in keyof T]: InferTripleType<T[K]> }`\>) => `void` | [web/src/group-state.ts:27](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/group-state.ts#L27) |

***

### QueryRequest

```ts
type QueryRequest = Omit<z.input<typeof QueryRequestSchema>, "responseTool" | "tools" | "context"> & {
  context?: (ToolDefinition | EphemeralContext)[];
  responseTool?: ToolDefinition;
  tools?: ToolDefinition[];
};
```

Defined in: [web/src/types.ts:15](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/types.ts#L15)

#### Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `context?` | (`ToolDefinition` \| [`EphemeralContext`](#ephemeralcontext))[] | [web/src/types.ts:18](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/types.ts#L18) |
| `responseTool?` | `ToolDefinition` | [web/src/types.ts:16](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/types.ts#L16) |
| `tools?` | `ToolDefinition`[] | [web/src/types.ts:17](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/types.ts#L17) |

***

### QueryResponseResult

```ts
type QueryResponseResult = z.infer<typeof QueryResponseResultSchema>;
```

Defined in: [web/src/types.ts:14](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/types.ts#L14)

***

### QueryResponseResultAccepted

```ts
type QueryResponseResultAccepted = z.infer<typeof QueryResponseResultAcceptedSchema>;
```

Defined in: [web/src/types.ts:21](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/types.ts#L21)

***

### QueryResponseResultComplete

```ts
type QueryResponseResultComplete = z.infer<typeof QueryResponseResultCompleteSchema>;
```

Defined in: [web/src/types.ts:23](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/types.ts#L23)

***

### QueryResponseResultFailure

```ts
type QueryResponseResultFailure = z.infer<typeof QueryResponseResultFailureSchema>;
```

Defined in: [web/src/types.ts:24](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/types.ts#L24)

***

### QueryResponseResultProgress

```ts
type QueryResponseResultProgress = z.infer<typeof QueryResponseResultProgressSchema>;
```

Defined in: [web/src/types.ts:22](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/types.ts#L22)

***

### StateTriple

```ts
type StateTriple<T> = [() => T, (value: T) => void, z.ZodType<T>];
```

Defined in: [web/src/group-state.ts:7](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/group-state.ts#L7)

A tuple representing a single piece of state: [getter, setter, schema]
Follows the familiar [value, setter] pattern from React/Jotai hooks.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

***

### StateTriples

```ts
type StateTriples = Record<string, StateTriple<unknown>>;
```

Defined in: [web/src/group-state.ts:12](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/group-state.ts#L12)

Configuration object mapping state names to their getter/setter/schema triples.

## Functions

### deepMerge()

```ts
function deepMerge(target: unknown, source: unknown): unknown;
```

Defined in: [web/src/utils.ts:105](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/utils.ts#L105)

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

Defined in: [web/src/group-state.ts:58](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/group-state.ts#L58)

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

Defined in: [web/src/tool-generators/schema-helpers.ts:16](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/tool-generators/schema-helpers.ts#L16)

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

### isZodSchema()

```ts
function isZodSchema(schema: 
  | JSONSchema
  | ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>): schema is ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>;
```

Defined in: [web/src/utils.ts:8](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/utils.ts#L8)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | \| `JSONSchema` \| `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> |

#### Returns

`schema is ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>`

***

### system()

```ts
function system<T>(schema: T): T;
```

Defined in: [web/src/tool-generators/schema-helpers.ts:34](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/tool-generators/schema-helpers.ts#L34)

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
  | JSONSchema
  | ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>): JSONSchema;
```

Defined in: [web/src/utils.ts:12](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/utils.ts#L12)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | \| `JSONSchema` \| `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\> |

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

Defined in: [web/src/utils.ts:82](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/utils.ts#L82)

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
| ZodType<T, unknown, $ZodTypeInternals<T, unknown>>): JSONSchema | ZodObject<$ZodLooseShape, $strip>;
```

Defined in: [web/src/utils.ts:36](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/utils.ts#L36)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema?` | \| `JSONSchema` \| `ZodType`\<`T`, `unknown`, `$ZodTypeInternals`\<`T`, `unknown`\>\> |

#### Returns

`JSONSchema` \| `ZodObject`\<`$ZodLooseShape`, `$strip`\>

***

### toToolZodSchema()

```ts
function toToolZodSchema<T>(schema?: 
  | JSONSchema
  | ZodType<T, unknown, $ZodTypeInternals<T, unknown>>): ZodObject;
```

Defined in: [web/src/utils.ts:26](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/utils.ts#L26)

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

Defined in: [web/src/utils.ts:49](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/web/src/utils.ts#L49)

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
