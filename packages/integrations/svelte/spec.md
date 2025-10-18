# Svelte Integration Specification

## Overview

This document outlines the design for integrating MCP Web with Svelte's reactive state management, following patterns established by the Jotai and React integrations.

## Background

### Existing Integrations

1. **Jotai Integration** (`@mcp-web/jotai`)
   - Works with Jotai atoms (external reactive stores)
   - Provides `addAtomTool(config)` and `useAtomTool(config)`
   - Automatically creates getter/setter tools for atom values
   - Supports schema decomposition for partial object updates

2. **React Integration** (`@mcp-web/react`)
   - Works directly with React's `useState` hook
   - Provides `useTool(config)` that accepts `value` and `setValue`
   - Uses refs to capture current value
   - Supports schema decomposition for partial object updates

## Svelte Reactivity Systems

Svelte offers two primary reactive state management approaches:

### 1. Svelte 5 Runes (`$state`)

```javascript
let count = $state(0);
let user = $state({ name: 'Alice', age: 30 });
```

**Characteristics:**
- Compile-time magic that only works in `.svelte` or `.svelte.js/ts` files
- Reactivity through assignment: `count = 5` triggers updates
- No explicit getter/setter pattern
- Cannot be intercepted or wrapped from external libraries

**Challenge:** We cannot create a library function that accepts a `$state` variable and provides external read/write access because:
- `$state` doesn't expose getter/setter methods
- Assignment is the only way to update (no callback we can intercept)
- The reactivity is handled at compile time

### 2. Svelte Stores (`svelte/store`)

```javascript
import { writable } from 'svelte/store';
const count = writable(0);
const user = writable({ name: 'Alice', age: 30 });
```

**Characteristics:**
- External reactive containers (similar to Jotai atoms)
- Explicit API: `subscribe()`, `set()`, `update()`
- Can be used outside components
- Perfect for library integrations

## Proposed Solution

Implement TWO integration approaches:

### Approach 1: Store-Based (Recommended)

Similar to the Jotai integration, work with Svelte stores:

```typescript
import { writable } from 'svelte/store';
import { addStoreTool } from '@mcp-web/svelte';

const userStore = writable({ name: 'Alice', age: 30 });

// Add MCP tools for this store
addStoreTool({
  mcp,
  name: 'user',
  description: 'Current user data',
  store: userStore,
  storeSchema: z.object({
    name: z.string(),
    age: z.number(),
  }),
  storeSchemaSplit: { /* decomposition options */ }
});

// Creates tools: get_user, set_user (or decomposed setters)
```

**Benefits:**
- Clean, predictable API
- Works exactly like Jotai integration
- Stores are idiomatic Svelte for shared state
- Full support for schema decomposition

### Approach 2: State Object Pattern (Alternative)

For developers who prefer `$state`, provide a wrapper pattern:

```javascript
import { createMCPState } from '@mcp-web/svelte';

// Create a state object with getter/setter
const count = createMCPState(0);

// In component:
let value = $state(count.value);
$effect(() => {
  count.value = value; // Sync changes
});

// Or use derived:
let value = $derived(count.value);
```

**Challenges:**
- Requires manual synchronization in components
- Less ergonomic than stores
- Doesn't feel "Svelte-native"
- Limited reactivity benefits

### Approach 3: Runes with Manual Registration (Simplest)

Provide a helper that works with getter/setter functions:

```svelte
<script>
  import { useTool } from '@mcp-web/svelte';

  let count = $state(0);

  useTool({
    mcp,
    name: 'count',
    description: 'Counter value',
    getValue: () => count,
    setValue: (v) => { count = v; },
    valueSchema: z.number(),
  });
</script>
```

**Benefits:**
- Works with `$state` variables
- Simple, explicit API
- Similar to React integration pattern

**Drawbacks:**
- Manual getter/setter definition
- Verbose compared to stores

## Recommended Implementation

Implement **Approach 1 (Store-Based)** and **Approach 3 (Runes with Manual Registration)** together:

### 1. `addStoreTool()` - For Svelte Stores

```typescript
interface StoreToolConfig<T> {
  mcp: MCPWeb;
  name: string;
  description: string;
  store: Writable<T> | Readable<T>;
  storeSchema: z.ZodType<T> | JSONSchema;
  storeSchemaSplit?: SplitPlan | DecompositionOptions;
}

function addStoreTool<T>(config: StoreToolConfig<T>): () => void;
```

### 2. `useTool()` - For Runes/Components

```typescript
interface UseToolConfig<T> {
  mcp: MCPWeb;
  name: string;
  description: string;
  getValue: () => T;
  setValue?: (value: T) => void;
  valueSchema: z.ZodType<T> | JSONSchema;
  valueSchemaSplit?: SplitPlan | DecompositionOptions;
}

function useTool<T>(config: UseToolConfig<T>): void;
```

