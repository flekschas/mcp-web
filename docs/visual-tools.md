# Visual Tools

Visual tools are MCP tools that return visual UI components rendered inline in
AI agents like Claude Desktop. While regular tools return data for AI to process
and reason about, visual tools return interfaces meant for the human user —
charts, dashboards, and data visualizations that help users understand their
data at a glance.

This is powered by [MCP Apps](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/),
an extension to [MCP](https://modelcontextprotocol.io) that lets servers provide
UI components. When AI calls a visual tool, the host renders your component as
an iframe alongside the text response.

MCP-Web provides first-class support for building visual tools. You define a
tool with a handler that returns props, and when AI invokes the tool, those
props are passed to your component via `postMessage`.

::: tip React Support Only
For now, only React components are supported but over time we'll add support for
other frameworks. The work needed to support other frameworks primarily involves
creating templates for bundling components of your app as standalone MCP apps.
:::

<div id="app-flow" class="img"><div /></div>

## When to Use Visual Tools

Visual tools are ideal when you want to show something to the user of an AI agent.
Common use cases include:

- **Data visualizations and dashboards**: Charts, graphs, stats
- **Interactive user interfaces**: Continuous control elements
- **Structured displays**: Tables, cards, timelines

::: tip
Visual tools render in iframes and receive props from your handler. They don't
have direct access to your MCPWeb instance, but can make HTTP requests or
communicate with your backend like any web component.
:::

## Quick Start

In the MCP-Web context, think of a visual tool as a wrapper around a component
of your frontend app that you already have. To expose this component via an MCP
tool we just need to define its interface and bundle it as a single
self-contained HTML file.

::: note Complete Example: Todo Demo
For a complete example, see the [todo Demo](/demos/todo), which includes a full
visual tool implementation for a statistics dashboard.
:::

### 1. Create Your Component

Your component is just regular React. It doesn't need to know about MCP at all.

```tsx
// src/components/Stats.tsx
import { z } from 'zod';

export const StatsPropsSchema = z.object({
  total: z.number(),
  completed: z.number(),
  completionRate: z.number(),
});

export type StatsProps = z.infer<typeof StatsPropsSchema>;

export function Stats({ total, completed, completionRate }: StatsProps) {
  return (
    <div style={{ padding: 16, fontFamily: 'system-ui' }}>
      <h2>Todo Stats</h2>
      <p>{completed} / {total} completed</p>
      <div style={{ background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${completionRate * 100}%`,
          height: 8,
          background: '#3b82f6',
        }} />
      </div>
    </div>
  );
}
```

::: tip Reuse Existing Components
You can expose any existing component without modification. The component just
receives props like normal. The only real consideration is that it should be
fairly self-contained. The bigger its state/props dependencies the more
involved it is to expose it as a standalone app.
:::

### 2. Create a Visual Tool

Define a visual tool by wrapping your component with `createApp()`:

```typescript
// src/mcp-apps.ts
import { createApp } from '@mcp-web/app';
import { z } from 'zod';
import { Stats, StatsPropsSchema } from './components/Stats';

export const statsApp = createApp({
  name: 'show_stats',
  description: 'Display todo statistics',
  component: Stats,
  propsSchema: StatsPropsSchema,
  // Optional: AI-provided input values
  inputSchema: z.object({
    project: z.string().nullable().default(null).describe('Project name to filter the statistics, or null for all todos')
  }),
  // Given the AI-provided inputs, derive and return the props for <Stats />
  handler: ({ project }) => {
    const relatedTodos = project === null
      ? todos
      : todos.filter((t) => t.project === project);
    const total = relatedTodos.length;
    const completed = relatedTodos.filter((t) => t.done).length;
    return { total, completed, completionRate: completed / total || 0 };
  },
});
```

::: note Visual Tool = Tool + Resource
Internally, `createApp()` creates a tool and an accompanying resource. AI will
call the tool as usual and then see it comes with a UI. AI will then request
the UI resource and render it.
:::

### 3. Expose the Visual Tool

Next, you need to register the visual tool with MCP-Web. In React, use the
`useMCPApps` hook:

```tsx
// App.tsx
import { useMCPApps } from '@mcp-web/react';
import { statsApp } from './mcp-apps';

