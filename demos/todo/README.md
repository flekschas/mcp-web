# Todo Demo

A React + Jotai todo app demonstrating MCP-Web integration. AI agents can manage todos, projects, and settings through exposed state tools.

## Quick Start

```bash
pnpm install
pnpm dev       # Starts app (localhost:5175) + bridge server (localhost:3001)
```

## Available Tools

| Tool | Description |
|------|-------------|
| `get_todos`, `add_todos`, `set_todos`, `delete_todos` | CRUD operations for todos |
| `get_projects`, `set_projects`, `delete_projects` | CRUD operations for projects |
| `get_settings`, `set_settings` | Theme, sort order, and display preferences |

## Preloaded Seed Data

On first run (empty localStorage), the app auto-loads ~45 todos across 3 projects with realistic timestamps for testing statistics and charts.

To reset and reload seed data:
```js
// In browser console
window.clearDemoData()
// Then refresh the page
```

## Scripts

- `pnpm dev` - Run app + bridge together
- `pnpm dev:app` - Run Vite dev server only
- `pnpm dev:bridge` - Run bridge server only
- `pnpm build` - Production build
