# @mcp-web/react

Expose React component state as MCP tools so Claude can read and write your UI state.

## Installation

```bash
npm install @mcp-web/react
```

*Requires `react` to be installed in your project.*

## Basic Usage

```typescript
import { MCPWebProvider, useTool } from '@mcp-web/react';
import { useState } from 'react';
import { z } from 'zod';

function Root() {
  return (
    <MCPWebProvider config={{ name: 'My App', description: 'My application' }}>
      <MyComponent />
    </MCPWebProvider>
  );
}

function MyComponent() {
  // Your React state
  const [filterText, setFilterText] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  // Expose state as read-write MCP tools
  // No need to pass mcpWeb - it's automatically accessed from context!
  useTool({
    name: 'filter_text',
    description: 'Text filter for searching items',
    value: filterText,
    setValue: setFilterText,
    valueSchema: z.string(),
  });

  useTool({
    name: 'view_mode',
    description: 'Current display mode',
    value: viewMode,
    setValue: setViewMode,
    valueSchema: z.enum(['grid', 'list', 'card']),
  });

  return <div>Your component UI...</div>;
}
```

## Complex State Objects

For large object state, you can use schema splitting:

```typescript
const [userPreferences, setUserPreferences] = useState({
  theme: 'light',
  notifications: { email: true, push: false },
  display: { compact: false, animations: true }
});

const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark']),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean()
  }),
  display: z.object({
    compact: z.boolean(),
    animations: z.boolean()
  })
});

useTool({
  name: 'user_preferences',
  description: 'User interface preferences',
  value: userPreferences,
  setValue: setUserPreferences,
  valueSchema: preferencesSchema,
  // Expose the user preferences as three MCP tools. One for theme,
  // notifications, and display settings each.
  valueSchemaSplit: ['theme', 'notifications', 'display'],
});
```

This creates multiple MCP tools:
- `set_user_preferences_theme` - Set theme
- `set_user_preferences_notifications` - Set notification settings
- `set_user_preferences_display` - Set display options

## Read-Only State

For read-only state, omit the `setValue` prop:

```typescript
useTool({
  name: 'project_statistics',
  description: 'Current project statistics',
  value: calculateStats(), // Function that returns current stats
  valueSchema: statsSchema,
  // No setValue - this becomes read-only
});
```

## Advanced: Manual MCPWeb Instance

If you need manual control over the MCPWeb instance, you can pass it explicitly:

```typescript
import { MCPWeb } from '@mcp-web/web';
import { useTool } from '@mcp-web/react';

const mcpWeb = new MCPWeb({ name: 'My App' });

function MyComponent() {
  const [state, setState] = useState('');

  useTool({
    mcpWeb, // Explicit instance (optional when using MCPWebProvider)
    name: 'state',
    description: 'My state',
    value: state,
    setValue: setState,
    valueSchema: z.string(),
  });
}
```

## API Reference

### `MCPWebProvider`

Provider component that creates and manages the MCPWeb instance.

**Props:**
- `config` - MCPWeb configuration object
  - `name` - Application name
  - `description` - Application description
  - Other MCPWeb config options
- `children` - React components

### `useMCPWeb()`

Hook to access the MCPWeb instance and connection state from context.

**Returns:**
- `mcpWeb` - The MCPWeb instance
- `isConnected` - Boolean indicating connection status

**Example:**
```typescript
function MyComponent() {
  const { mcpWeb, isConnected } = useMCPWeb();

  if (!isConnected) {
    return <div>Connecting to MCP bridge...</div>;
  }

  // Use mcpWeb...
}
```

### `useTool(config)`

Register state as MCP tools.

**Config:**
- `mcpWeb` *(optional)* - MCPWeb instance (auto-detected from context)
- `name` - Tool name
- `description` - Tool description
- `value` - Current state value
- `setValue` *(optional)* - State setter function (omit for read-only)
- `valueSchema` - Zod schema for validation
- `valueSchemaSplit` *(optional)* - Split complex objects into multiple tools

The hook automatically handles tool registration/cleanup on mount/unmount.
