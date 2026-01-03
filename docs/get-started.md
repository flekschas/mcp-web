# Get Started

MCP-Web is a JavaScript library to enable AI apps/agents (like Claude Desktop) to control frontend web apps directly. The library allows your app to expose state and actions as tools using [MCP](https://modelcontextprotocol.io).
Using this approach you can build more effective AI interactions while preserving
user agency by making the frontend the main control surface.

<div id="overview" class="img"><div /></div>

Imagine asking AI to "select all outliers in this scatter plot" and watching the points highlight in real-time, or "try a logarithmic scale on the y-axis" and seeing the chart rerender. MCP-Web makes your frontend AI-controllable while keeping you in the driver's seat.

## Key Features

- 🔌 **Direct control** of frontend web apps from AI agents via MCP
- 🛠️ **Expose UI state and actions** as type-safe tools using Zod schemas
- 🔄 **Bidirectional**: queries can be triggered from either your AI app or the frontend
- 🎯 **Framework agnostic**: React, Vue, Svelte, vanilla JS, and more
- 🚀 **No backend required**: connect AI directly to your frontend

## Why Use MCP-Web

MCP-Web is ideal when you want to:

- **Make frontend web apps accessible to AI agents** without backend modifications
- **Your UI has rich ephemeral state** like selections, filters, or layouts settings that shouldn't live in a database (or in other words, your view model is a lot richer than your data model)
- **Preserve user agency** by letting the frontend (i.e., user interface) be the source of truth and control surface.
- **Build mixed-initiative applications** where humans and AI collaborate through a visual interface
- **Create reliable AI interactions** by modeling user interactions as declarative
state actions and expose those as MCP tools
- **Skip complex authentication** by letting your existing auth approach handle access control and then expose tools conditionally

MCP-Web might be overkill or not ideal if:

- Your frontend is a more or less plain representation of your backend data resources
- You need multi-user real-time collaboration where a database should be the source of truth

## Quick Start

### Installation

```bash
npm install @mcp-web/web
```

### Frontend Web App

In your frontend web app, create an MCP-Web instance and connect to the bridge:

```typescript
import { MCPWeb } from '@mcp-web/web';

const mcp = new MCPWeb({
  name: 'My App',
  description: 'A web application controllable by AI agents',
  autoConnect: true, // Auto-connects to bridge on localhost:3001 by default
});
```

To a simple tool that AI agents can call:

```typescript
import { z } from 'zod';

mcp.addTool({
  name: 'get_greeting',
  description: 'Get a personalized greeting',
  handler: ({ name }) => {
    return { message: `Hello, ${name}!` };
  },
  inputSchema: z.object({
    name: z.string().describe('Name to greet')
  }),
  outputSchema: z.object({
    message: z.string()
  })
});
```

In most cases, you want to expose some frontend state directly. In that case,



Let AI agents read and modify your application state:

```typescript
import { z } from 'zod';

// Define your state schema
const CounterSchema = z.number().describe('Current counter value');
let counter = 0;

// Create state tools: this will automatically add a getter and setter
const [getCounter, setCounter] = mcp.addStateTool({
  name: 'counter',
  description: 'Application counter that AI agents can read and modify',
  get: () => counter,
  set: (value) => { counter = value; },
  schema: CounterSchema
});

// AI agents can now call:
// - get_counter() → returns current value
// - set_counter({ value: 42 }) → updates the counter
```

### 4. Complete Todo Example (25 lines)

A practical CRUD example with schema-driven validation:

```typescript
import { z } from 'zod';

// Define schemas
const TodoSchema = z.object({
  id: z.string().describe('Unique identifier'),
  title: z.string().describe('Todo title'),
  completed: z.boolean().describe('Completion status')
});

const TodoListSchema = z.array(TodoSchema);

// Application state
let todos: z.infer<typeof TodoSchema>[] = [];

// Expose state for reading/writing
const [getTodos, setTodos] = mcp.addStateTool({
  name: 'todos',
  description: 'List of all todos',
  get: () => todos,
  set: (value) => { todos = value; },
  schema: TodoListSchema
});

// Add action tool for creating todos
mcp.addTool({
  name: 'create_todo',
  description: 'Create a new todo item',
  handler: ({ title }) => {
    const todo = {
      id: crypto.randomUUID(),
      title,
      completed: false
    };
    todos.push(todo);
    return todo;
  },
  inputSchema: z.object({
    title: z.string().min(1).describe('Title of the new todo')
  }),
  outputSchema: TodoSchema
});

// AI agents can now:
// - get_todos() → see all todos
// - set_todos([...]) → replace entire list
// - create_todo({ title: "..." }) → add a new todo
```

## Bridge MCP Server

To connect your web app to MCP-compatible AI app/agents, you need to run the
bridge:

```bash
npx @mcp-web/bridge
```

The bridge runs two servers in parallel on:
- **Port 3001**: WebSocket server for connecting browser sessions
- **Port 3002**: MCP server for AI agents

## Connecting AI app/agent to MCP server

To connect an MCP-compatible AI app/agent, like Claude Desktop, you need to
run the MCP client with a valid auth token.

You can retrieve the config directly from the `MCPWeb` instance:

```typescript
console.log(JSON.stringify(mcp.mcpConfig, null, 2));
```

This config looks like:

```json
{
  "mcpServers": {
    "my-app": {
      "command": "npx",
      "args": ["@mcp-web/client"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3002",
        "AUTH_TOKEN": "your-auth-token-here"
      }
    }
  }
}
```

Add this config to your MCP-compatible AI app.

::: tip
For Claude Desktop, the config file is located at:
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
:::

## Control your Frontend App

Check that everything is running:

- [x] Frontend web app with `MCPWeb` instance
- [x] Bridge server
- [x] Configured and restarted AI app

Now you can ask your AI app to "add a todo to my-app".

<style scoped>
  .img {
    max-width: 100%;
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
  }

  #overview {
    width: 460px;
    background-image: url(assets/images/overview-light.png)
  }
  #overview div { padding-top: 56.52173913% }

  :root.dark #overview {
    background-image: url(assets/images/overview-dark.png)
  }
</style>
