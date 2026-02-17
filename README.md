<h1>
  <img src="https://storage.googleapis.com/mcp-web/logo.svg" width="24" height="24" alt="Logo" style="vertical-align: middle" />
  MCP-Web
</h1>

Enable AI agents to control frontend web apps directly via [MCP](https://modelcontextprotocol.io). Expose your application's state, actions, and UIs as MCP tools and MCP apps that AI can understand and invoke.

**[Documentation](https://mcp-web.dev)** · [Get Started](https://mcp-web.dev/get-started) · [Demos](https://mcp-web.dev/demos/todo)

Imagine asking AI to "select all outliers in this scatter plot" and watching the points highlight in real-time, or "mark all overdue tasks as high priority" in your project board. MCP-Web makes your frontend AI-controllable while keeping the user in the driver's seat.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://storage.googleapis.com/mcp-web/overview-dark.svg">
  <img src="https://storage.googleapis.com/mcp-web/overview-light.svg" alt="MCP-Web Overview" width="100%">
</picture>

With MCP-Web, your frontend becomes the main control surface for both humans and AI. Humans control state through the UI while AI controls the same state through MCP tools. This design makes human-AI parity straightforward: both have the same capabilities, so you can automate tasks with natural language and take over with direct interaction whenever you want.

## Key Features

- 🤖 **Enable AI to control** your frontend web apps directly via MCP
- 🛠️ **Dynamically expose state and actions** as type-safe tools
- ✨ **Auto-generate efficient tools** from schemas with built-in helpers
- 🔄 **Trigger AI queries from your frontend** using the same tools
- 🪟 **Interact with multiple browser sessions** independently
- 📊 **Build visual tools** with [MCP Apps](https://mcp-web.dev/visual-tools) that render UI inline in AI chat
- 🎯 **Works with any framework**: React, Vue, Svelte, vanilla JS

## Quick Start

### 1. Add to Your Frontend

```bash
npm install @mcp-web/core
```

```typescript
import { MCPWeb } from '@mcp-web/core';
import { z } from 'zod';

const mcp = new MCPWeb({ name: 'My App', autoConnect: true });

// Add a simple tool
mcp.addTool({
  name: 'get_greeting',
  description: 'Get a personalized greeting',
  handler: ({ name }) => ({ message: `Hello, ${name}!` }),
  inputSchema: z.object({ name: z.string() }),
});

// Or expose state with auto-generated getter/setter tools
let counter = 0;
mcp.addStateTools({
  name: 'counter',
  description: 'A counter value',
  get: () => counter,
  set: (value) => { counter = value; },
  schema: z.number(),
});
// Creates: get_counter() and set_counter({ value })
```

### 2. Run the Bridge

```bash
npx @mcp-web/bridge
# Runs WebSocket and MCP HTTP server on :3001
```

### 3. Connect Your AI Agent

You have two options to connect an MCP-compatible AI agent to the bridge.

#### Option 1: Remote MCP (Recommended)

The simplest approach is to connect directly via URL. Get the config from your frontend:

```typescript
console.log(JSON.stringify(mcp.remoteMcpConfig, null, 2));
```

```json
{
  "mcpServers": {
    "my-app": {
      "url": "https://localhost:3001?token=your-auth-token"
    }
  }
}
```

In Claude Desktop, add this via **Settings > Connectors > Add Custom Connector**.

#### Option 2: Local MCP Client

Alternatively, use `@mcp-web/client` as a local STDIO transport. Get the config from your frontend:

```typescript
console.log(JSON.stringify(mcp.mcpConfig, null, 2));
```

```json
{
  "mcpServers": {
    "my-app": {
      "command": "npx",
      "args": ["@mcp-web/client"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3002",
        "AUTH_TOKEN": "your-auth-token"
      }
    }
  }
}
```

Add this to your Claude Desktop config file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

> [!NOTE]
> Note, our client is also the best option for local development.

## How It Works

```
Frontend App  ↔  @mcp-web/core  ↔  @mcp-web/bridge  ↔  AI App/Agent
         ╰─ runs ─╯       ╰── WS/SSE ──╯     ╰─ Remote MCP ─╯
```

Your frontend registers tools with **core**, which connects to the **bridge** server. AI agents connect to the bridge directly via Remote MCP (recommended), or through a local **client** via STDIO.

## Packages

| Package | Description |
|---------|-------------|
| [@mcp-web/core](packages/core) | Frontend library for registering tools and state |
| [@mcp-web/bridge](packages/bridge) | WebSocket/HTTP bridge server |
| [@mcp-web/client](packages/client) | MCP client for connecting AI agents to the bridge |
| [@mcp-web/app](packages/app) | Build tooling for MCP Apps (visual tools rendered in AI chat) |
| [@mcp-web/react](packages/integrations/react) | React hooks for state management |
| [@mcp-web/tools](packages/tools) | Reusable tool implementations (screenshots, etc.) |
| [@mcp-web/mcpb](packages/mcpb) | Generate `.mcpb` bundles for one-click Claude Desktop installation |
| [@mcp-web/types](packages/types) | Shared TypeScript type definitions |
| [@mcp-web/decompose-zod-schema](packages/decompose-zod-schema) | Zod schema decomposition utilities |

## Learn More

- [Get Started Guide](https://mcp-web.dev/get-started) - Full setup walkthrough
- [Visual Tools](https://mcp-web.dev/visual-tools) - Build MCP Apps that render UI in AI chat
- [Architecture](https://mcp-web.dev/architecture) - How the pieces fit together
- [API Reference](https://mcp-web.dev/api) - Complete API documentation
- [Todo Demo](https://mcp-web.dev/demos/todo) - Full CRUD example

## License

[Apache License 2.0](./LICENSE)
