# MCP-Web Bridge API

### MCPWebBridge

*Class* — `packages/bridge/src/core.ts`

Core bridge server that connects web frontends to AI agents via MCP.

MCPWebBridge manages WebSocket connections from frontends, routes tool calls,
handles queries, and exposes an HTTP API for MCP clients. It is runtime-agnostic
and delegates I/O operations to adapters.

**Properties:**

```ts
MCP_SESSION_IDLE_TIMEOUT_MS: any
```

**Accessors:**

```ts
get config(): MCPWebConfigOutput
```

The validated bridge configuration.

**Methods:**

```ts
getHandlers(): BridgeHandlers
```

Returns handlers for wiring to runtime-specific I/O.

Use these handlers to connect the bridge to your runtime's WebSocket
and HTTP servers. Pre-built adapters (Node, Bun, Deno, PartyKit) handle
this automatically.

```ts
close(): Promise<void>
```

Gracefully shuts down the bridge.

Closes all WebSocket connections, cancels scheduled tasks, and clears
all internal state. Call this when shutting down your server.

### AuthenticateMessage

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
type: 'authenticate'
```

```ts
sessionId: string
```

```ts
authToken: string
```

```ts
origin: string
```

```ts
pageTitle?: string
```

```ts
sessionName?: string
```

```ts
userAgent?: string
```

```ts
timestamp: number
```

### AuthenticatedMessage

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
type: 'authenticated'
```

```ts
mcpPort?: number
```

```ts
sessionId: string
```

```ts
success: boolean
```

### AuthenticationFailedMessage

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
type: 'authentication-failed'
```

```ts
error: string
```

```ts
code: string
```

### RegisterToolMessage

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
type: 'register-tool'
```

```ts
tool: {
    name: string;
    description: string;
    inputSchema?: z.core.JSONSchema.JSONSchema;
    outputSchema?: z.core.JSONSchema.JSONSchema;
    _meta?: Record<string, unknown>;
  }
```

### RegisterResourceMessage

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
type: 'register-resource'
```

```ts
resource: ResourceMetadata
```

### ResourceReadMessage

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
type: 'resource-read'
```

```ts
requestId: string
```

```ts
uri: string
```

### ResourceResponseMessage

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
type: 'resource-response'
```

```ts
requestId: string
```

```ts
content?: string
```

```ts
blob?: string
```

```ts
mimeType: string
```

```ts
error?: string
```

### ActivityMessage

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
type: 'activity'
```

```ts
timestamp: number
```

### ToolCallMessage

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
type: 'tool-call'
```

```ts
requestId: string
```

```ts
toolName: string
```

```ts
toolInput?: Record<string, unknown>
```

```ts
queryId?: string
```

### ToolResponseMessage

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
type: 'tool-response'
```

```ts
requestId: string
```

```ts
result: unknown
```

### TrackedToolCall

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
tool: string
```

```ts
arguments: unknown
```

```ts
result: unknown
```

### QueryTracking

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
sessionId: string
```

```ts
responseTool?: string
```

```ts
toolCalls: TrackedToolCall[]
```

```ts
ws: WS.WebSocket
```

```ts
state: QueryState
```

```ts
tools?: ToolMetadata[]
```

```ts
restrictTools?: boolean
```

### McpRequest

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
jsonrpc: string
```

```ts
id: string | number
```

```ts
method: string
```

```ts
params?: {
    name?: string;
    arguments?: Record<string, unknown>;
    _meta?: McpRequestMetaParams;
  }
```

### McpResponse

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
jsonrpc: string
```

```ts
id: string | number
```

```ts
result?: unknown
```

```ts
error?: {
    code: number;
    message: string;
    data?: unknown;
  }
```

### ToolDefinition

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
name: string
```

```ts
description: string
```

```ts
inputSchema?: z.core.JSONSchema.JSONSchema
```

```ts
outputSchema?: z.core.JSONSchema.JSONSchema
```

```ts
handler?: string
```

### SessionData

*Interface* — `packages/bridge/src/types.ts`

**Properties:**

```ts
ws: WS.WebSocket
```

```ts
authToken: string
```

```ts
origin: string
```

```ts
pageTitle?: string
```

```ts
sessionName?: string
```

```ts
userAgent?: string
```

```ts
connectedAt: number
```

```ts
lastActivity: number
```

```ts
tools: Map<string, ToolDefinition>
```

```ts
resources: Map<string, ResourceMetadata>
```

### FrontendMessage

*Type* — `packages/bridge/src/types.ts`

```ts
| AuthenticateMessage
  | RegisterToolMessage
  | RegisterResourceMessage
  | ActivityMessage
  | ToolResponseMessage
  | ResourceResponseMessage
  | QueryMessage
  | QueryCompleteClientMessage
  | QueryProgressMessage
  | QueryCancelMessage
```

### BridgeMessage

*Type* — `packages/bridge/src/types.ts`

```ts
| AuthenticatedMessage
  | AuthenticationFailedMessage
  | ToolCallMessage
  | ResourceReadMessage
  | QueryAcceptedMessage
  | QueryProgressMessage
  | QueryCompleteBridgeMessage
  | QueryFailureMessage
  | QueryCancelMessage
```

### QueryState

*Type* — `packages/bridge/src/types.ts`

```ts
'active' | 'completed' | 'failed' | 'cancelled'
```

### MissingAuthenticationErrorMessage

*Variable* — `packages/bridge/src/schemas.ts`

```ts
unknown
```

### MissingAuthenticationErrorMessageSchema

*Variable* — `packages/bridge/src/schemas.ts`

```ts
unknown
```

### InvalidAuthenticationErrorMessage

*Variable* — `packages/bridge/src/schemas.ts`

```ts
unknown
```

### InvalidAuthenticationErrorMessageSchema

*Variable* — `packages/bridge/src/schemas.ts`

```ts
unknown
```
