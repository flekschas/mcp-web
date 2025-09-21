# @mcp-web/jotai

Expose [Jotai](https://jotai.org) atoms as MCP tools to allow an AI host app (like Claude Desktop) to read and write your app's state.

## Installation

```bash
npm install @mcp-web/jotai
```

*Requires `jotai` and `react` to be installed in your project.*

## Two Approaches

### 1. Static Registration (`addAtomTool`)

For always-available tools, use `addAtomTool` in dedicated files:

```typescript
// tools.ts
import { MCPWeb } from '@mcp-web/web';
import { addAtomTool } from '@mcp-web/jotai';
import { z } from 'zod';
import { viewConfigAtom } from './states';

const mcp = new MCPWeb({ name: 'My App' });

addAtomTool({
  mcp,
  atom: viewConfigAtom,
  name: 'view_config',
  description: 'App layout and display settings',
  atomSchema: z.object({
    layout: z.enum(['grid', 'list']),
    showSidebar: z.boolean(),
    theme: z.enum(['light', 'dark'])
  }),
});
```

Then import this file in your app entry point:
```typescript
// main.tsx
import './tools'; // Ensures tools are registered
import App from './App';
```

### 2. Dynamic Registration (`useAtomTool`)

For conditional or component-scoped tools, use the React hook:

```typescript
// MyComponent.tsx  
import { useAtomTool } from '@mcp-web/jotai';
import { useAtom } from 'jotai';

function SettingsModal({ isOpen, mcp }) {
  const [settings, setSettings] = useAtom(settingsAtom);

  // Only register tool when modal is open
  if (isOpen) {
    useAtomTool({
      mcp,
      atom: settingsAtom,
      name: 'modal_settings',
      description: 'Settings visible in the modal',
      atomSchema: settingsSchema,
    });
  }

  return isOpen ? <div>Settings UI...</div> : null;
}
```

## Advanced Usage with Schema Splitting

For complex objects, you can split them into multiple tools:

```typescript
import { addAtomTool } from '@mcp-web/jotai';

// Define split plan for granular control
const splitPlan = {
  display: ['layout', 'showSidebar'],
  appearance: ['theme', 'colorScheme']
};

addAtomTool({
  mcp,
  atom: complexConfigAtom,
  name: 'app_config', 
  description: 'Application configuration settings',
  atomSchema: complexConfigSchema,
  atomSchemaSplit: splitPlan, // Creates separate tools for each group
});
```

This creates multiple tools:
- `get_app_config` - Get complete config
- `set_app_config_display` - Set layout/sidebar
- `set_app_config_appearance` - Set theme/colors

## When to Use Each Approach

### Use `addAtomTool` (Static) When:
- ✅ Tools should always be available
- ✅ Core app state that persists across navigation
- ✅ Performance is critical (no re-registration overhead)
- ✅ Clean separation of concerns

### Use `useAtomTool` (Dynamic) When:
- ✅ Tools depend on component state/props
- ✅ Conditional tool availability (user permissions, feature flags)
- ✅ Modal or temporary UI state
- ✅ Component-scoped atoms

## File Organization (Static Approach)

Jotai enables clean separation of state from components. Recommended structure:

- `schemas.ts` - Zod schemas for validation
- `types.ts` - TypeScript types from schemas  
- `states.ts` - Jotai atom definitions
- `tools.ts` - MCP tool registrations

> [!IMPORTANT]
> Import your `tools.ts` file in your app entry point (`main.tsx`) to prevent tree-shaking:
> ```typescript
> import './tools'; // Registers all MCP tools
> import App from './App';
> ```
> 
> Without this explicit import, bundlers may remove unused tool registrations!

## API Reference

### `addAtomTool(config)`

- `mcp` - MCPWeb instance
- `atom` - Jotai atom (readable or writable) 
- `name` - Tool name prefix
- `description` - Tool description
- `atomSchema` - Zod schema for validation
- `atomSchemaSplit` _(optional)_ - Split complex objects into multiple tools
- `store` _(optional)_ - Custom Jotai store (defaults to global store)

**Returns:** Cleanup function to remove the tools

### `useAtomTool(config)`

Same parameters as `addAtomTool`, but automatically handles cleanup on component unmount. Use for conditional tool registration within React components.