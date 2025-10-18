# @mcp-web/svelte

MCP Web integration for Svelte 5 reactive state management.

## Overview

This package provides integration between the MCP Web system and Svelte 5's runes (`$state` and `$derived`), allowing Claude Desktop to read and modify your Svelte application's reactive state through MCP tools.

## Installation

```bash
pnpm add @mcp-web/svelte
```

## Requirements

- Svelte 5.0.0 or higher
- State must be defined in `.svelte.ts` or `.svelte` files (where runes are supported)

## Usage

### Basic Example

```typescript
// state.svelte.ts
import { addStateTool } from '@mcp-web/svelte';
import { z } from 'zod';

// Define your reactive state
let user = $state({
  name: 'Alice',
  age: 30,
  email: 'alice@example.com'
});

// Expose it to Claude via MCP
addStateTool({
  mcp,
  name: 'user',
  description: 'Current user profile data',
  state: user,
  stateSchema: z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
  })
});

// Claude can now:
// - get_user() to read the current user
// - set_user({ name, age, email }) to update the user
```

### Schema Decomposition

For large objects, you can split setters into logical groups:

```typescript
let settings = $state({
  theme: 'dark',
  fontSize: 14,
  notifications: true,
  autoSave: true,
  language: 'en'
});

addStateTool({
  mcp,
  name: 'settings',
  description: 'Application settings',
  state: settings,
  stateSchema: z.object({
    theme: z.enum(['light', 'dark']),
    fontSize: z.number(),
    notifications: z.boolean(),
    autoSave: z.boolean(),
    language: z.string(),
  }),
  stateSchemaSplit: {
    appearance: ['theme', 'fontSize'],
    preferences: ['notifications', 'autoSave', 'language']
  }
});

// Claude can now:
// - get_settings() to read all settings
// - set_settings_appearance({ theme, fontSize }) to update appearance
// - set_settings_preferences({ notifications, autoSave, language }) to update preferences
```

### Read-Only State (for $derived)

```typescript
let firstName = $state('Alice');
let lastName = $state('Smith');

// Derived state is read-only
let fullName = $derived(`${firstName} ${lastName}`);

addStateTool({
  mcp,
  name: 'fullName',
  description: 'User full name',
  state: { value: fullName }, // Wrap primitive in object
  readOnly: true,
  stateSchema: z.object({
    value: z.string()
  })
});

// Claude can only:
// - get_fullName() to read the derived value
```

### Working with Arrays

```typescript
let todos = $state([
  { id: 1, text: 'Learn Svelte', completed: true },
  { id: 2, text: 'Build app', completed: false }
]);

addStateTool({
  mcp,
  name: 'todos',
  description: 'Todo list items',
  state: todos,
  stateSchema: z.array(z.object({
    id: z.number(),
    text: z.string(),
    completed: z.boolean()
  }))
});

// Claude can:
// - get_todos() to see all todos
// - set_todos([...]) to replace the entire list
```

## API Reference

### `addStateTool(config)`

Creates MCP tools for reading and optionally writing Svelte reactive state.

**Parameters:**

- `config.mcp` (`MCPWeb`) - The MCP Web instance
- `config.name` (`string`) - Tool name (creates `get_${name}` and optionally `set_${name}`)
- `config.description` (`string`) - Description shown to Claude
- `config.state` (`T`) - The `$state` or `$derived` value (must be object or array)
- `config.stateSchema` (`ZodType<T> | JSONSchema`) - Schema for validation and type information
- `config.readOnly` (`boolean`, optional) - If true, only creates getter. Defaults to `false`
- `config.stateSchemaSplit` (`SplitPlan | DecompositionOptions`, optional) - Schema decomposition for partial updates

**Returns:** `() => void` - Cleanup function to remove the tools

## Design Philosophy

### Why Objects/Arrays Only?

This integration only supports objects and arrays, not primitives. This is intentional:

1. **Tools are structured** - MCP tools work best with structured data
2. **Svelte's reactivity** - Proxies work perfectly for deep object/array mutations
3. **Better API design** - Forces thoughtful state organization

If you need to expose a primitive value, wrap it in an object:
```typescript
let count = $state({ value: 0 });
```

### Writable by Default

State is writable by default (`readOnly: false`) because:
- Tools are meant to be used (read + write)
- Matches JavaScript property semantics (properties are writable unless `readonly`)
- Read-only state ($derived) is the exception, not the rule

## Comparison with Other Integrations

| Feature | Jotai | React | Svelte |
|---------|-------|-------|--------|
| State container | Atoms | useState | $state/$derived |
| Getter/setter | atom.get/set | value/setValue | Direct access via proxy |
| Cleanup | Manual | useEffect | Manual |
| Read-only | Derived atoms | No setter | readOnly flag |
| Supported types | All | All | Objects/arrays only |

## Examples

See the [demos](../../../demos) directory for complete examples.

## License

MIT