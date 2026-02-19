# MCP-Web vs WebMCP vs AG-UI

There are three projects out there with very similar names and goals. And all
three aim to connect AI agents with web frontends. They share the same
goal but differ in architecture, scope, and where they draw the line between
tools and UI.

## At a Glance

| | MCP-Web | WebMCP | AG-UI |
|---|---|---|---|
| **Core idea** | Frontend state _is_ the tool surface | Browser-native tool registration API | Event protocol between agents and UIs |
| **Protocol** | MCP only | W3C Web API (proposed) | AG-UI (custom event protocol) |
| **Transport** | WebSocket bridge server | Native browser API (`navigator.modelContext`) | Agent-dependent |
| **Status** | Available today | W3C Community Group draft | Available today |
| **State management** | Declarative reactive state exposed as tools | Not specified | Separate event system (snapshots + JSON patches) |
| **Human-AI parity** | Built-in (same state, same interface) | Depends on implementation | Requires separate engineering |

## MCP-Web

MCP-Web treats the frontend as both the source of truth and the control surface.
You define your app state with a Zod schema, expose it via `addStateTools()`,
and both humans and AI interact with the same reactive state. When the agent
calls a tool, it directly mutates the state that renders the UI.

```
AI Agent ↔ MCP ↔ Bridge Server ↔ Frontend State ↔ UI
Human ─────────────────────────────╯
```

There is no separate protocol for state sync, no event lifecycle, and no
distinction between tools and UI. The simplicity is the point: your frontend
app does not need to know it is being controlled by AI.

## WebMCP

[WebMCP](https://webmachinelearning.github.io/webmcp/) is a proposed W3C
Community Group spec that adds a `navigator.modelContext` API to browsers.
The names sound similar and the fundamental idea is the same: let agents
directly communicate with browser sessions. WebMCP's `registerTool()` is
essentially what MCP-Web's `addTool()` does today, but built into the browser
itself.

When WebMCP ships natively in browsers, it could replace MCP-Web's bridge server
and make the setup even simpler. We intend to align MCP-Web with the WebMCP spec
so that adopting the standard is seamless once it lands.

Beyond transport, MCP-Web provides higher-level utilities that remain useful
regardless of how tools get delivered to the agent: declarative state modeling,
automatic tool generation from Zod schemas, and visual tools for rendering UI to
agents. So the two are complementary: MCP-Web works today with any
MCP-compatible agent, and WebMCP could become the native transport layer
underneath.

## AG-UI

[AG-UI](https://docs.ag-ui.com/) is an event-based protocol for
agent-to-frontend communication. It is architecturally further apart from
MCP-Web and WebMCP. Rather than treating the frontend as a tool surface, AG-UI
introduces its own protocol for streaming text messages, displaying agent
reasoning, coordinating sub-agents, and managing state.

AG-UI's [protocol stack diagram](https://docs.ag-ui.com/agentic-protocols)
shows tools and UI as separate layers. Tools are request-response side channels
(agent calls a function, frontend handles it, returns a result), state
synchronization is a separate mechanism (snapshots + JSON patches), and UI
rendering is yet another concern. Three parallel systems, each with its own
events and data flow.

This makes AG-UI powerful for building conversational agent UIs with streaming,
but it means human-AI parity is something you have to engineer rather than
something the architecture gives you.

## When to Use What

**Choose MCP-Web** if you want AI to control the same frontend state that humans
interact with. Human-AI is straightforward: expose type-safe tools from Zod
schemas. And it works today with any MCP-compatible agent (Claude Desktop,
Cursor, etc.).

**Watch WebMCP** as the emerging browser-native standard. When it ships, it will
simplify transport for MCP-Web and similar libraries.

**Choose AG-UI** if you are building a conversational agent UI that needs
streaming text, reasoning display, sub-agent coordination, or other patterns
beyond state control.
