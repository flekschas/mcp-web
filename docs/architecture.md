# Architecture

MCP-Web provides the glue to enable AI apps or agents to control and interact
with your frontend web app. The key architectural design aspect of MCP-Web is
that is treats the frontend as the source of truth and main control surface.

<div id="mcp-web-architecture" class="img"><div /></div>

This is accomplished by having the frontend define tools and exposing those
directly to AI via a bridge server that links browser sessions to an MCP server.
This way, both user and AI interactions can trigger the same state changes and
actions, which ensures user agency while still allowing automation and
integration through AI.

## MCP-Web vs Classic MCP Server

To better understand the difference let's compare MCP-Web approach shown above
to a"classic" web app plus MCP server architecture:

<div id="classic-architecture" class="img"><div /></div>

### Classic MCP Server Setup

```
AI Agent  ↔  MCP Server  ↔  Database  ↔  WebSocket/SSE  ↔  Frontend
     ╰─ calls ─╯   ╰─ updates ─╯  ╰─ informs ─╯  ╰─ notifies ─╯
```

- MCP server manipulates backend resources (database, APIs, files)
- Frontend receives updates via WebSocket/polling
- Source of truth: Database
- AI changes → DB → Frontend

### MCP-Web Setup

```
AI Agent  ↔  MCP Server + WebSocket/SSE  ↔  Frontend  ↔  Database
     ╰─ calls ─╯                 ╰─ notifies ─╯  ╰─ updates ─╯
```

- MCP server routes directly to frontend state and actions
- Frontend is both the execution environment and source of truth
- Source of truth: Frontend
- AI changes → Frontend (optionally → DB)

::: tip Key Insight
With MCP-Web, the **frontend** becomes the main point
of control for reading and writing data.
:::

## Why MCP-Web's Approach?

As with everything, MCP-Web's approach of making the frontend the main point of
control has pros and cons and it depends on your use case whether it's useful or
not.

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

## How MCP-Web Works

Instead of having AI communicate with a backend database and have the backend
push changes to the frontend, with MCP-Web, AI directly communicates with the
frontend via dual server that is both an MCP server and a websocket server
connected to your frontend browser sessions. This is accomplished via three
packages: Web, Bridge, Client. These three packages communicate as follows:

```
Frontend  ↔  MCPWeb()  ↔  MCPWebBridge()  ↔  MCPWebClient()  ↔  AI App/Agent
    ╰─ Runs ─╯    ╰─ WS / SSE ─╯     ╰─ HTTP ─╯        ╰─ STDIO ─╯
```

- Frontend app: runs `MCPWeb`
- `MCPWeb()`: registers and executes frontend tools
- `MCPWebBridge()`: exposes tools and forwards calls as an MCP server
- `MCPWebClient()`: issues requests to the MCP server
- [Optional] AI agent: handles frontend-triggered queries

One can say that with MCP-Web, the frontend becomes the MCP server by executing
the tool calls. This inversion of control might seem odd at first but it makes
sense when you th

MCP-Web's bridge server is just a thin layer that exposes the registered tools
and forwards tool calls and responses between the frontend and client.

The optional AI agent here serves as a way to enable "two-way communication" in
that it allows the frontend to issue queries. This is most useful if you want to
reuse the already registered tools.

## MCP As The Main Tool Protocol

MCP-Web uses the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
as the primary communication standard between AI agents and your frontend
application. The obvious benefit here is that it allows you to integrate
frontend easily with the MCP ecosystem.

### How Tools Are Exposed

When your frontend registers tools using `mcp.addTool()` or `mcp.addStateTools()`,
they are exposed to AI agents through the MCP protocol as follows:

```
1. Frontend calls mcp.addTool()
   ↓
2. MCPWeb (packages/core) validates tool definition
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
- No need for AI to identify which session to call

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
  { name: "get_todos", ... },             // From session-abc-123
  { name: "create_todo", ... },
  { name: "update_todo", ... },
  { name: "get_game_state", ... },        // From session-def-456
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

This ensures compatibility with any AI agent that supports the Model Context
Protocol, like Claude Desktop, custom agents, and future MCP-compatible systems.

## AI Agent API

In a classic MCP setup, requests always get triggered by the AI app/agent. This
is super fine for scenarios where the user is only interfacing with the AI
app/agent but in the context of MCP-Web your user might be working with both: an
AI app and your frontend app.

In this case, it'd be nice to query AI directly from the frontend and reuse
the existing MCP tools. MCP-Web supports this through frontend-triggered queries
using a separate lightweight Agent API that makes use of the same MCP tools
you've registered.

### Why Frontend-Triggered Queries?

While MCP traditionally flows from AI agent → tools, many AI-native web apps
need the reverse: triggering AI queries from user interactions. The Agent API
enables this while reusing the same MCP tools, so both AI apps (like Claude
Desktop) and your web app can use identical tool definitions.

### Query Flow

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
   │ ← query_complete            │  ← Final result               │
   │◄────────────────────────────┤◄──────────────────────────────┤
   │                             │                               │
```

The agent server acts as an intermediary that:

1. Receives queries from the frontend via HTTP
2. Streams progress events back via WebSocket
3. Can call MCP tools through the Bridge during processing
4. Returns structured results or executes response tools

### Agent Design Principles

The Agent server is designed to be:

- **Pluggable**: Integrate with different AI services (Claude API, OpenAI, custom models)
- **Stateful**: Manages query lifecycle and progress tracking
- **Streaming**: Provides real-time progress updates to the frontend
- **Secure**: Validates authentication for all query requests

::: tip Usage Guide
For implementation details, code examples, and usage patterns, see the
[Frontend-Triggered Queries](./frontend-triggered-queries.md) guide.
:::

<style scoped>
  .img {
    max-width: 100%;
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
  }

  #mcp-web-architecture {
    width: 100%;
    background-image: url(https://storage.googleapis.com/flekschas/mcp-web/mcp-web-architecture-light.svg)
  }
  #mcp-web-architecture div { padding-top: 20% }

  :root.dark #mcp-web-architecture {
    background-image: url(https://storage.googleapis.com/flekschas/mcp-web/mcp-web-architecture-dark.svg)
  }

  #classic-architecture {
    width: 100%;
    background-image: url(https://storage.googleapis.com/flekschas/mcp-web/classic-architecture-light.svg)
  }
  #classic-architecture div { padding-top: 20% }

  :root.dark #classic-architecture {
    background-image: url(https://storage.googleapis.com/flekschas/mcp-web/classic-architecture-dark.svg)
  }
</style>
