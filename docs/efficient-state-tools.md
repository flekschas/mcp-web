# Efficient State Tools

Wouldn't it be nice if we could expose any schema as tools for AI to
efficiently and effectively generate and update frontend state? Then all we'd
have to do to make a frontend app fully controllable by AI is to define a
well-described Zod schema for the app state.

The simplest way to expose state is a getter and a setter. This works well for
small states, but as the state grows, every change gets more expensive: to
update one todo, AI has to send the whole state back. This guide shows two ways
to keep changes small, code mode and expanded tools, and when to use which.

::: info Prior Knowledge
This guide assumes you know about Zod schemas and how to develop with
[declarative reactive state](/declarative-reactive-state).
:::

## The Problem

Imagine you have the following todo app state schema:

```typescript
const TodoSchema = z.object({
  id: z.string(),
  projectId: z.string().nullable().default(null),
  value: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
  completed_at: z.number().nullable().default(null),
  priority: z.number().min(1).max(5).default(3),
  tags: z.array(z.string()).default([]),
});

const ProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().default(null),
  color: z.string().nullable().default(null),
  created_at: z.number(),
  updated_at: z.number(),
});

const AppSchema = z.object({
  todos: z.array(TodoSchema),
  projects: z.record(z.string(), ProjectSchema),
  sortBy: z.enum(['created_at', 'completed_at', 'priority']),
  sortOrder: z.enum(['asc', 'desc']),
  showCompleted: z.boolean(),
  theme: z.enum(['system', 'light', 'dark']),
});
```

To enable AI to control our todo app through tools, we could expose a single
app state setter.

```typescript
import { MCPWeb } from '@mcp-web/core';
import { MCP_WEB_CONFIG } from '../mcp-web.config';

const mcp = new MCPWeb(MCP_WEB_CONFIG);

mcp.addStateTools({
  name: 'app',
  description: 'Todo app',
  get: () => store.app,
  set: (value) => { store.app = value; },
  schema: AppSchema,
});
```

While this can work for small schemas, it doesn't scale. To make a todo urgent,
AI has to call `get_app`, then send every todo, project, and setting back to
`set_app`, just to change one number. The more todos the app holds, the more
tokens each change costs, and the more chances AI has to change something by
accident.

There are two ways to fix this:

- **Code mode** lets AI change the state with a short program. The program
  reads and writes the state, so AI only writes the change.
- **Expanded tools** break the state into targeted tools, such as one for
  adding a todo, so each call only carries what changes.

