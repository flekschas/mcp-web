# Architecture

MCP-Web provides the glue to enable AI apps or agents to control and interact
with your frontend web app. The key architectural design aspect of MCP-Web is
that is treats the frontend as the source of truth and main control surface.

<div class="img architecture"><div /></div>

This is accomplished by having the frontend define tools and exposing those
directly to AI via a bridge server that links browser sessions to an MCP server.
This way, both user and AI interactions can trigger the same state changes and
actions, which ensures user agency while still allowing automation and
integration through AI.

### MCP-Web vs Classic MCP Server

To better understand the difference between the MCP-Web approach and a "classic"
web app plus MCP server, let's compare the two.

#### Classic MCP Server Setup

```
AI Agent  ↔  MCP Server  ↔  Database  ↔  WebSocket  ↔  Frontend
     ╰─ calls ─╯   ╰─ updates ─╯  ╰─ informs ─╯  ╰─ notifies ─╯
```

- MCP server manipulates backend resources (database, APIs, files)
- Frontend receives updates via WebSocket/polling
- Source of truth: Database
- AI changes → DB → Frontend

#### MCP-Web Setup

```
AI Agent  ↔  MCP Server + WebSocket  ↔  Frontend  ↔  Database
     ╰─ calls ─╯              ╰─ notifies ─╯  ╰─ notifies ─╯
```

- MCP server routes directly to frontend state and actions
- Frontend is both the execution environment and source of truth
- Source of truth: Frontend
- AI changes → Frontend (optionally → DB)

::: tip
The key insight here is that with MCP-Web, the frontend becomes the main point
of control for reading and writing data.
:::

#### Why MCP-Web's approach?

**Choose MCP-Web when:**

- _Rich ephemeral UI state_: Selections, filters, animations, layouts that don't belong in a database
- _Multiple views of data_: Same data resource has many visual representations
- _Frontend-first validation_: UI enforces constraints and business logic
- _Preserve user agency_: User can see and interrupt AI actions in real-time
- _No backend modifications_: Add AI capabilities without changing (or needing) the backend

**Choose classic MCP server when:**

- _Frontend is a thin view layer_ over backend resources
- _Multi-user collaboration_ requires database as source of truth
- _AI needs to trigger non-user facing_ tools

### How MCP-Web Works

Instead of having AI communicate with a backend database and have the backend
push changes to the frontend, with MCP-Web, AI directly communicates with the
frontend via dual server that is both an MCP server and a websocket server
connected to your frontend browser sessions. This is accomplished via three
packages: Web, Bridge, Client. These three packages communicate as follows:

```
Frontend  ↔  MCP-Web/Web  ↔  MCP-Web/Bridge  ↔  MCP-Web/Client  ↔  AI App/Agent
     ╰─ Runs ─╯     ╰─ WebSocket ─╯      ╰─ HTTP ─╯        ╰─ STDIO ─╯
```

- Frontend app: runs MCP-Web
- MCP-Web Web: registers and executes frontend tools
- MCP-Web Bridge: exposes tools and forwards calls as an MCP server
- MCP-Web Client: issues requests to the MCP server
- [Optional] AI agent: handles frontend-triggered queries

## MCP As The Main Tool Protocol

MCP-Web uses the Model Context Protocol (MCP) as the primary communication
standard between AI agents and your frontend application.

### How Tools Are Exposed

When your frontend registers tools using `mcp.addTool()` or `mcp.addStateTool()` (which returns [getter, setter(s), cleanup]), they are exposed to AI agents through the MCP protocol:

```
1. Frontend calls mcp.addTool()
   ↓
2. MCPWeb (packages/web) validates tool definition
   ↓
3. Tool is sent to Bridge via WebSocket
   ↓
4. Bridge stores tool in session registry
   ↓
5. MCP Client (packages/client) exposes tool to AI agent
   ↓
6. AI agent sees tool in available tools list
```

### Tool Discovery Mechanism

The MCP Client implements the `tools/list` MCP method to provide tool discovery:

