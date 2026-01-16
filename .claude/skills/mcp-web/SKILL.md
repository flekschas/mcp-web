---
name: mcp-web
description: Build frontend apps whose state and actions are exposed to AI agents via MCP. Use when building MCP-Web apps, exposing frontend state to AI, creating AI-controllable web UIs, registering MCP tools, or when the user mentions MCP-Web, MCPWeb, or @mcp-web packages.
---

# MCP-Web

Build web applications that AI agents can understand and control through the Model Context Protocol.

**Design Principle**: Structure your app around **declarative, reactive state** that can be easily exposed to AI agents via tools.

## Project Structure

```
your-project/
├── mcp-web.config.{ts,js}  # MCPWeb configuration
├── bridge.ts               # Bridge server entry point
├── agent.ts                # Agent server (optional, for frontend queries)
├── src/
│   ├── schemas.ts          # Zod schemas describing your data
│   ├── types.ts            # TypeScript types (derived from schemas)
│   ├── state.ts            # Declarative reactive state management
│   ├── mcp.ts              # MCPWeb instantiation + tool registration
│   ├── queries/            # Frontend-triggered queries (optional)
│   └── <app files>         # Your application code
└── package.json
```

## The State-Schema-Tool Pattern

### 1. Define Schemas First (`schemas.ts`)

Schemas are your contract with the AI. Use `.describe()` extensively!

```typescript
import { z } from 'zod';

export const TodoSchema = z.object({
  id: z.string().describe('Unique identifier'),
  title: z.string().min(1).describe('Todo title'),
  completed: z.boolean().describe('Completion status'),
  priority: z.enum(['low', 'medium', 'high']).describe('Priority level'),
}).describe('A single todo item');
```

### 2. Create Declarative Reactive State (`state.ts`)

Use your framework's reactivity for derived values:

```typescript
// Svelte runes example
let gameState = $state<GameState>(createInitialState());
const validMoves = $derived(getLegalMoves(gameState));

export const state = {
  get gameState() { return gameState; },
  set gameState(value) { gameState = value; },
  get validMoves() { return validMoves; },
};
```

### 3. Register Tools (`mcp.ts`)

```typescript
import { MCPWeb } from '@mcp-web/web';

export const mcp = new MCPWeb(MCP_WEB_CONFIG);

// Expose state - returns [getter, setter, cleanup]
const [getTodos, setTodos, cleanup] = mcp.addStateTools({
  name: 'todos',
  description: 'List of all todo items',
  get: () => store.todos,
  set: (value) => { store.todos = value; },
  schema: TodoListSchema,
});

// Add actions - returns the tool definition
const createTodoTool = mcp.addTool({
  name: 'create_todo',
  description: 'Create a new todo item',
  handler: (input) => { /* ... */ },
  inputSchema: CreateTodoSchema,
});
```

## State Tools vs Action Tools

### Use State Tools (`addStateTools`) for:
- Simple primitives (strings, numbers, booleans)
- Fixed-shape objects (always same keys)
- Configuration and preferences

### Use Action Tools (`addTool`) for:
- Changing shape of state (add/remove items)
- Validation or business logic
- Updating multiple states atomically
- Operations with side effects

## Expanded Tools for Collections

Use `expand: true` when state includes arrays or records that grow:

```typescript
const [getApp, appTools, cleanup] = mcp.addStateTools({
  name: 'todo_app',
  description: 'Todo application state',
  schema: AppSchema,  // Contains arrays/records
  get: () => store.app,
  set: (value) => { store.app = value; },
  expand: true,  // Generates add/set/delete tools for collections
});
```

### System-Generated Fields

Mark auto-generated fields with `system()` to hide from AI:

```typescript
import { system, id } from '@mcp-web/web';

const TodoSchema = z.object({
  id: id(system(z.string().default(() => crypto.randomUUID()))),
  created_at: system(z.number().default(() => Date.now())),
  title: z.string(),  // User-visible
});
```

## Key Design Rules

### Schema Design
- **Size**: 5-20 properties per setter tool
- **Depth**: Keep schemas flat
- **Collections**: Use `expand: true` for arrays/records
- **Descriptions**: Use `.describe()` on objects and properties

### State Architecture
- **Fixed-shape** → state tools (`z.object()`, `z.enum()`, primitives)
- **Dynamic-shape** → action tools (`z.array()`, `z.record()`)
- **Derived values** → reactive computation (don't expose to AI)

### Optional Values
Use `nullable()` instead of `optional()` (JSON doesn't support undefined):

```typescript
// ❌ Ambiguous
z.object({ description: z.string().optional() })

// ✅ Clear
z.object({ description: z.string().nullable().default(null) })
```

## Development Workflow

1. **Define schemas** with rich descriptions
2. **Create reactive state** using your framework
3. **Register tools** (state tools for fixed shapes, actions for operations)
4. **Start bridge**: `npx tsx bridge.ts` (uses `new MCPWebBridge(config)`)
5. **Start app**: `npm run dev`
6. **Configure Claude Desktop** with auth token
7. **Test with AI** and iterate

### Bridge Setup (`bridge.ts`)

```typescript
import { MCPWebBridge } from '@mcp-web/bridge';
import { MCP_WEB_CONFIG } from './mcp-web.config';

new MCPWebBridge(MCP_WEB_CONFIG);
```

## Quick Reference

✅ **Do:**
- Use declarative reactive state
- Describe schemas extensively
- Use state tools for fixed-shape data
- Use action tools for operations
- Use `expand: true` for growing collections
- Mark system fields with `system()`
- Use `nullable()` instead of `optional()`

❌ **Don't:**
- Expose derived values as state tools
- Use `optional()` for fields
- Create one tool per atomic variable (group related state)
- Expose entire large state as single tool (split or expand)

## Additional Resources

- For complete examples, see [examples.md](examples.md)
- For API details:
  - `@mcp-web/web`: [api-reference-web.md](api-reference-web.md)
  - `@mcp-web/bridge`: [api-reference-bridge.md](api-reference-bridge.md)
  - `@mcp-web/client`: [api-reference-client.md](api-reference-client.md)
  - `@mcp-web/integrations`: [api-reference-integrations.md](api-reference-integrations.md)
  - `@mcp-web/tools`: [api-reference-tools.md](api-reference-tools.md)
  - `@mcp-web/decompose-zod-schema`: [api-reference-decompose-zod-schema.md](api-reference-decompose-zod-schema.md)
