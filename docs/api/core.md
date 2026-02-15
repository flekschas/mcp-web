# MCP-Web Core API

### QueryResponse

*Class* — `packages/core/src/query.ts`

Represents an in-flight query to an AI agent.

QueryResponse provides multiple ways to interact with query results:
- `stream` for fine-grained event handling
- `result` for simple await-the-final-result usage
- `cancel()` to abort the query

**Accessors:**

```ts
get uuid(): any
```

Unique identifier for this query.
Can be used to track or reference the query externally.

```ts
get stream(): AsyncIterableIterator<QueryResponseResult>
```

Async iterator of query events (progress, completion, failure, cancel).

Use this for fine-grained control over query lifecycle, such as
displaying progress updates to users.

```ts
get result(): Promise<QueryResponseResultComplete | QueryResponseResultFailure>
```

Promise that resolves to the final query result.

This is a convenience property for when you only care about the final
outcome and don't need to track progress events.

**Methods:**

```ts
cancel(): void
```

Cancels the in-flight query.

Triggers cancellation via AbortController or directly through the bridge,
depending on how the query was created.

### MCPWeb

*Class* — `packages/core/src/web.ts`

Main class for integrating web applications with AI agents via the Model Context Protocol (MCP).

MCPWeb enables your web application to expose state and actions as tools that AI agents can
interact with. It handles the WebSocket connection to the bridge server, tool registration,
and bi-directional communication between your frontend and AI agents.

**Accessors:**

```ts
get sessionId(): any
```

Unique session identifier for this frontend instance.

The session ID is automatically generated on construction.
It's used to identify this specific frontend instance in the bridge server.

```ts
get authToken(): any
```

Authentication token for this session.

The auth token is either auto-generated, loaded from localStorage, or provided via config.
By default, it's persisted in localStorage to maintain the same token across page reloads.

```ts
get tools(): any
```

Map of all registered tools.

Provides access to the internal tool registry. Each tool is keyed by its name.

```ts
get resources(): any
```

Map of all registered resources.

Provides access to the internal resource registry. Each resource is keyed by its URI.

```ts
get apps(): any
```

Map of all registered MCP Apps.

Provides access to the internal app registry. Each app is keyed by its name.

```ts
get config(): any
```

The processed MCPWeb configuration.

Returns the validated and processed configuration with all defaults applied.

```ts
get mcpConfig(): any
```

Configuration object for the AI host app (e.g., Claude Desktop) using stdio transport.

Use this to configure the MCP client in your AI host application.
It contains the connection details and authentication credentials needed
for the AI agent to connect to the bridge server via the `@mcp-web/client` stdio wrapper.

For a simpler configuration, consider using `remoteMcpConfig` instead, which
uses Remote MCP (Streamable HTTP) and doesn't require an intermediate process.

```ts
get remoteMcpConfig(): any
```

Configuration object for the AI host app (e.g., Claude Desktop) using Remote MCP.

This is the recommended configuration method. It uses Remote MCP (Streamable HTTP)
to connect directly to the bridge server via URL, without needing an intermediate
stdio process like `@mcp-web/client`.

```ts
get connected(): boolean
```

Whether the client is currently connected to the bridge server.

**Methods:**

```ts
connect(): Promise<true>
```

Establishes connection to the bridge server.

Opens a WebSocket connection to the bridge server and authenticates using the session's
auth token. If `autoConnect` is enabled in the config, this is called automatically
during construction.

This method is idempotent - calling it multiple times while already connected or
connecting will return the same promise.

```ts
addTool<TInput, TOutput>(tool: CreatedTool<TInput, TOutput>): ToolDefinition
```

Registers a tool that AI agents can call.

Supports both Zod schemas (recommended for type safety) and JSON schemas.
When using Zod schemas, TypeScript enforces that your handler signature matches the schemas.

Can also accept pre-created tools from `createTool()`.

```ts
addTool<TInput, TOutput>(tool: {
    name: string;
    description: string;
    handler:
      TInput extends z.ZodObject
        ? (input: z.infer<TInput>) => TOutput extends z.ZodType
          ? z.infer<TOutput> | Promise<z.infer<TOutput>>
          : void | Promise<void>
        : TOutput extends z.ZodType
          ? () => z.infer<TOutput> | Promise<z.infer<TOutput>>
          : () => void | Promise<void>;
    inputSchema?: TInput;
    outputSchema?: TOutput;
  }): ToolDefinition
```