## API Design

### Store-Based API

```typescript
// Non-object values
addStoreTool({
  mcp,
  name: 'counter',
  description: 'Application counter',
  store: counterStore,
  storeSchema: z.number(),
});
// Creates: get_counter, set_counter

// Object values with decomposition
addStoreTool({
  mcp,
  name: 'user',
  description: 'User profile',
  store: userStore,
  storeSchema: userSchema,
  storeSchemaSplit: {
    profile: ['name', 'email'],
    settings: ['theme', 'notifications'],
  },
});
// Creates: get_user, set_user_profile, set_user_settings
```

### Runes-Based API (Svelte 5)

```svelte
<script>
  import { useTool } from '@mcp-web/svelte';

  let count = $state(0);
  let user = $state({ name: 'Alice', age: 30 });

  useTool({
    mcp,
    name: 'count',
    description: 'Counter value',
    getValue: () => count,
    setValue: (v) => { count = v; },
    valueSchema: z.number(),
  });

  useTool({
    mcp,
    name: 'user',
    description: 'User data',
    getValue: () => user,
    setValue: (v) => { user = v; },
    valueSchema: userSchema,
    valueSchemaSplit: { /* ... */ },
  });
</script>
```

## Technical Implementation

### Package Structure

```
packages/integrations/svelte/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Main exports
│   ├── store-tools.ts    # addStoreTool implementation
│   └── runes-tools.ts    # useTool implementation
└── README.md
```

### Dependencies

```json
{
  "dependencies": {
    "@mcp-web/decompose-zod-schema": "workspace:*",
    "@mcp-web/web": "workspace:*",
    "zod": "catalog:"
  },
  "peerDependencies": {
    "svelte": "^4.0.0 || ^5.0.0"
  }
}
```

### Key Considerations

1. **Svelte 4 vs 5 Compatibility**
   - Stores work in both versions
   - Runes ($state) only in Svelte 5
   - Use feature detection if needed

2. **Lifecycle Management**
   - `useTool()` should handle cleanup automatically (onDestroy or $effect cleanup)
   - `addStoreTool()` returns cleanup function (manual)

3. **TypeScript Support**
   - Full generic type safety
   - Infer types from schemas where possible

4. **Schema Decomposition**
   - Reuse existing decompose-zod-schema package
   - Apply same patterns as Jotai/React integrations

## Example Usage

### Todo App with Stores

```svelte
<script>
  import { writable } from 'svelte/store';
  import { addStoreTool } from '@mcp-web/svelte';
  import { z } from 'zod';

  const todoSchema = z.object({
    id: z.string(),
    text: z.string(),
    completed: z.boolean(),
  });

  const todosStore = writable([
    { id: '1', text: 'Learn Svelte', completed: true },
    { id: '2', text: 'Build app', completed: false },
  ]);

  // Register MCP tools
  addStoreTool({
    mcp,
    name: 'todos',
    description: 'List of todo items',
    store: todosStore,
    storeSchema: z.array(todoSchema),
  });

  // Claude can now:
  // - get_todos() to see all todos
  // - set_todos([...]) to update the list
</script>
```

### User Settings with Runes

```svelte
<script>
  import { useTool } from '@mcp-web/svelte';
  import { z } from 'zod';

  let settings = $state({
    theme: 'dark',
    notifications: true,
    language: 'en',
  });

  const settingsSchema = z.object({
    theme: z.enum(['light', 'dark']),
    notifications: z.boolean(),
    language: z.string(),
  });

  useTool({
    mcp,
    name: 'settings',
    description: 'User application settings',
    getValue: () => settings,
    setValue: (v) => { settings = v; },
    valueSchema: settingsSchema,
    valueSchemaSplit: {
      appearance: ['theme'],
      preferences: ['notifications', 'language'],
    },
  });

  // Claude can now:
  // - get_settings()
  // - set_settings_appearance({ theme: 'light' })
  // - set_settings_preferences({ notifications: false, language: 'es' })
</script>
```

## Migration Path

For developers using Svelte 4:
- Use store-based approach (`addStoreTool`)

For developers migrating to Svelte 5:
- Continue using stores for shared state
- Use `useTool` with runes for component-local state
- No breaking changes needed

## Conclusion

The dual-approach strategy provides:

1. **Idiomatic Svelte** - stores are the recommended pattern for shared state
2. **Flexibility** - supports both Svelte 4 and 5
3. **Consistency** - follows patterns from Jotai/React integrations
4. **Developer Experience** - natural APIs for both stores and runes

The store-based approach should be emphasized in documentation as it's more maintainable and idiomatic, while the runes approach provides flexibility for component-local state in Svelte 5 applications.