Usually, code mode is all you need. Expanded tools are useful in a few narrow
cases, described in [When to Use Which](#when-to-use-which).

## Code Mode

Add `codeMode` to your state tools:

```typescript{1,10}
import { createCodeMode } from '@mcp-web/tools/code';

mcp.addStateTools({
  name: 'app',
  description: 'Todo app',
  get: () => store.app,
  set: (value) => { store.app = value; },
  schema: AppSchema,
  codeMode: createCodeMode(),
});
```

MCP-Web now registers two tools: `get_app`, to read the state, and `code_app`,
which runs a JavaScript program that can call `get_app` and `set_app` as
functions. To make all errands urgent and sort by priority, AI sends:

```javascript
const app = await get_app();

for (const todo of app.todos) {
  if (todo.tags.includes('errand')) todo.priority = 5;
}
app.sortBy = 'priority';

await set_app(app);
```

The program runs in a sandbox next to your app, so the state never has to pass
through AI. However large the state is, AI only writes the few lines that
change it. If the program fails, for example because `set_app` rejects the new
state, MCP-Web restores the state as it was before the program ran.

To let programs add todos without making up IDs and timestamps, give those
fields a default (see [System-Generated Props](#system-generated-props)).

See the [code tool](/tools/code) for how programs run, how errors are reported,
and which options `createCodeMode()` takes.

## Expanded Tools

Expanded tools take the other route: instead of one setter for the whole state,
they offer targeted tools for each part. If we break this schema up into
fixed-shape and varying-shape sub-schemas, we get:

**Fixed Shape:**

- `sortBy`, `sortOrder`, `showCompleted`, `theme`
- todo (entry of `todos`)
- project (entry of `projects`)

**Varying Shape:**

- `todos`
- `tags` of todos entry
- `projects`

For fixed-shape sub-schemas we can expose setter tools as we know those schemas
always generate data instances of the same shape (i.e., size). For varying-shape
sub-schemas however, we want to expose actions tools for manipulating the data
instances.

We can do this by setting `expand` to `true`:

```typescript{7}
mcp.addStateTools({
  name: 'app',
  description: 'Todo app',
  get: () => store.app,
  set: (value) => { store.app = value; },
  schema: AppSchema,
  expand: true,
});
```

For the above example, this would result in the following set of tools:

```typescript
type App = z.infer<typeof AppSchema>;
type Todo = { id, projectId, value, created_at, updated_at, completed_at, priority, tags };
type Project = { id, title, description, color, created_at, updated_at };
type Response<T> = { success: true, value: T } | { success: false, error: string };

// Fixed shape (root props):
get_app({ excludeCollections?: boolean }): App | { sortBy, sortOrder, showCompleted, theme }
set_app({ sortBy?, sortOrder?, showCompleted?, theme? }): Response<{...}>

// Array (varying shape): todos
get_app_todos({ index?: number }): Todo[] | Todo | undefined
set_app_todos({ index: number, value: Partial<Todo> }): Response<Todo>
add_app_todos({ value: Todo, index?: number }): Response<Todo>
delete_app_todos({ index: number } | { all: true }): { success: true }

// Nested array (varying shape): todos → tags
get_app_todos_tags({ todoIndex: number, index?: number }): string[] | string | undefined
set_app_todos_tags({ todoIndex: number, index: number, value: string }): Response<string>
add_app_todos_tags({ todoIndex: number, value: string }): Response<string>
delete_app_todos_tags({ todoIndex: number, index: number } | { todoIndex: number, all: true }): { success: true }

// Record (varying shape): projects — note: set is upsert (no separate add)
get_app_projects({ key?: string }): Record<string, Project> | Project | undefined
set_app_projects({ key: string, value: Partial<Project> }): Response<Project>
delete_app_projects({ key: string } | { all: true }): { success: true }
```

While this expands the tools from `2` to `13`, we avoid inefficient set calls
as our app contains more and more todos and projects. This can be useful for
apps with large states and state spaces (i.e., schemas).

::: tip Asymmetric get/set
Notice that `get_app()` returns the **full state** (including collections) while
`set_app()` only accepts **fixed-shape props**. This is intentional:

- `get_app()` gives AI a complete overview of the current state
- `set_app()` only updates settings—use collection tools (`add_app_todos`, etc.) to modify arrays/records

Use `get_app({ excludeCollections: true })` for a lighter response when you only need settings.
:::

## When to Use Which

Usually, code mode is enough, and expanded tools aren't needed. They help in a
few narrow cases:

- **You can't run AI-written code.** Expanded tools keep each change small
  without code mode.
- **Your schema is too large or unusual to describe as one type.** Code mode
  describes the state to AI as one type that `set_app` accepts. Expanded tools
  split it into small, focused functions instead. In our experiments with
  chart specifications, splitting helped only for the format models knew
  least, and lowered quality or raised costs for the others.

You can combine both: with `expand: true` and `codeMode`, AI calls the expanded
tools as functions in a program. This makes sense for the large-schema case
above, especially with
[signature lookup](/tools/code#large-tool-sets) so AI only reads the functions
it needs.

The rest of this guide covers expanded tools in detail.

## System-Generated Props

Your state can contain props that you exclusively want to auto-generate. For
instance, given our todo app example, we don't want AI to generate `id`,
`created_at`, and `updated_at`.

Using Zod's `default()` function, we can generate a value during parse time but
not all props with a default method should be hidden from AI. To mark which
fields are system-generated, use MCP-Web's `system()` helper method. This method
annotates the schema to tell MCP-Web which props to omit from the tool schema.

```typescript
import { system } from '@mcp-web/core';

const TodoSchema = z.object({
  // System-generated (hidden from tool)
  id: system(z.string().default(() => crypto.randomUUID())),
  created_at: system(z.number().default(() => Date.now())),
  updated_at: system(z.number().default(() => Date.now())),
  
  // Required input
  value: z.string(),
  
  // Optional inputs
  priority: z.number().default(3),
  completed_at: z.number().nullable().default(null),
});

const ProjectSchema = z.object({
  // System-generated (hidden from tool)
  id: system(z.string().default(() => crypto.randomUUID())),
  created_at: system(z.number().default(() => Date.now())),
  updated_at: system(z.number().default(() => Date.now())),

  // Required input
  title: z.string(),

  // Optional inputs
  color: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
});
```

::: tip System-generated props must have a default
Props marked with `system()` must have a `default()` function. Otherwise MCP-Web
will error.
:::

## ID Props

By default, for array props, MCP-Web generates four index-based tools for
manipulating the array: get, set, add, delete. If your data has a unique
identifier, you can switch to ID-based tools by marking a field as the
ID using `id()`.


```typescript{4,9}
import { id, system } from '@mcp-web/core';

const TodoSchema = z.object({
  id: id(system(z.string().default(() => crypto.randomUUID()))),
  // ...same as before...
});

const ProjectSchema = z.object({
  id: id(system(z.string().default(() => crypto.randomUUID()))),
  // ...same as before...
});
```

ID-based tools are typically preferred as they make it easier to find and update
entries. While the index of an entry can change due to additions and deletions,
the ID is stable, which makes tool calling easier:

```typescript
// Array setting with index-based tool calls:
get_app_todos() // → [...] need to parse all todos to find the index
set_app_todos({ index: 2, value: { value: "..."} })

// Array setting with ID-based tool calls:
set_app_todos({ id: "abc", value: { value: "..."} })
```

::: tip Only use `id()` for arrays 
The `id()` function is only needed for arrays. Records are naturally indexed by
a string-based key.
:::

### Note on Generated IDs

When you use `system()` and `id()` for IDs, AI won't know the generated ID until after
calling `add`. That's why `add` and `set` tools return the complete object
including all system-generated fields:

```typescript{8,11-12,18}
// AI calls add_app_todos:
add_app_todos({ value: { value: 'Buy milk', priority: 2 } })

// Response includes the complete object with system fields filled:
{
  success: true,
  value: {
    id: 'abc-123',              // ← AI now knows the ID!
    value: 'Buy milk',
    priority: 2,
    created_at: 1704700000000,  // ← AI now knows the creation date!
    updated_at: 1704700000000,  // ← AI now knows the update date!
    completed_at: null
  }
}

// AI can now reference this todo by ID:
set_app_todos({ id: 'abc-123', value: { priority: 1 } })
```

## Optional Props

You might notice that none of the props in our schema are optional. This is on
purpose. Optional props are tricky to deal with because (a) JSON doesn't support
`undefined` and hence you cannot set a property to undefined and (b) since
setter tools use upsert via deep merging, we cannot differentiate between
unsetting and ignoring a property.

The good news is that there's a very straightforward alternative to
`optional()`: use `nullable()` 🎉 to have `null` represent an undefined value.

Make sure to default optional fields to `null` such that AI can treat them as
optional when calling a setter tool. E.g.:

```typescript
z.object({ optionalProp: z.number().nullable().default(null) })
```

::: tip Learn More
For a deeper discussion of optional vs nullable props and how to handle computed
defaults with sentinel values, see
[Handling Optional and Default Values](/designing-state-tools#handling-optional-and-default-values).
:::

## When NOT to Use Expanded Tools

Expanded tools excel at CRUD-style state manipulation, but they're not always
the best choice. Consider using hand-crafted `addTool()` instead when:

- **Value validation beyond shape**: Business rules that can't be expressed in
  Zod (e.g., "can't move to an occupied square", "budget can't exceed limit")
- **Complex derived mutations**: One action triggers multiple calculated state
  changes (e.g., game moves that update board, captures, turn, and win status)
- **Encapsulating domain logic**: Operations where the AI shouldn't need to
  understand the rules—just the intent

```typescript
// ❌ With expanded tools, AI must understand game rules:
// 1. get_game_state() → parse board, find valid moves
// 2. Calculate captures, check for kings, determine if game won
// 3. set_game_state({ board: newBoard, turn: 'black', ... })

// ✅ Better as a hand-crafted action tool:
mcp.addTool({
  name: 'make_move',
  description: 'Move a piece from one position to another',
  handler: ({ from, to }) => {
    // Validate move is legal (business logic)
    if (!isValidMove(state.board, from, to)) {
      throw new Error('Invalid move');
    }
    
    // Apply move and all derived changes atomically
    state.board = applyMove(state.board, from, to);
    state.captures = calculateCaptures(state.board, from, to);
    state.turn = state.turn === 'red' ? 'black' : 'red';
    state.winner = checkWinCondition(state.board);
    
    return { success: true, board: state.board };
  },
  inputSchema: z.object({
    from: z.object({ row: z.number(), col: z.number() }),
    to: z.object({ row: z.number(), col: z.number() }),
  }),
});
```

::: tip
Expanded tools and hand-crafted tools work great together! Use expanded tools
for general state access, and add specific action tools for complex operations.
See [Declarative & Reactive State](/declarative-reactive-state) for more on
designing your state for AI.
:::

## Combining with Schema Splitting

You can combine `expand` with `schemaSplit` for even more control. The
order of operations is:

1. **Split first**: Extract the specified props into separate tool groups
2. **Expand second**: Generate expanded tools for each part (including the remainder)

This allows you to group semantically related props (like settings) while still
getting collection-specific tools for arrays and records.

```typescript
mcp.addStateTools({
  name: 'todo_app',
  description: 'Todo app',
  get: () => store.app,
  set: (value) => { store.app = value; },
  schema: AppSchema,
  schemaSplit: [
    'displaySettings',  // Group display settings together
    'appSettings',      // Group app settings together
  ],
  expand: true,
});
```

::: tip Learn More
For detailed examples and advanced splitting patterns, see our
[guide on large schemas](/large-schema#combining-with-expanded-tools).
:::