```ts
addTool(tool: {
    name: string;
    description: string;
    handler: (input?: unknown) => unknown | Promise<unknown> | void | Promise<void>;
    inputSchema?: { type: string; [key: string]: unknown };
    outputSchema?: { type: string; [key: string]: unknown };
    _meta?: Record<string, unknown>;
  }): ToolDefinition
```

```ts
addTool(tool: ToolDefinition | CreatedTool): ToolDefinition
```

```ts
removeTool(name: string): void
```

Removes a registered tool.

After removal, AI agents will no longer be able to call this tool.
Useful for dynamically disabling features or cleaning up when tools are no longer needed.

```ts
addResource(resource: ResourceDefinition): ResourceDefinition
```

Registers a resource that AI agents can read.

Resources are content that AI agents can request, such as HTML for MCP Apps.
The handler function is called when the AI requests the resource content.

```ts
removeResource(uri: string): void
```

Removes a registered resource.

After removal, AI agents will no longer be able to read this resource.

```ts
addApp(app: AppDefinition | CreatedApp): AppDefinition
```

Registers an MCP App that AI agents can invoke to show visual UI.

An MCP App combines a tool (that AI calls to get props) with a resource (the HTML UI).
When AI calls the tool, the handler returns props. The tool response includes
`_meta.ui.resourceUri` which tells the host to fetch and render the app HTML.

```ts
removeApp(name: string): void
```

Removes a registered MCP App.

After removal, AI agents will no longer be able to invoke this app.
This also removes the associated tool and resource.

```ts
addStateTools<T>(created: CreatedStateTools<T> & { isExpanded: false }): [ToolDefinition, ToolDefinition, () => void]
```

Add state management tools with optional expanded tool generation.
When `expand` is true, automatically generates targeted tools for
arrays and records instead of a single setter.

Can also accept pre-created state tools from `createStateTools()`.

```ts
addStateTools<T>(created: CreatedStateTools<T> & { isExpanded: true }): [ToolDefinition, ToolDefinition[], () => void]
```

```ts
addStateTools<T>(created: CreatedStateTools<T>): [ToolDefinition, ToolDefinition | ToolDefinition[], () => void]
```

```ts
addStateTools<T>(options: {
    name: string;
    description: string;
    get: () => T;
    set: (value: T) => void;
    schema: z.ZodType<T>;
    schemaSplit?: undefined;
    expand?: false;
  }): [ToolDefinition, ToolDefinition, () => void]
```

```ts
addStateTools<T>(options: {
    name: string;
    description: string;
    get: () => T;
    set: (value: T) => void;
    schema: z.ZodType<T>;
    schemaSplit: SplitPlan;
    expand?: boolean;
  }): [ToolDefinition, ToolDefinition[], () => void]
```

```ts
addStateTools<T>(options: {
    name: string;
    description: string;
    get: () => T;
    set: (value: T) => void;
    schema: z.ZodType<T>;
    schemaSplit?: SplitPlan;
    expand: true;
  }): [ToolDefinition, ToolDefinition[], () => void]
```

```ts
addStateTools<T>(optionsOrCreated: {
    name: string;
    description: string;
    get: () => T;
    set: (value: T) => void;
    schema: z.ZodType<T>;
    schemaSplit?: SplitPlan;
    expand?: boolean;
  } | CreatedStateTools<T>): [ToolDefinition, ToolDefinition | ToolDefinition[], () => void]
```

```ts
disconnect(): void
```

Disconnects from the bridge server.

Closes the WebSocket connection and cleans up event handlers.
Useful for cleanup when unmounting components or closing the application.

```ts
getTools(): string[]
```

Gets list of all registered tool names.

```ts
query(request: QueryRequest, signal?: AbortSignal): QueryResponse
```

Triggers an AI agent query from your frontend code.

Requires `agentUrl` to be configured in MCPWeb config. Sends a query to the AI agent
and returns a QueryResponse object that can be iterated to stream events.

### `CreateStateToolsConfig<T>`

*Interface* — `packages/core/src/create-state-tools.ts`

Configuration for creating state tools.

**Properties:**

```ts
name: string
```

The name of the state (used as prefix for tool names).

```ts
description: string
```

Description of what this state represents.

```ts
get: () => T
```

Function to get the current state value.

```ts
set: (value: T) => void
```

Function to set the state value.

```ts
schema: z.ZodType<T>
```

Zod schema for validating state values.

```ts
schemaSplit?: SplitPlan
```

Optional split plan for decomposing the schema into multiple setter tools.

```ts
expand?: boolean
```

When true, generates expanded tools for arrays and records.

### `CreatedStateToolsBasic<T>`

*Interface* — `packages/core/src/create-state-tools.ts`

