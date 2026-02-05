# MCP-Web React Integration API

### MCPWebContextValue

*Interface* — `packages/integrations/react/src/mcp-web-context.ts`

Context value provided by MCPWebProvider.

**Properties:**

```ts
mcpWeb: MCPWeb
```

The MCPWeb instance for registering tools and making queries.

```ts
isConnected: boolean
```

Whether the MCPWeb instance is connected to the bridge server.

### MCPWebProviderPropsWithConfig

*Interface* — `packages/integrations/react/src/mcp-web-provider.ts`

Props for MCPWebProvider when creating a new MCPWeb instance from config.

**Properties:**

```ts
children: ReactNode
```

Child components that can access MCPWeb via useMCPWeb hook.

```ts
config: MCPWebConfig
```

Configuration for creating a new MCPWeb instance.

### MCPWebProviderPropsWithInstance

*Interface* — `packages/integrations/react/src/mcp-web-provider.ts`

Props for MCPWebProvider when using an existing MCPWeb instance.

**Properties:**

```ts
children: ReactNode
```

Child components that can access MCPWeb via useMCPWeb hook.

```ts
mcpWeb: MCPWeb
```

Existing MCPWeb instance to provide to children.

### MCPWebProviderProps

*Type* — `packages/integrations/react/src/mcp-web-provider.ts`

Props for MCPWebProvider component.
Either provide a `config` to create a new instance, or `mcpWeb` to use an existing one.

### RegisterableApp

*Type* — `packages/integrations/react/src/use-mcp-apps.ts`

An app that can be registered with useApps.
Can be a CreatedApp or a raw AppDefinition.

### RegisterableTool

*Type* — `packages/integrations/react/src/use-mcp-tools.ts`

A tool that can be registered with useMCPTools.
Can be a CreatedTool, CreatedStateTools, or a raw ToolDefinition.

### MCPWebProvider

*Function* — `packages/integrations/react/src/mcp-web-provider.ts`

Provider component that shares an MCPWeb instance across the component tree.

Handles MCPWeb instantiation (if config provided) and connection lifecycle
automatically. All child components can access the MCPWeb instance via the
`useMCPWeb` hook.

```ts
MCPWebProvider({ children, ...props }: MCPWebProviderProps): void
```

### useConnectedMCPWeb

*Function* — `packages/integrations/react/src/use-connected-mcp-web.ts`

Internal hook for managing MCPWeb connection lifecycle.
Connects on mount and disconnects on unmount.
Returns reactive connection state for triggering re-renders.

Handles React StrictMode's double-mount behavior by using a ref to track
whether we should actually disconnect on cleanup.

```ts
useConnectedMCPWeb(mcpInstance: MCPWeb): MCPWebContextValue
```

### useMCPApps

*Function* — `packages/integrations/react/src/use-mcp-apps.ts`

Hook for registering MCP Apps with automatic cleanup on unmount.

This is the recommended way to register MCP Apps in React applications.
Apps are registered when the component mounts and automatically
unregistered when the component unmounts.

MCP Apps are visual UI components that AI can render inline in chat
interfaces like Claude Desktop.

```ts
useMCPApps(apps: (RegisterableApp | RegisterableApp[])[]): void
```

### useMCPTools

*Function* — `packages/integrations/react/src/use-mcp-tools.ts`

Hook for registering MCP tools with automatic cleanup on unmount.

This is the recommended way to register tools in React applications.
Tools are registered when the component mounts and automatically
unregistered when the component unmounts.

```ts
useMCPTools(tools: (RegisterableTool | RegisterableTool[])[]): void
```

### useMCPWeb

*Function* — `packages/integrations/react/src/use-mcp-web.ts`

Hook for accessing MCPWeb instance from context.
Must be used within MCPWebProvider.

```ts
useMCPWeb(): MCPWebContextValue
```

### MCPWebContext

*Variable* — `packages/integrations/react/src/mcp-web-context.ts`

React context for sharing MCPWeb instance across component tree.
