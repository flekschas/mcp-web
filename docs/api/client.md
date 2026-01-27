# MCP-Client API

## Other

### MCPWebClient

*Class* — `packages/client/src/client.ts`

MCP client that connects AI agents (like Claude Desktop) to the bridge server.

MCPWebClient implements the MCP protocol and can run as a stdio server for
AI host applications, or be used programmatically in agent server code.

**Methods:**

```ts
contextualize(query: Query): MCPWebClient
```

Creates a contextualized client for a specific query.

All tool calls made through the returned client will be tagged with the
query UUID, enabling the bridge to track tool calls for that query.

```ts
callTool(name: string, args?: Record<string, unknown>, sessionId?: string): Promise<CallToolResult>
```

Calls a tool on the connected frontend.

Automatically includes query context if this is a contextualized client.
If the query has tool restrictions, only allowed tools can be called.

```ts
listTools(sessionId?: string): Promise<ListToolsResult | ErroredListToolsResult>
```

Lists all available tools from the connected frontend.

If this is a contextualized client with restricted tools, returns only
those tools. Otherwise fetches all tools from the bridge.

```ts
listResources(sessionId?: string): Promise<ListResourcesResult | ErroredListResourcesResult>
```

Lists all available resources from the connected frontend.

```ts
listPrompts(sessionId?: string): Promise<ListPromptsResult | ErroredListPromptsResult>
```

Lists all available prompts from the connected frontend.

```ts
sendProgress(message: string): Promise<void>
```

Sends a progress update for the current query.

Use this to provide intermediate updates during long-running operations.
Can only be called on a contextualized client instance.

```ts
complete(message: string): Promise<void>
```

Marks the current query as complete with a message.

Can only be called on a contextualized client instance.
If the query specified a responseTool, call that tool instead - calling
this method will result in an error.

```ts
fail(error: string | Error): Promise<void>
```

Marks the current query as failed with an error message.

Can only be called on a contextualized client instance.
Use this when the query encounters an unrecoverable error.

```ts
cancel(reason?: string): Promise<void>
```

Cancels the current query.

Can only be called on a contextualized client instance.
Use this when the user or system needs to abort query processing.

```ts
run(): void
```

Starts the MCP server using stdio transport.

This method is intended for running as a subprocess of an AI host like
Claude Desktop. It connects to stdin/stdout for MCP communication.

Cannot be called on contextualized client instances.

### MCPWebClientConfig

*Type* — `packages/client/src/types.ts`

```ts
z.input<typeof MCPWebClientConfigSchema>
```

### MCPWebClientConfigOutput

*Type* — `packages/client/src/types.ts`

```ts
z.infer<typeof MCPWebClientConfigSchema>
```

### TextContent

*Type* — `packages/client/src/types.ts`

```ts
z.infer<typeof TextContentSchema>
```

### ImageContent

*Type* — `packages/client/src/types.ts`

```ts
z.infer<typeof ImageContentSchema>
```

### Content

*Type* — `packages/client/src/types.ts`

```ts
z.infer<typeof ContentSchema>
```

### JsonRpcResponseSchema

*Variable* — `packages/client/src/schemas.ts`

```ts
unknown
```

### JsonRpcRequestSchema

*Variable* — `packages/client/src/schemas.ts`

```ts
unknown
```

### MCPWebClientConfigSchema

*Variable* — `packages/client/src/schemas.ts`

```ts
unknown
```

### TextContentSchema

*Variable* — `packages/client/src/schemas.ts`

```ts
unknown
```

### ImageContentSchema

*Variable* — `packages/client/src/schemas.ts`

```ts
unknown
```

### ContentSchema

*Variable* — `packages/client/src/schemas.ts`

```ts
unknown
```

### camelToSnakeCase

*Variable* — `packages/client/src/utils.ts`

```ts
unknown
```

### camelToSnakeCaseProps

*Variable* — `packages/client/src/utils.ts`

```ts
unknown
```