function App() {
  useMCPApps(statsApp);
  return <div>...</div>;
}
```

Or register directly with an MCPWeb instance:

```typescript
import { statsApp } from './mcp-apps';

mcp.addApp(statsApp);
```

### 4. Bundle the Visual Tool

Finally, you must create a single-file self-contained HTML file for your
component with all JS/CSS inlined. To streamline the process MCP-Web offers a
predefined config for [Vite](https://vite.dev/): `defineMCPAppsConfig()`

```typescript
// vite.apps.config.ts
import react from '@vitejs/plugin-react';
import { defineMCPAppsConfig } from '@mcp-web/app/vite';

export default defineMCPAppsConfig({
  plugins: [react()],
});
```

The `defineMCPAppsConfig` function creates a complete Vite configuration that:
- Auto-discovers visual tool definitions in `src/mcp-apps.ts` or `src/mcp/apps.ts`
- Generates entry files for each `createApp()` call
- Bundles each as a self-contained HTML file
- Inlines all JavaScript, CSS, and assets
- Includes the runtime for receiving props

Add build scripts to your `package.json`:

```json
{
  "scripts": {
    "build:mcp-apps": "vite build --config vite.apps.config.ts",
    "dev:mcp-apps": "vite build --config vite.apps.config.ts --watch"
  }
}
```

Build the apps:

```bash
npm run build:mcp-apps
```

In our case, this outputs `public/mcp-web-apps/show-stats.html`

### 5. Test It

With your app running and connected to an AI agent, ask:

> "Show me the todo statistics"

Claude will call the `show_stats` tool, and the stats component renders inline
in the chat.

## How It Works

When AI calls a visual tool:

1. **Tool execution**: Your handler runs and returns props
2. **Response with UI metadata**: The tool response includes `_meta.ui.resourceUri`
3. **Resource fetch**: The host requests the HTML via MCP's `resources/read`
4. **Iframe render**: The host renders your HTML in an iframe
5. **Props delivery**: Props are sent to the iframe via `postMessage`
6. **Component render**: Your React component receives props and renders

The Vite plugin automatically generates entry files that handle steps 5-6,
subscribing to incoming props and rendering your component when they arrive.

## Host Theming

Visual tools receive information about the host application's theme. When your
component renders inside Claude Desktop (or any MCP host), `@mcp-web/app`
automatically sets the host's CSS custom properties, theme, and fonts on the
document. You can then use these variables in your components for dynamic
styling.

### How It Works

During initialization, the host sends its theme preference (`"light"` or
`"dark"`) and a set of CSS custom properties covering colors, typography,
borders, and more. MCP-Web automatically:

- Sets `data-theme="light"` or `data-theme="dark"` on `<html>`
- Sets `color-scheme` for native element theming (scrollbars, inputs)
- Applies CSS custom properties like `--color-background-primary`,
  `--color-text-primary`, etc.
- Injects host font CSS
- Updates all of the above when the user toggles theme at runtime

This all happens inside the `MCPAppProvider` that wraps your component tree.
You don't need to configure anything for this to work.

### Tailwind CSS Dark Mode

If your component uses Tailwind's `dark:` variant with the `class` or
`selector` strategy, use the `useMCPHostTheme` hook to sync the host theme
with Tailwind's `.dark` class:

```tsx
import { useMCPHostTheme } from '@mcp-web/app';
import { useEffect } from 'react';

function MyApp(props: MyProps) {
  const theme = useMCPHostTheme();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="bg-white dark:bg-gray-900 text-black dark:text-white">
      {/* Your component */}
    </div>
  );
}
```

The effect runs once on mount with the initial theme from the host and again
whenever the user toggles theme in the host application.

### Using Host CSS Variables

The host provides CSS custom properties that you can use directly in your
styles to match the host's look and feel:

```css
.card {
  background: var(--color-background-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--border-radius-md);
  font-family: var(--font-sans);
}
```

These variables are applied automatically — just reference them in your CSS.
See the [MCP Apps specification](https://modelcontextprotocol.io/specification/2025-06-18/extensions/apps#host-context)
for the full list of available variables.

### Accessing Host Context

For cases where you need more than the theme, use `useMCPHostContext` to
access the full host context:

```tsx
import { useMCPHostContext } from '@mcp-web/app';