Result type for created state tools without schemaSplit or expand.
Returns a single getter and single setter.

**Properties:**

```ts
__brand: 'CreatedStateTools'
```

Marker to identify this as created state tools.

```ts
getter: ToolDefinitionZod
```

The getter tool definition.

```ts
setters: ToolDefinitionZod
```

The setter tool definition(s). Single setter for basic mode.

```ts
tools: ToolDefinitionZod[]
```

All tool definitions as an array.

```ts
config: CreateStateToolsConfig<T>
```

The original config.

```ts
isExpanded: false
```

Whether this uses expanded/decomposed tools.

### `CreatedStateToolsExpanded<T>`

*Interface* — `packages/core/src/create-state-tools.ts`

Result type for created state tools with schemaSplit or expand.
Returns a getter and array of setters.

**Properties:**

```ts
__brand: 'CreatedStateTools'
```

Marker to identify this as created state tools.

```ts
getter: ToolDefinitionZod
```

The getter tool definition.

```ts
setters: ToolDefinitionZod[]
```

The setter tool definition(s). Array for expanded/decomposed mode.

```ts
tools: ToolDefinitionZod[]
```

All tool definitions as an array.

```ts
config: CreateStateToolsConfig<T>
```

The original config.

```ts
isExpanded: true
```

Whether this uses expanded/decomposed tools.

### `CreateToolConfig<TInput, TOutput>`

*Interface* — `packages/core/src/create-tool.ts`

Configuration for creating a tool with Zod schemas.

**Properties:**

```ts
name: string
```

The name of the tool (must be unique).

```ts
description: string
```

Description of what the tool does.

```ts
handler: TInput extends z.ZodObject
    ? (input: z.infer<TInput>) => TOutput extends z.ZodType
      ? z.infer<TOutput> | Promise<z.infer<TOutput>>
      : void | Promise<void>
    : TOutput extends z.ZodType
      ? () => z.infer<TOutput> | Promise<z.infer<TOutput>>
      : () => void | Promise<void>
```

The function that handles the tool execution.

```ts
inputSchema?: TInput
```

Optional Zod schema for validating input.

```ts
outputSchema?: TOutput
```

Optional Zod schema for validating output.

### `CreatedTool<TInput, TOutput>`

*Interface* — `packages/core/src/create-tool.ts`

A created tool that can be registered with MCPWeb.

Created tools are validated at creation time but not yet registered.
Use `mcpWeb.addTool(createdTool)` or `useTools(createdTool)` to register.

**Properties:**

```ts
__brand: 'CreatedTool'
```

Marker to identify this as a created tool.

```ts
definition: ToolDefinitionZod
```

The tool definition.

```ts
config: CreateToolConfig<TInput, TOutput>
```

The original config for type inference.

### CreatedStateTools

*Type* — `packages/core/src/create-state-tools.ts`

Union type for created state tools.

### StateTriple

*Type* — `packages/core/src/group-state.ts`

A tuple representing a single piece of state: [getter, setter, schema]
Follows the familiar [value, setter] pattern from React/Jotai hooks.

### StateTriples

*Type* — `packages/core/src/group-state.ts`

Configuration object mapping state names to their getter/setter/schema triples.
Uses `any` instead of `unknown` to avoid contravariance issues with the setter function.

### GroupedState

*Type* — `packages/core/src/group-state.ts`

The result of groupState: combined schema, getter, and setter.

### QueryResponseResult

*Type* — `packages/core/src/types.ts`

```ts
z.infer<typeof QueryResponseResultSchema>
```

### QueryRequest

*Type* — `packages/core/src/types.ts`

```ts
Omit<z.input<typeof QueryRequestSchema>, 'responseTool' | 'tools' | 'context'> & {
  responseTool?: ToolDefinition;
  tools?: ToolDefinition[];
  context?: (ToolDefinition | EphemeralContext)[];
}
```

### QueryRequestOutput

*Type* — `packages/core/src/types.ts`

```ts
z.infer<typeof QueryRequestSchema>
```

### QueryResponseResultAccepted

*Type* — `packages/core/src/types.ts`

```ts
z.infer<typeof QueryResponseResultAcceptedSchema>
```

### QueryResponseResultProgress

*Type* — `packages/core/src/types.ts`

```ts
z.infer<typeof QueryResponseResultProgressSchema>
```

### QueryResponseResultComplete

*Type* — `packages/core/src/types.ts`

```ts
z.infer<typeof QueryResponseResultCompleteSchema>
```

### QueryResponseResultFailure

*Type* — `packages/core/src/types.ts`

