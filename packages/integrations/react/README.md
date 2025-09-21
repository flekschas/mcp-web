# @mcp-web/react

Expose React component state as MCP tools so Claude can read and write your UI state.

## Installation

```bash
npm install @mcp-web/react
```

*Requires `react` to be installed in your project.*

## Basic Usage

```typescript
import { MCPWeb } from '@mcp-web/web';
import { useTool } from '@mcp-web/react';
import { useState } from 'react';
import { z } from 'zod';

// Create MCP instance
const mcp = new MCPWeb({ name: 'My App' });

function MyComponent() {
  // Your React state
  const [filterText, setFilterText] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  // Expose state as read-write MCP tool
  useTool({
    mcp,
    name: 'filter_text',
    description: 'Text filter for searching items',
    value: filterText,
    setValue: setFilterText,
    valueSchema: z.string(),
  });

  useTool({
    mcp,
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
  mcp,
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
  mcp,
  name: 'project_statistics',
  description: 'Current project statistics',
  value: calculateStats(), // Function that returns current stats
  valueSchema: statsSchema,
  // No setValue - this becomes read-only
});
```

## API Reference

### `useTool(config)`

- `mcp` - MCPWeb instance
- `name` - Tool name
- `description` - Tool description  
- `value` - Current state value
- `setValue` _(optional)_ - State setter function (omit for read-only)
- `valueSchema` - Zod schema for validation
- `valueSchemaSplit` _(optional)_ - Split complex objects into multiple tools

The hook automatically handles tool registration/cleanup on mount/unmount.
