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
│   ├── schemas.ts          # Zod schemas ONLY (no TypeScript types)
│   ├── types.ts            # TypeScript types derived from schemas via z.infer<>
│   ├── states.ts           # Declarative reactive state management
│   ├── mcp.ts              # MCPWeb instantiation
│   ├── tools.ts            # Tool registration (state tools + action tools)
│   ├── queries/            # Frontend-triggered queries (optional)
│   └── <app files>         # Your application code
└── package.json
```

### File Organization Guidelines

**Co-locate when small**: If schemas, types, states, or tools would each be under ~100 lines, keep them in single files (`schemas.ts`, `types.ts`, `states.ts`, `tools.ts`). Co-location makes it easier to reason about all related code together.

**Split when large**: Only create subdirectories (e.g., `schemas/`, `states/`) when individual files exceed ~150-200 lines OR when there are clear domain boundaries.

**Separate schemas from types**: Always keep Zod schemas and TypeScript types in separate files:
- `schemas.ts` - Zod schema definitions only
- `types.ts` - TypeScript types derived from schemas using `z.infer<>`

```typescript
// types.ts - derive types from schemas, never define types manually
import type { z } from 'zod';
import type { TodoSchema, ProjectSchema } from './schemas';

export type Todo = z.infer<typeof TodoSchema>;
export type Project = z.infer<typeof ProjectSchema>;
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

### 3. Instantiate MCPWeb (`mcp.ts`)

```typescript
import { MCPWeb } from '@mcp-web/core';  // ← Class is MCPWeb (not MCPWebBridge)
import { MCP_WEB_CONFIG } from '../mcp-web.config';

export const mcpWeb = new MCPWeb(MCP_WEB_CONFIG);
```

### 4. Register Tools (`tools.ts`)

Keep all tool registrations in a single `tools.ts` file when under ~100 lines:

```typescript
import { mcpWeb } from './mcp';
import { TodosSchema, SettingsSchema } from './schemas';
import { todosAtom, settingsAtom } from './states';
import { getDefaultStore } from 'jotai';

const store = getDefaultStore();

// Expose state - returns [getter, setter, cleanup]
mcpWeb.addStateTools({
  name: 'todos',
  description: 'List of all todo items',
  get: () => store.get(todosAtom),
  set: (value) => store.set(todosAtom, value),
  schema: TodosSchema,
  expand: true,  // For collections
});

// Add actions for complex operations
mcpWeb.addTool({
  name: 'complete_todo',
  description: 'Mark a todo as completed',
  handler: (input) => { /* ... */ },
  inputSchema: CompleteTodoSchema,
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
mcpWeb.addStateTools({
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
import { system, id } from '@mcp-web/core';

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

## Multi-Session Support

When multiple instances of your app connect to the same bridge (e.g., multiple browser tabs), each gets a unique session ID. By default, Claude sees them as opaque UUIDs. Use `sessionName` to give sessions human-readable labels:

```typescript
const mcpWeb = new MCPWeb({
  name: 'Checkers',
  description: 'A checkers game',
  sessionName: 'Game 1',  // Must be unique per auth token
});
```

**Key rules:**
- `sessionName` is optional — unnamed sessions work as before
- Names must be unique per auth token — the bridge rejects duplicates with a clean `authentication-failed` message, and `connect()` rejects with an `Error`
- Auth tokens are shared via localStorage across tabs on the same origin, so Claude sees all sessions through one MCP connection
- Session IDs are always fresh UUIDs (not persisted in localStorage)

**Dynamic name allocation** (e.g., for demos with multiple tabs):

```typescript
// game-names.ts — localStorage-based slot allocator
const STORAGE_KEY = 'game-slots';

export function claimGameName(): { name: string; release: () => void } {
  const slots: (string | null)[] = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || '[]'
  );
  let index = slots.findIndex((s) => s === null);
  if (index === -1) index = slots.length;
  const id = crypto.randomUUID();
  slots[index] = id;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));

  return {
    name: `Game ${index + 1}`,
    release: () => {
      const current: (string | null)[] = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]'
      );
      const i = current.indexOf(id);
      if (i !== -1) {
        current[i] = null;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      }
    },
  };
}

// mcp-tools.ts
const { name, release } = claimGameName();
export const releaseGameName = release;

export const mcpWeb = new MCPWeb({
  ...MCP_WEB_CONFIG,
  sessionName: name,
});

// App.svelte (or equivalent lifecycle)
onDestroy(() => releaseGameName());
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

**Important**: The bridge class is `MCPWebBridge` (not `Bridge`):

```typescript
#!/usr/bin/env tsx
import { MCPWebBridge } from '@mcp-web/bridge';  // ← Class is MCPWebBridge
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
- Keep schemas in `schemas.ts`, types in `types.ts` (separate files)
- Co-locate related code in single files when under ~100 lines each

❌ **Don't:**
- Expose derived values as state tools
- Use `optional()` for fields
- Create one tool per atomic variable (group related state)
- Expose entire large state as single tool (split or expand)
- Mix Zod schemas and TypeScript type definitions in the same file
- Create overly granular file structures (one atom per file, one tool per file)
- Import `Bridge` from `@mcp-web/bridge` (use `MCPWebBridge`)

## Additional Resources

- For complete examples, see [examples.md](examples.md)
- For API details:
  - `@mcp-web/core`: [api-reference-core.md](api-reference-core.md)
  - `@mcp-web/bridge`: [api-reference-bridge.md](api-reference-bridge.md)
  - `@mcp-web/client`: [api-reference-client.md](api-reference-client.md)
  - `@mcp-web/integrations`: [api-reference-integrations.md](api-reference-integrations.md)
  - `@mcp-web/tools`: [api-reference-tools.md](api-reference-tools.md)
  - `@mcp-web/decompose-zod-schema`: [api-reference-decompose-zod-schema.md](api-reference-decompose-zod-schema.md)
  - `@mcp-web/mcpb`: [api-reference-mcpb.md](api-reference-mcpb.md)
