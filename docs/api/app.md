# MCP-Web Apps API

### `CreateAppConfig<TComponent, TInput>`

*Interface* — `packages/app/src/create-app.ts`

Configuration for creating an MCP App.

An MCP App combines a tool (that AI can call) with a visual component
(rendered in an iframe). The handler returns props that are passed to
your React component via postMessage.

The component's props type is used to ensure type safety - the handler
must return props that match what the component expects.

**Properties:**

```ts
name: string
```

Unique name for the app (also used as tool name)

```ts
description: string
```

Description of what the app does (shown to AI)

```ts
component: TComponent
```

React component to render - handler must return props matching this component

```ts
inputSchema?: TInput
```

Optional Zod schema for validating tool input

```ts
propsSchema?: z.ZodType<ComponentProps<TComponent>>
```

Optional Zod schema for validating props output

```ts
handler: TInput extends z.ZodObject
    ? (
        input: z.infer<TInput>
      ) => ComponentProps<TComponent> | Promise<ComponentProps<TComponent>>
    : () => ComponentProps<TComponent> | Promise<ComponentProps<TComponent>>
```

Handler function that returns props for the component

```ts
url?: string
```

URL to fetch the app HTML from (defaults to /mcp-web-apps/{kebab-case-name}.html)

```ts
resourceUri?: string
```

Resource URI for the app (defaults to ui://{name}/app.html)

### `CreatedApp<TComponent, TInput>`

*Interface* — `packages/app/src/create-app.ts`

A created app ready for registration with MCPWeb.

Created apps are validated at creation time but not yet active.
Register with `mcp.addApp(app)` or the `useMCPApps()` hook to make
the tool available to AI.

**Properties:**

```ts
__brand: 'CreatedApp'
```

Marker to identify this as a created app

```ts
definition: {
    name: string;
    description: string;
    component: TComponent;
    inputSchema?: TInput;
    propsSchema?: z.ZodType<ComponentProps<TComponent>>;
    handler: CreateAppConfig<TComponent, TInput>['handler'];
    url?: string;
    resourceUri?: string;
  }
```

The app definition for registration

```ts
config: CreateAppConfig<TComponent, TInput>
```

The original config for type inference

### MCPAppOptions

*Interface* — `packages/app/src/vite-plugin.ts`

MCP-specific options for building MCP Apps.

These options control how app definitions are discovered and where
the bundled HTML files are output.

**Properties:**

```ts
appsConfig?: string
```

Path to the apps configuration file (relative to project root).
This file should export apps created with `createApp()`.

If not specified, will search for:
- `src/mcp-apps.ts`
- `src/mcp-apps.tsx`
- `src/mcp/apps.ts`
- `src/mcp/apps.tsx`

```ts
outDir?: string
```

Output directory for bundled app HTML files (relative to project root).

```ts
silenceOverrideWarnings?: boolean
```

Silence warnings when MCP-required settings override user-provided values.

### createApp

*Function* — `packages/app/src/create-app.ts`

Creates an MCP App definition without registering it.

MCP Apps combine a tool (that AI can call to get props) with a visual
React component. When AI calls the tool, the handler returns props which
are passed to the component via postMessage.

The Vite plugin automatically generates entry files for your apps, so you
only need to define the app configuration:

```typescript
// src/mcp-apps.ts
import { createApp } from '@mcp-web/app';
import { Statistics } from './components/Statistics';

export const statisticsApp = createApp({
  name: 'show_statistics',
  description: 'Display statistics visualization',
  component: Statistics,
  handler: () => ({
    completionRate: 0.75,
    totalTasks: 100,
  }),
});
```

```ts
createApp<TComponent, TInput>(config: CreateAppConfig<TComponent, TInput>): CreatedApp<TComponent, TInput>
```

### isCreatedApp

*Function* — `packages/app/src/create-app.ts`

Type guard to check if a value is a CreatedApp.

Useful for validating values passed to `addApp()` or for runtime checks.

```ts
isCreatedApp(value: unknown): value is CreatedApp
```

### useMCPAppProps

*Function* — `packages/app/src/use-mcp-app-props.ts`

React hook to receive props from the MCP host via the ext-apps protocol.

This hook connects to the host (e.g., Claude Desktop) using the
`@modelcontextprotocol/ext-apps` JSON-RPC protocol. It listens for
`tool-result` notifications, which contain the props returned by the
tool handler as JSON in `content[0].text`.

Must be called within an `MCPAppProvider` (set up automatically
by `renderMCPApp`).

```ts
useMCPAppProps<T>(): T | null
```

### useMCPApp

*Function* — `packages/app/src/use-mcp-app-props.ts`

Get the ext-apps `App` instance for advanced use cases.

This hook provides access to the underlying `App` class from
`@modelcontextprotocol/ext-apps`, enabling bidirectional communication
with the host (e.g., calling server tools, sending messages).

Must be called within an `MCPAppProvider` (set up automatically
by `renderMCPApp`).

```ts
useMCPApp(): void
```

### getMCPAppProps

*Function* — `packages/app/src/use-mcp-app-props.ts`

Get current MCP App props synchronously.

```ts
getMCPAppProps<T>(): T | null
```

### subscribeMCPAppProps

*Function* — `packages/app/src/use-mcp-app-props.ts`

Subscribe to MCP App props changes.

```ts
subscribeMCPAppProps<T>(_listener: (props: T) => void): () => void
```

### defineMCPAppsConfig

*Function* — `packages/app/src/vite-plugin.ts`

Define a Vite configuration for building MCP Apps as single HTML files.

This function creates a complete Vite config that auto-discovers app
definitions and bundles them into self-contained HTML files. These files
can be served as MCP App resources that render inline in AI chat interfaces.

**How it works:**
1. Scans for a config file (`src/mcp-apps.ts` or `src/mcp/apps.ts`)
2. Parses `createApp()` calls to find app names and components
3. Auto-generates entry files that render each component
4. Bundles everything into single HTML files

**Features:**
- No manual entry files needed - just define your apps!
- Full Vite config flexibility - pass any standard Vite options
- Automatic single-file bundling (JS, CSS, assets all inlined)
- Watch mode support for development
- PostMessage runtime for receiving props from the host

**Critical settings that are always enforced:**
- `build.assetsInlineLimit` → Maximum (for inlining)
- `build.cssCodeSplit` → false (single CSS bundle)
- `base` → './' (relative paths)

```ts
defineMCPAppsConfig(viteConfig: UserConfig, mcpOptions: MCPAppOptions): UserConfigExport
```