```typescript
// AI Agent requests available tools
→ Request: { method: "tools/list" }

← Response: {
  tools: [
    {
      name: "get_todos",
      description: "Get the current list of todos",
      inputSchema: { type: "object", properties: {...} },
      outputSchema: { type: "object", properties: {...} }
    },
    {
      name: "create_todo",
      description: "Create a new todo item",
      inputSchema: {...},
      outputSchema: {...}
    }
  ]
}
```

The AI agent can then call any discovered tool using the `tools/call` MCP method.

### Session-Based Tool Routing

The Bridge server manages multiple frontend sessions and routes tool calls appropriately:

**Single Session:**
- If only one frontend is connected, tools are automatically routed to that session
- No ambiguity—AI agent seamlessly controls the active frontend

**Multiple Sessions:**
- Each session has unique tools or the same tools for different instances
- The Bridge aggregates all tools and may prefix them with session identifiers
- AI agents can use the `list_active_sessions` tool to see all connected frontends
- Tool calls can specify which session to target

**Example with multiple sessions:**
```typescript
// Session 1: Todo App
Tools: get_todos, create_todo, update_todo

// Session 2: Another Todo App instance
Tools: get_todos, create_todo, update_todo

// Bridge exposes:
Tools:
  - list_active_sessions (bridge-provided)
  - get_todos (auto-routed if one session, or requires session context)
  - create_todo
  - update_todo
```

### Multi-Session Tool Aggregation

The Bridge server aggregates tools from all active sessions:

```typescript
// Bridge maintains a session registry:
{
  "session-abc-123": {
    origin: "http://localhost:5173",
    pageTitle: "My Todo App",
    tools: ["get_todos", "create_todo", "update_todo"],
    lastActivity: 1234567890
  },
  "session-def-456": {
    origin: "http://localhost:5174",
    pageTitle: "My Checkers Game",
    tools: ["get_game_state", "make_move"],
    lastActivity: 1234567891
  }
}

// Aggregated tool list exposed via MCP:
[
  { name: "list_active_sessions", ... },  // Bridge-provided
  { name: "get_todos", ... },              // From session-abc-123
  { name: "create_todo", ... },
  { name: "update_todo", ... },
  { name: "get_game_state", ... },         // From session-def-456
  { name: "make_move", ... }
]
```

### Tool Call Flow

When an AI agent calls a tool:

```
1. AI agent calls tool via MCP Client
   → tools/call { name: "create_todo", arguments: {...} }

2. MCP Client forwards to Bridge via HTTP
   → POST /tool-call
   → { toolName: "create_todo", toolInput: {...} }

3. Bridge identifies target session
   → Looks up which session has "create_todo" tool
   → If multiple, uses session routing logic

4. Bridge sends to Frontend via WebSocket
   → { type: "tool-call", toolName: "create_todo", toolInput: {...} }

5. MCPWeb executes tool handler
   → const result = await handler(toolInput)
   → Validates with Zod schemas

6. Frontend sends result back via WebSocket
   → { type: "tool-response", result: {...} }

7. Bridge forwards to MCP Client via HTTP response
   ← { content: [...] }

8. MCP Client returns to AI agent
   ← Tool result in MCP format
```

### MCP Standard Compliance

MCP-Web implements the core MCP specification:

- **Protocol Version**: Compatible with MCP 2024-11-05
- **Transport**: STDIO (MCP Client ↔ AI Agent) and HTTP (MCP Client ↔ Bridge)
- **Methods Implemented**:
  - `tools/list`: List all available tools
  - `tools/call`: Execute a tool
  - Connection lifecycle management
- **Tool Schema**: Tools use JSON Schema for input/output validation
- **Error Handling**: Proper MCP error responses with codes and messages

This ensures compatibility with any AI agent that supports the Model Context Protocol, including Claude Desktop, custom agents, and future MCP-compatible systems.

---

## AI Agent API

For frontend-triggered queries (when your app wants to ask the AI for help), MCP-Web provides a separate Agent API.

### Query Endpoints

The Agent server exposes HTTP endpoints for frontend-triggered queries:

#### PUT /query

Initiate a new AI agent query from the frontend.

**Request:**
```typescript
PUT http://localhost:3003/query

{
  uuid: "unique-query-id",
  prompt: "Analyze this and suggest improvements",
  context: [
    {
      name: "game_state",
      value: { /* current state */ },
      schema: { /* JSON schema */ },
      description: "Current game state",
      type: "ephemeral"
    }
  ],
  responseTool: {
    name: "apply_suggestion",
    inputSchema: { /* JSON schema */ },
    outputSchema: { /* JSON schema */ }
  }
}
```

