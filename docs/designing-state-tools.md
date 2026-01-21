# The Art of Designing State Tools

Frontend application state often comes in two flavors: a collection of many
atomic state variables or a single large state object. Both forms are not ideal
when exposed directly to AI via tools.

Exposing a set of CRUD tools for each atomic state variable can result in an
overwhelming number of tools to choose from. Even worse, if the decision how to
adjust state _A_ depends on states _B_, _C_, _D_, and _E_, your AI agent first
needs to issue five requests before making the actual tool call to adjust _A_.

On the other extreme, if the entire state is exposed as a single getter and
setter, picking the right tools is trivial as there's only one getter and one
setter tool but then your AI agent needs to deal with a potentially very large
object, even if just a single property needs to be adjusted.

Same as how well crafted user interface group related actions and settings
together, we want to expose semantically related state variables through one
tool set. The question, of course, is how to do this most efficiently.

## Split Large State Schema

When your application has a single large state object—common in legacy apps or
complex configurations—exposing it as one getter/setter creates problems:

- **Token inefficiency**: AI must read/write the entire object for small changes
- **Cognitive overload**: Large schemas are harder for AI to reason about
- **Error prone**: More fields means more chance of accidental modifications

The solution is **schema splitting**: creating focused setter tools that target
specific parts of your state while maintaining a single getter for overview.

```typescript
mcp.addStateTools({
  name: 'game_state',
  schema: GameStateSchema,
  get: () => state,
  set: (value) => { state = value; },
  schemaSplit: [
    'currentPlayer',               // → set_game_state_current_player
    ['score.red', 'score.black'],  // → set_game_state_score (grouped)
    'settings',                    // → set_game_state_settings
  ],
});
```

::: tip Learn More
For detailed patterns including array element splits, real-world examples, and
best practices, see our comprehensive guide on
[Working with Large State Schemas](/large-schema).
:::

## Group Atomic State Variables

When structuring frontend state through [declarative state in a reactive framework](/declarative-reactive-state),
your application state tends to be a set declarative and reactive state
variables.

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

const SortBySchema = z.enum(['created_at', 'completed_at', 'priority']);
const SortOrderSchema = z.enum(['asc', 'desc']);
const ShowCompletedSchema = z.boolean();
const ThemeSchema = z.enum(['system', 'light', 'dark']);
```

The question is which of these state variables do you want to expose
individually or group together. There is no one-size-fits-all answer but a good
question to ask yourself, is which variable are semantically or interface-wise
related. How big would related groups of variables be? And what type of state
variables would be part of groups?

For instance, _sort by_ and _sort order_ are clearly related. Both define the
ordering of todos. Hence, we could expose them both as a single getter and
setter tool. The question is what to do with _show completed_ and _theme_. They
don't directly relate as clearly so you could expose them individually but it
could also make sense to group all four into a "settings" getter and setter
tool.

::: info Clustering State Variables
What I've described here is a well-known problem in machine learning called
clustering. If you're really fancy, you could take your well-described schema,
embed each state variable using a text embedding model, and cluster the
numerical vectors. Depending on which models and hyper parameters you use
you'll likely get different results but it would automate the grouping process.
:::

Code-wise, this would eventually look as following for the above mentioned
example:

```typescript
const SettingsSchema = z.object({
  sortBy: SortBySchema,
  sortOrder: SortOrderSchema,
  showCompleted: ShowCompletedSchema,
  theme: ThemeSchema,
});

mcpWeb.addStateTools({
  name: 'settings',
  description: 'Display and app settings',
  get: () => ({
    sortBy: getSortBy(),
    sortOrder: getSortOrder(),
    showCompleted: getShowCompleted(),
    theme: getTheme(),
  }),
  set: ({ sortBy, sortOrder, showCompleted, theme }) => {
    if (sortBy !== undefined) setSortBy(sortBy);
    if (sortOrder !== undefined) setSortOrder(sortOrder);
    if (showCompleted !== undefined) setShowCompleted(showCompleted);
    if (theme !== undefined) setTheme(theme);
  },
  schema: SettingsSchema,
});
```

### Use `groupState` to Reduce Boilerplate

The pattern above is a bit repetitive: combine schemas, combine getters, 
conditionally apply setters. The `groupState` helper automates this entirely:

```typescript
import { groupState } from '@mcp-web/core';

