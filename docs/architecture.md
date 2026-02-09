# Architecture

MCP-Web provides the glue to enable AI agents to control and interact
with your frontend app. The key architectural design aspect of MCP-Web is
that is treats the frontend as the source of truth and main control surface.

<div id="mcp-web-architecture" class="img"><div /></div>

This is accomplished by having the frontend define tools and exposing those
directly to AI via a bridge server that links browser sessions to an MCP server.
This way, both user and AI interactions can trigger the same state changes and
actions, which ensures user agency while still allowing automation and
integration through AI.

## MCP-Web vs Classic MCP Server

To better understand the difference let's compare MCP-Web approach shown above
to a "classic" web app plus MCP server architecture:

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
Frontend  ↔  MCPWeb()  ↔  MCPWebBridge()  ↔  AI App/Agent
    ╰─ Runs ─╯    ╰─ WS / SSE ─╯     ╰─ HTTP (Remote MCP) or STDIO ─╯
```

- Frontend app: runs `MCPWeb`
- `MCPWeb()`: registers and executes frontend tools
- `MCPWebBridge()`: exposes tools and forwards calls as an MCP server
- AI agent: connects via Remote MCP (HTTP) or via `MCPWebClient()` (STDIO)

### Connection Options

AI agents can connect to the bridge in two ways:

1. **Remote MCP (Recommended)**: Direct HTTP connection to the bridge server.
   The AI agent connects via URL with a token query parameter for session routing.
   This is the simplest setup with no intermediate process required.

2. **Stdio via MCPWebClient**: Uses `@mcp-web/client` as a stdio wrapper that
   the AI agent spawns as a subprocess. This approach is primarily useful when
   building agent servers that handle [frontend-triggered queries](./frontend-triggered-queries.md).

One can say that with MCP-Web, the frontend becomes the MCP server by executing
the tool calls. This inversion of control might seem odd at first but it makes
sense when you think about it.

MCP-Web's bridge server is just a thin layer that exposes the registered tools
and forwards tool calls and responses between the frontend and client.

The optional AI agent here serves as a way to enable "two-way communication" in
that it allows the frontend to issue queries. This is most useful if you want to
reuse the already registered tools.

## MCP As The Main Tool Protocol

MCP-Web uses the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
as the primary communication standard between AI agents and your frontend
application. The obvious benefit here is that it allows you to integrate
frontend tools easily with the MCP ecosystem.

### Tool Exposure and Call Flow

When your frontend registers tools using `mcp.addTool()`, `mcp.addStateTools()`,
or `mcp.addApp()` they are exposed to AI agents through the MCP protocol as
follows:

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

When an AI agent calls a tool, the flow reverses:

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

### Session-Based Tool Routing

It's worth nothing that tool calls are not just token scoped but also session
scored. In other words, you can run the same frontend app multiple times in
different browser tabs and each session registers its own set of tools.

The Bridge server manages multiple sessions and routes tool calls as follows:

**Single Session:**
- If only one frontend is connected, tools are automatically routed to that session
- No need for AI to identify which session to call

**Multiple Sessions:**
- Each session has unique tools or the same tools for different instances
- The Bridge aggregates all tools and may prefix them with session identifiers
- AI agents can use the `list_active_sessions` tool to see all connected frontends
- Tool calls can specify which session to target

## Frontend-Triggered Queries Design

In a classic MCP setup, requests always get triggered by the AI agent. This
is works well for scenarios where the user is only interfacing with the AI
agent but in the context of MCP-Web users might be working with both: an
AI agent and your frontend app.

In this case, it'd be nice to query AI directly from the frontend and reuse
the existing MCP tools. MCP-Web supports this through frontend-triggered queries
using a separate lightweight Agent API that makes use of the same MCP tools
you've registered.

::: note MCP Sampling
MCP's sampling concept allows servers to issue queries to a connected AI agent
but those queries need to be approached. This makes sense but there are also
scenarios where manual approval isn't a great user experience. This is what
frontend-triggered queries are useful for.
:::

### Query Flow

When you issue a query via `mcp.query()`, the query goes through the bridge
to the agent server. The bridge registers the query and scopes which tools
the agent can call during query execution.

```
Frontend            Bridge              Agent Server
   │                   │                     │
   │ mcp.query()       │                     │
   ├──────────────────►│ PUT /query          │
   │                   ├────────────────────►│
   │  ← query_accepted │                     │
   │◄──────────────────┤                     │
   │                   │                     │
   │       ← forwarded │          Tool calls │
   │◄──────────────────│◄────────────────────┤
   │ returns result →  │                     │
   │──────────────────►│────────────────────►│
   │                   │                     │
   │       ← forwarded │    ← query_progress │
   │◄──────────────────┤◄────────────────────┤
   │                   │                     │
   │       ← forwarded │    ← query_complete │
   │◄──────────────────┤◄────────────────────┤
   │                   │                     │
```

The bridge server acts as an intermediary that:

1. Routes frontend-triggered queries to the agent server
2. Scopes which tools are accessible during query execution
3. Forwards tool calls back to the frontend for execution

::: note
For details on how to use and implement frontend-triggered queries see our
[dedicated guide](./frontend-triggered-queries.md).
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
    background-image: url(https://storage.googleapis.com/mcp-web/mcp-web-architecture-light.svg)
  }
  #mcp-web-architecture div { padding-top: 20% }

  :root.dark #mcp-web-architecture {
    background-image: url(https://storage.googleapis.com/mcp-web/mcp-web-architecture-dark.svg)
  }

  #classic-architecture {
    width: 100%;
    background-image: url(https://storage.googleapis.com/mcp-web/classic-architecture-light.svg)
  }
  #classic-architecture div { padding-top: 20% }

  :root.dark #classic-architecture {
    background-image: url(https://storage.googleapis.com/mcp-web/classic-architecture-dark.svg)
  }
</style>