```ts
z.infer<typeof QueryResponseResultFailureSchema>
```

### ContextItem

*Type* — `packages/core/src/types.ts`

```ts
z.infer<typeof ContextItemSchema>
```

### EphemeralContext

*Type* — `packages/core/src/types.ts`

```ts
z.infer<typeof EphemeralContextSchema>
```

### createStateTools

*Function* — `packages/core/src/create-state-tools.ts`

```ts
createStateTools<T>(config: CreateStateToolsConfig<...>): CreatedStateToolsBasic<T>
```

### isCreatedStateTools

*Function* — `packages/core/src/create-state-tools.ts`

Type guard to check if a value is CreatedStateTools.

```ts
isCreatedStateTools(value: unknown): value is CreatedStateTools<unknown>
```

### createTool

*Function* — `packages/core/src/create-tool.ts`

Creates a tool definition without registering it.

Useful for:
- Read-only tools (derived state, computed values)
- Custom action tools that don't map directly to state
- Tools that need to be conditionally registered

This follows the Jotai pattern of creating atoms outside React components.
Tools can be defined at module scope and registered when needed.

```ts
createTool<TInput, TOutput>(config: CreateToolConfig<TInput, TOutput>): CreatedTool<TInput, TOutput>
```

### isCreatedTool

*Function* — `packages/core/src/create-tool.ts`

Type guard to check if a value is a CreatedTool.

```ts
isCreatedTool(value: unknown): value is CreatedTool
```

### groupState

*Function* — `packages/core/src/group-state.ts`

Groups multiple atomic state variables into a single schema/getter/setter
that can be spread into `addStateTools`.

This reduces tool explosion when using declarative reactive state (like Jotai atoms)
by exposing semantically related state through one tool set.

```ts
groupState<T>(atoms: T): GroupedState<T>
```

### isZodSchema

*Function* — `packages/core/src/utils.ts`

```ts
isZodSchema(schema: z.ZodType<unknown> | z.core.JSONSchema.JSONSchema): schema is z.ZodType<unknown>
```

### toJSONSchema

*Function* — `packages/core/src/utils.ts`

```ts
toJSONSchema(schema: z.ZodType | z.core.JSONSchema.JSONSchema): z.core.JSONSchema.JSONSchema
```

### toToolZodSchema

*Function* — `packages/core/src/utils.ts`

```ts
toToolZodSchema<T>(schema?: z.ZodType<T> | z.core.JSONSchema.JSONSchema): z.ZodObject
```

### toToolSchema

*Function* — `packages/core/src/utils.ts`

```ts
toToolSchema<T>(schema?: z.ZodType<T> | z.core.JSONSchema.JSONSchema): z.ZodObject | z.core.JSONSchema.JSONSchema
```

### validateInput

*Function* — `packages/core/src/utils.ts`

```ts
validateInput<T>(input: unknown, schema: z.ZodType<T> | z.core.JSONSchema.JSONSchema): T
```

### toToolMetadataJson

*Function* — `packages/core/src/utils.ts`

Convert a ToolDefinition to ToolMetadataJson for wire transmission.
Removes the handler and converts Zod schemas to JSON Schema.

```ts
toToolMetadataJson(tool: ToolDefinition): ToolMetadataJson
```

### deepMerge

*Function* — `packages/core/src/utils.ts`

Deep merge two objects recursively.
Used for partial updates to state objects.

```ts
deepMerge(target: unknown, source: unknown): unknown
```

### EphemeralContextSchema

*Variable* — `packages/core/src/schemas.ts`

```ts
unknown
```

### ContextItemSchema

*Variable* — `packages/core/src/schemas.ts`

```ts
unknown
```

### QueryRequestSchema

*Variable* — `packages/core/src/schemas.ts`

```ts
unknown
```

### QueryResponseResultAcceptedSchema

*Variable* — `packages/core/src/schemas.ts`

Client-side query response result schemas.

These schemas represent individual query lifecycle events as consumed by the web library from the bridge.
They differ slightly from the wire-format schemas in

### QueryResponseResultProgressSchema

*Variable* — `packages/core/src/schemas.ts`

```ts
unknown
```

### QueryResponseResultCompleteSchema

*Variable* — `packages/core/src/schemas.ts`

```ts
unknown
```

### QueryResponseResultFailureSchema

*Variable* — `packages/core/src/schemas.ts`

```ts
unknown
```

### QueryResponseResultCancelSchema

*Variable* — `packages/core/src/schemas.ts`

```ts
unknown
```

### QueryResponseResultSchema

*Variable* — `packages/core/src/schemas.ts`

```ts
unknown
```
