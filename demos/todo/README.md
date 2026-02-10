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

## Testing the Statistics MCP App

With the dev server running, open `http://localhost:5175/mcp-web-apps/statistics.html` in your browser. Then simulate props via the console:

```js
window.postMessage({ props: {
  totalTodos: 10, completedTodos: 7, activeTodos: 3, completionRate: 0.7,
  totalProjects: 2,
  completedTodosWithTime: [
    { id: '1', completionTimeMs: 3600000, projectId: 'p1', projectName: 'Work' },
    { id: '2', completionTimeMs: 86400000, projectId: 'p1', projectName: 'Work' },
    { id: '3', completionTimeMs: 7200000, projectId: 'p2', projectName: 'Personal' },
    { id: '4', completionTimeMs: 259200000, projectId: 'p2', projectName: 'Personal' },
  ],
  completedTodosWithDueDate: [
    { id: '1', dueVarianceMs: -86400000, projectId: 'p1', projectName: 'Work' },
    { id: '2', dueVarianceMs: 172800000, projectId: 'p2', projectName: 'Personal' },
  ],
  projects: [{ id: 'p1', name: 'Work' }, { id: 'p2', name: 'Personal' }],
  projectStats: [
    { id: 'p1', name: 'Work', total: 5, completed: 3, active: 2 },
    { id: 'p2', name: 'Personal', total: 5, completed: 4, active: 1 },
  ],
} }, '*');
```