const settingsGroup = groupState({
  sortBy: [getSortBy, setSortBy, SortBySchema],
  sortOrder: [getSortOrder, setSortOrder, SortOrderSchema],
  showCompleted: [getShowCompleted, setShowCompleted, ShowCompletedSchema],
  theme: [getTheme, setTheme, ThemeSchema],
});

mcpWeb.addStateTools({
  name: 'settings',
  description: 'Display and app settings',
  ...settingsGroup,
});
```

Each entry is a `[getter, setter, schema]` triple. The helper function returns
`{ schema, get, set }` which spreads directly into `addStateTools`.

The generated schema makes all fields optional, so the AI can update any subset
of settings in a single tool call without needing to specify values for
unchanged fields.

## Handling Optional and Default Values

MCP tools communicate via JSON, which doesn't support `undefined`. This creates
a challenge for partial updates: when AI omits a property, does it mean "leave
unchanged" or "clear this value"?

### The Three-Intent Problem

When designing setter tools, you often need to distinguish three intents:

| Intent | What AI means | Representation |
|--------|---------------|----------------|
| **Leave unchanged** | "Don't touch this field" | Omit the property |
| **Clear/unset** | "Remove any explicit value" | `null` |
| **Use computed default** | "Let the system decide" | Sentinel value |

### Prefer `nullable()` Over `optional()`

Zod's `optional()` makes a field... optional. But in JSON, there's no way to
distinguish "I didn't include this" from "I want this cleared." This breaks
partial updates.

Instead, use `nullable()` with a default of `null`:

```typescript
// ❌ Problematic: can't distinguish "ignore" from "clear"
z.object({
  description: z.string().optional()
})

// ✅ Clear semantics: null means "no value"
z.object({
  description: z.string().nullable().default(null)
})
```

With this pattern:
- Omitting `description` → leave unchanged (partial update)
- Setting `description: null` → explicitly clear the value
- Setting `description: "..."` → set to specific value

### Sentinel Values for Computed Defaults

Sometimes `null` isn't enough. Consider a visualization's color scale range:
the user might want to set explicit bounds (e.g., 0–100), clear them entirely,
or let the system compute bounds from the data (e.g., 1st–99th percentile).

Here, `null` could mean "no range" or "auto-compute" — ambiguous. The solution
is a **sentinel value** that explicitly triggers default computation:

```typescript
// Schema with sentinel for auto-computation
const ColorRangeSchema = z.object({
  min: z.union([
    z.number().min(0).max(100),
    z.literal('auto')
  ]).describe('Minimum value for color scale. Use "auto" for 1st percentile.'),
  
  max: z.union([
    z.number().min(0).max(100),
    z.literal('auto')
  ]).describe('Maximum value for color scale. Use "auto" for 99th percentile.'),
});

// In the setter
function setColorRange({ min, max }: z.infer<typeof ColorRangeSchema>) {
  state.colorRange = {
    min: min === 'auto' ? computePercentile(data, 0.01) : min,
    max: max === 'auto' ? computePercentile(data, 0.99) : max,
  };
}
```

Now AI can express all three intents clearly:

```typescript
// Explicit bounds
set_color_range({ min: 0, max: 100 })

// Auto-compute from data
set_color_range({ min: 'auto', max: 'auto' })

// Mix: explicit min, auto max
set_color_range({ min: 0, max: 'auto' })
```

::: tip When to Use Sentinels
Use sentinel values like `'auto'` or `'default'` when:
- A property has a meaningful computed default
- `null` already has a different meaning (e.g., "disabled" vs "auto")
- You want AI to explicitly request default behavior rather than guess
:::

## Rules of Thumb for Tool Design

Now you might ask yourself what the right tool (i.e., schema) size is. While
there is no one-size-fits-all answer, the following rules might be useful to
help you design effective state tools for AI.

**5-20 props** per setter tool schema is a reasonable size.

**Avoid deep nesting:** The flatter your schema the easier it is to decompose,
group, traverse, understand, and update.

**Collections need special treatment:** Use `expand: true` for arrays and
records that grow in size.

**When to group:**
- Semantically related settings: `sortBy` & `sortOrder` = sorting concern
- Update co-occurrence: Things typically changed together
- Causal dependency: Changing _A_ requires knowing _B_

**When _not_ to group:**
- Unrelated concerns: Don't mix display settings with data entities
- Unbounded collections: Don't group todos[] with settings (use expanded tools instead)
- Different lifecycles: Transient UI state vs persistent preferences

**Describe your schema:** The better your tool schema is described the easier it
is for AI (and humans!) to understand it. Use `.describe()` liberally on both
objects and individual properties.
