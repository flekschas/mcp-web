# React Integration API

## Other

### MCPWebContextValue

*Interface* — `packages/integrations/react/src/mcp-web-context.ts`

**Properties:**

```ts
mcpWeb: MCPWeb
```

```ts
isConnected: boolean
```

### MCPWebProviderPropsWithConfig

*Interface* — `packages/integrations/react/src/mcp-web-provider.ts`

**Properties:**

```ts
children: ReactNode
```

```ts
config: MCPWebConfig
```

### MCPWebProviderPropsWithInstance

*Interface* — `packages/integrations/react/src/mcp-web-provider.ts`

**Properties:**

```ts
children: ReactNode
```

```ts
mcpWeb: MCPWeb
```

### MCPWebProviderProps

*Type* — `packages/integrations/react/src/mcp-web-provider.ts`

```ts
MCPWebProviderPropsWithConfig | MCPWebProviderPropsWithInstance
```

### RegisterableTool

*Type* — `packages/integrations/react/src/use-tools.ts`

A tool that can be registered with useTools.
Can be a CreatedTool, CreatedStateTools, or a raw ToolDefinition.

### MCPWebProvider

*Function* — `packages/integrations/react/src/mcp-web-provider.ts`

Provider component for sharing MCPWeb instance across component tree.
Handles MCPWeb instantiation and connection lifecycle automatically.

```ts
MCPWebProvider({ children, ...props }: MCPWebProviderProps): void
```

### useConnectedMCPWeb

*Function* — `packages/integrations/react/src/use-connected-mcp-web.ts`

Internal hook for managing MCPWeb connection lifecycle.
Connects on mount and disconnects on unmount.
Returns reactive connection state for triggering re-renders.

```ts
useConnectedMCPWeb(mcpInstance: MCPWeb): MCPWebContextValue
```

### useMCPWeb

*Function* — `packages/integrations/react/src/use-mcp-web.ts`

Hook for accessing MCPWeb instance from context.
Must be used within MCPWebProvider.

```ts
useMCPWeb(): MCPWebContextValue
```

### useTools

*Function* — `packages/integrations/react/src/use-tools.ts`

Hook for registering pre-created tools with automatic cleanup on unmount.

This is the recommended way to register tools in React applications.
Tools are registered when the component mounts and automatically
unregistered when the component unmounts.

```ts
useTools(tools: (RegisterableTool | RegisterableTool[])[]): void
```

### MCPWebContext

*Variable* — `packages/integrations/react/src/mcp-web-context.ts`

```ts
unknown
```