function MyApp() {
  const hostContext = useMCPHostContext();

  return (
    <div>
      <p>Display mode: {hostContext?.displayMode}</p>
      <p>Locale: {hostContext?.locale}</p>
      <p>Platform: {hostContext?.platform}</p>
    </div>
  );
}
```

The host context includes theme, styles, display mode, locale, container
dimensions, and more. It updates automatically when the host sends changes.

## Best Practices

### Minimize Prop Surface Area

Each app's props should be self-contained and computed. Avoid exposing components
that require large portions of your app state as input, as this creates maintenance
burden and/or bloated prop schemas.

```typescript
// ✅ Good: Computed, self-contained, and limited props
const statsApp = createApp({
  name: 'show_stats',
  component: Stats,
  handler: () => ({
    completionRate: completed.length / todos.length,
    totalByProject: computeProjectTotals(todos),
  }),
});

// ❌ Avoid: Passing too many and raw states that the component filters
const statsApp = createApp({
  name: 'show_stats',
  component: Stats,
  handler: () => ({
    // Component only needs 5% of this
    allTodos: todos,
    allProjects: projects,
    allUsers: users,
    // ... another 200 props
  }),
});
```

Compute derived data in your handler so the component receives exactly what it
needs to render.

### Describe Your Input Schema

The `inputSchema` is what AI sees when deciding how to call your tool. Use
`.describe()` on each field to help AI understand what values to provide:

```typescript
import { z } from 'zod';

const chartApp = createApp({
  name: 'show_chart',
  description: 'Display a chart visualization of the data',
  component: Chart,
  inputSchema: z.object({
    chartType: z.enum(['bar', 'line', 'pie']).describe('Type of chart to display'),
    metric: z.enum(['revenue', 'users', 'orders']).describe('Which metric to visualize'),
    timeRange: z.enum(['day', 'week', 'month']).default('week').describe('Time range for the data'),
  }),
  handler: ({ chartType, metric, timeRange }) => {
    const data = getMetricData(metric, timeRange);
    return { chartType, data, title: `${metric} over ${timeRange}` };
  },
});
```

Good descriptions help AI make better decisions about when and how to call your
tool. This is the same best practice as with any MCP tool.

::: tip Props Schema is for Validation Only
The `propsSchema` validates your handler's output at runtime — it's never seen
by AI. Use it to catch bugs early, not to communicate with AI.
:::

### Design for Iframe Constraints

Visual tools render in iframes with limited space. Design accordingly:

- Use relative units and responsive layouts
- Avoid fixed widths that might overflow
- Keep content concise — this isn't a full page
- Test at various iframe sizes

### Include Styles Inline

Since visual tools are self-contained HTML files, styles must be bundled. Use:

- CSS-in-JS (inline styles, styled-components, emotion)
- CSS modules (bundled by Vite)
- Tailwind (with proper Vite setup)

External stylesheets won't work in the bundled HTML.

## Development Tips

### Watch Mode

During development, run the apps build in watch mode:

```bash
npm run dev:mcp-apps
```

This rebuilds automatically when you edit your components or app definitions.

### Preview Without AI

You can test your visual tool component directly by opening the built HTML file
in a browser and simulating props:

```javascript
// In browser console
window.postMessage({ props: { total: 10, completed: 7, completionRate: 0.7 } }, '*');
```

### Multiple Visual Tools

Each `createApp()` call in your config file becomes a separate HTML file. The
file name is derived from the `name` field (converted to kebab-case):

```typescript
// src/mcp-apps.ts
export const statsApp = createApp({
  name: 'show_stats',        // → show-stats.html
  component: Stats,
  handler: () => ({ ... }),
});

export const chartApp = createApp({
  name: 'show_chart',        // → show-chart.html
  component: Chart,
  handler: () => ({ ... }),
});

export const timelineApp = createApp({
  name: 'show_timeline',     // → show-timeline.html
  component: Timeline,
  handler: () => ({ ... }),
});
```

### Custom Config File Location

By default, the Vite plugin looks for `src/mcp-apps.ts` or `src/mcp/apps.ts`.
You can specify a custom location:

```typescript{3}
export default defineMCPAppsConfig(
  { plugins: [react()] },
  { appsConfig: 'src/custom/my-apps.ts' }
);
```
