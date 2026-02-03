<h1>
  <img src="https://storage.googleapis.com/mcp-web/logo.svg" width="24" height="24" alt="Logo" style="vertical-align: middle" />
  MCP-Web
</h1>

Enable AI agents to control frontend web apps directly via [MCP](https://modelcontextprotocol.io). Expose your application's state and actions as tools that AI can understand and invoke.

**[Documentation](https://mcp-web.dev)** · [Get Started](https://mcp-web.dev/get-started) · [Demos](https://mcp-web.dev/demos/todo)

## How It Works

```
Frontend App  ↔  @mcp-web/core  ↔  @mcp-web/bridge  ↔  @mcp-web/client  ↔  AI App/Agent
          ╰─ runs ─╯       ╰─ WS/SSE ─╯        ╰─ HTTP ─╯          ╰─ STDIO ─╯
```

Your frontend registers tools with **core**, which connects to the **bridge** server. AI agents connect via the **client**, which communicates with the bridge to invoke your frontend tools.

## Key Features

- 🤖 **Enable AI to control** your frontend web apps directly via MCP
- 🛠️ **Dynamically expose state and actions** as type-safe tools
- ✨ **Auto-generate efficient tools** from schemas with built-in helpers
- 🔄 **Trigger AI queries from your frontend** using the same tools
- 🪟 **Interact with multiple browser sessions** independently
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

Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "my-app": {
      "command": "npx",
      "args": ["@mcp-web/client"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3001",
        "AUTH_TOKEN": "your-auth-token"
      }
    }
  }
}
```

Get the full config (including auth token) from `mcp.mcpConfig` in your frontend.

## Packages

| Package | Description |
|---------|-------------|
| [@mcp-web/core](packages/core) | Frontend library for registering tools and state |
| [@mcp-web/bridge](packages/bridge) | WebSocket/HTTP bridge server |
| [@mcp-web/client](packages/client) | MCP client for connecting AI agents to the bridge |
| [@mcp-web/react](packages/integrations/react) | React hooks for state management |
| [@mcp-web/tools](packages/tools) | Reusable tool implementations (screenshots, etc.) |

## Learn More

- [Get Started Guide](https://mcp-web.dev/get-started) - Full setup walkthrough
- [Architecture](https://mcp-web.dev/architecture) - How the pieces fit together
- [API Reference](https://mcp-web.dev/api) - Complete API documentation
- [Todo Demo](https://mcp-web.dev/demos/todo) - Full CRUD example

## License

[Apache License 2.0](./LICENSE)