**Response (Streaming):**
The agent streams events back via WebSocket connection:

```typescript
// 1. Query accepted
{
  type: "query_accepted",
  uuid: "unique-query-id"
}

// 2. Progress updates (optional, multiple)
{
  type: "query_progress",
  uuid: "unique-query-id",
  content: "Analyzing game state..."
}

// 3. Completion
{
  type: "query_complete",
  uuid: "unique-query-id",
  result: { /* AI agent's response */ }
}

// Or failure
{
  type: "query_failure",
  uuid: "unique-query-id",
  error: "Error message"
}
```

### Agent-Specific Query Context

Queries can include context in two forms:

**Ephemeral Context:**
Data provided just for this query, not exposed as persistent tools:

```typescript
context: [
  {
    name: "user_data",
    value: { /* data to analyze */ },
    schema: UserDataSchema,
    description: "User-uploaded data for analysis",
    type: "ephemeral"
  }
]
```

**Tool Context:**
Reference to existing tools that the AI can call:

```typescript
context: [
  {
    name: "get_game_state",
    type: "tool",
    // AI agent can call this tool during query processing
  }
]
```

### Authentication for Agent Queries

Agent queries use the same authentication as the main connection:

```typescript
// Frontend includes auth token in query
const query = mcp.query({
  prompt: "...",
});
// MCPWeb automatically includes authToken in request

// Agent verifies token matches the session
if (request.authToken !== session.authToken) {
  return { error: "Unauthorized" };
}
```

### Response Handling

The Agent processes queries by:

1. **Accepting the Query**
   - Validates authentication
   - Sends `query_accepted` event
   - Queues query for processing

2. **Processing**
   - Calls the underlying AI model/service
   - Provides query context (ephemeral data + available tools)
   - Streams progress updates via `query_progress` events

3. **Using Response Tools**
   - If `responseTool` is specified, instructs AI to respond by calling that tool
   - Tool call is executed through normal tool call flow
   - Result is returned in `query_complete` event

4. **Completion**
   - Sends `query_complete` with final result
   - Or `query_failure` if processing fails
   - Cleans up query state

### Query Lifecycle

```
Frontend                    Agent Server                    AI Service
   │                             │                               │
   │ PUT /query                  │                               │
   ├────────────────────────────►│                               │
   │                             │                               │
   │ ← query_accepted            │                               │
   │◄────────────────────────────┤                               │
   │                             │                               │
   │                             │  Process with context         │
   │                             ├──────────────────────────────►│
   │                             │                               │
   │ ← query_progress            │  ← Streaming response         │
   │◄────────────────────────────┤◄──────────────────────────────┤
   │                             │                               │
   │                             │  (AI may call tools)          │
   │                             ├─────┐                         │
   │                             │     │ Tool execution          │
   │                             │◄────┘ via Bridge              │
   │                             │                               │
   │ ← query_complete            │  ← Final result              │
   │◄────────────────────────────┤◄──────────────────────────────┤
   │                             │                               │
```

### Query Cancellation

Frontends can cancel in-flight queries:

```typescript
// Frontend cancels query
query.cancel();
// or via AbortController
abortController.abort();

// Agent receives cancellation
{
  type: "query_cancel",
  uuid: "unique-query-id"
}

// Agent stops processing and responds
{
  type: "query_cancel",
  uuid: "unique-query-id"
}
```

### Agent Implementation

The Agent server is designed to be:

- **Pluggable**: Can integrate with different AI services (Claude API, OpenAI, custom models)
- **Stateful**: Manages query lifecycle and progress tracking
- **Streaming**: Provides real-time progress updates
- **Secure**: Validates authentication for all query requests

Example agent configuration:

```typescript
startAgent({
  port: 3003,
  bridgeUrl: 'http://localhost:3002',
  // Provider-specific configuration
  aiProvider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
});
```

This architecture allows frontends to leverage AI capabilities on-demand while maintaining the security and session management of the overall MCP-Web system.
