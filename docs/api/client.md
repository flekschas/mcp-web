# MCP-Client API

## Other

### MCPWebClient

*Class* — `packages/client/src/client.ts`

**Methods:**

```ts
contextualize(query: Query): MCPWebClient
```

Create a contextualized client for a specific query.
All tool calls made through this client will be tagged with the query UUID.

```ts
callTool(name: string, args?: Record<string, unknown>, sessionId?: string): Promise<CallToolResult>
```

Call a tool, automatically augmented with query context if this is a
contextualized client.

```ts
listTools(sessionId?: string): Promise<ListToolsResult | ErroredListToolsResult>
```

List all available tools.
If this is a contextualized client with restricted tools, returns only those tools.
Otherwise fetches all tools from the bridge.

```ts
listResources(sessionId?: string): Promise<ListResourcesResult | ErroredListResourcesResult>
```

List all available resources.

```ts
listPrompts(sessionId?: string): Promise<ListPromptsResult | ErroredListPromptsResult>
```

List all available prompts.

```ts
sendProgress(message: string): Promise<void>
```

Send a progress update for the current query.
Can only be called on a contextualized client instance.

```ts
complete(message: string): Promise<void>
```

Mark the current query as complete with a message.
Can only be called on a contextualized client instance.
Note: If the query specified a responseTool, calling this method will result in an error.

```ts
fail(error: string | Error): Promise<void>
```

Mark the current query as failed with an error message.
Can only be called on a contextualized client instance.
Use this when the query encounters an error during processing.

```ts
cancel(reason?: string): Promise<void>
```

Cancel the current query.
Can only be called on a contextualized client instance.
Use this when the user or system needs to abort query processing.

```ts
run(): void
```

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
