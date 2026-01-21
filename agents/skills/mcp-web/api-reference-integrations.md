# MCP-React-Integration

## Interfaces

### MCPWebContextValue

Defined in: integrations/react/src/mcp-web-context.ts:4

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="isconnected"></a> `isConnected` | `boolean` | integrations/react/src/mcp-web-context.ts:6 |
| <a id="mcpweb"></a> `mcpWeb` | `MCPWeb` | integrations/react/src/mcp-web-context.ts:5 |

***

### MCPWebProviderPropsWithConfig

Defined in: integrations/react/src/mcp-web-provider.ts:7

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="children"></a> `children` | `ReactNode` | integrations/react/src/mcp-web-provider.ts:8 |
| <a id="config"></a> `config` | \{ `agentUrl?`: `string`; `authToken?`: `string`; `autoConnect?`: `boolean`; `description`: `string`; `host?`: `string`; `icon?`: `string`; `maxInFlightQueriesPerToken?`: `number`; `maxSessionsPerToken?`: `number`; `mcpPort?`: `number`; `name`: `string`; `onSessionLimitExceeded?`: `"reject"` \| `"close_oldest"`; `persistAuthToken?`: `boolean`; `sessionMaxDurationMs?`: `number`; `wsPort?`: `number`; \} | integrations/react/src/mcp-web-provider.ts:9 |
| `config.agentUrl?` | `string` | types/dist/config.d.ts:9 |
| `config.authToken?` | `string` | types/dist/config.d.ts:10 |
| `config.autoConnect?` | `boolean` | types/dist/config.d.ts:12 |
| `config.description` | `string` | types/dist/config.d.ts:4 |
| `config.host?` | `string` | types/dist/config.d.ts:5 |
| `config.icon?` | `string` | types/dist/config.d.ts:8 |
| `config.maxInFlightQueriesPerToken?` | `number` | types/dist/config.d.ts:18 |
| `config.maxSessionsPerToken?` | `number` | types/dist/config.d.ts:13 |
| `config.mcpPort?` | `number` | types/dist/config.d.ts:7 |
| `config.name` | `string` | types/dist/config.d.ts:3 |
| `config.onSessionLimitExceeded?` | `"reject"` \| `"close_oldest"` | types/dist/config.d.ts:14 |
| `config.persistAuthToken?` | `boolean` | types/dist/config.d.ts:11 |
| `config.sessionMaxDurationMs?` | `number` | types/dist/config.d.ts:19 |
| `config.wsPort?` | `number` | types/dist/config.d.ts:6 |

***

### MCPWebProviderPropsWithInstance

Defined in: integrations/react/src/mcp-web-provider.ts:12

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="children-1"></a> `children` | `ReactNode` | integrations/react/src/mcp-web-provider.ts:13 |
| <a id="mcpweb-1"></a> `mcpWeb` | `MCPWeb` | integrations/react/src/mcp-web-provider.ts:14 |

## Type Aliases

### MCPWebProviderProps

```ts
type MCPWebProviderProps = 
  | MCPWebProviderPropsWithConfig
  | MCPWebProviderPropsWithInstance;
```

Defined in: integrations/react/src/mcp-web-provider.ts:17

***

### RegisterableTool

```ts
type RegisterableTool = CreatedTool | CreatedStateTools<any> | ToolDefinition;
```

Defined in: integrations/react/src/use-tools.ts:11

A tool that can be registered with useTools.
Can be a CreatedTool, CreatedStateTools, or a raw ToolDefinition.

## Functions

### MCPWebProvider()

```ts
function MCPWebProvider(__namedParameters: MCPWebProviderProps): FunctionComponentElement<ProviderProps<MCPWebContextValue | null>>;
```

Defined in: integrations/react/src/mcp-web-provider.ts:34

Provider component for sharing MCPWeb instance across component tree.
Handles MCPWeb instantiation and connection lifecycle automatically.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | [`MCPWebProviderProps`](#mcpwebproviderprops) |

#### Returns

`FunctionComponentElement`\<`ProviderProps`\<[`MCPWebContextValue`](#mcpwebcontextvalue) \| `null`\>\>

#### Example

```tsx
function Root() {
  return (
    <MCPWebProvider config={{ name: 'My App', description: 'My app description' }}>
      <App />
    </MCPWebProvider>
  );
}
```

***

### useMCPWeb()

```ts
function useMCPWeb(): MCPWebContextValue;
```

Defined in: integrations/react/src/use-mcp-web.ts:19

Hook for accessing MCPWeb instance from context.
Must be used within MCPWebProvider.

#### Returns

[`MCPWebContextValue`](#mcpwebcontextvalue)

Object containing the MCPWeb instance and connection state

#### Throws

Error if used outside of MCPWebProvider

#### Example

```tsx
function MyComponent() {
  const { mcpWeb, isConnected } = useMCPWeb();
  // Use mcpWeb...
}
```

***

### useTools()

#### Call Signature

```ts
function useTools(...tools: (
  | RegisterableTool
  | RegisterableTool[])[]): void;
```

Defined in: integrations/react/src/use-tools.ts:85

Hook for registering pre-created tools with automatic cleanup on unmount.

This is the recommended way to register tools in React applications.
Tools are registered when the component mounts and automatically
unregistered when the component unmounts.

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| ...`tools` | ( \| [`RegisterableTool`](#registerabletool) \| [`RegisterableTool`](#registerabletool)[])[] | Tools to register (variadic or array) |

##### Returns

`void`

##### Examples

```tsx
// tools.ts
import { createTool, createStateTools } from '@mcp-web/core';

export const timeTool = createTool({
  name: 'get_time',
  description: 'Get current time',
  handler: () => new Date().toISOString(),
});

export const todoTools = createStateTools({
  name: 'todos',
  description: 'Todo list',
  get: () => store.get(todosAtom),
  set: (value) => store.set(todosAtom, value),
  schema: TodosSchema,
  expand: true,
});

// App.tsx
import { useTools } from '@mcp-web/react';
import { timeTool, todoTools } from './tools';

function App() {
  useTools(timeTool, todoTools);
  return <div>...</div>;
}
```

```tsx
function AdminPanel() {
  // These tools only exist while AdminPanel is mounted
  useTools(adminTools);
  return <div>Admin controls</div>;
}

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  return (
    <div>
      {isAdmin && <AdminPanel />}
    </div>
  );
}
```

```tsx
const allTools = [todoTools, projectTools, settingsTools];

function App() {
  useTools(allTools);
  // or: useTools(...allTools);
  return <div>...</div>;
}
```

#### Call Signature

```ts
function useTools(mcpWeb: MCPWeb, ...tools: (
  | RegisterableTool
  | RegisterableTool[])[]): void;
```

Defined in: integrations/react/src/use-tools.ts:89

Hook for registering pre-created tools with automatic cleanup on unmount.

This is the recommended way to register tools in React applications.
Tools are registered when the component mounts and automatically
unregistered when the component unmounts.

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `mcpWeb` | `MCPWeb` | - |
| ...`tools` | ( \| [`RegisterableTool`](#registerabletool) \| [`RegisterableTool`](#registerabletool)[])[] | Tools to register (variadic or array) |

##### Returns

`void`

##### Examples

```tsx
// tools.ts
import { createTool, createStateTools } from '@mcp-web/core';

export const timeTool = createTool({
  name: 'get_time',
  description: 'Get current time',
  handler: () => new Date().toISOString(),
});

export const todoTools = createStateTools({
  name: 'todos',
  description: 'Todo list',
  get: () => store.get(todosAtom),
  set: (value) => store.set(todosAtom, value),
  schema: TodosSchema,
  expand: true,
});

// App.tsx
import { useTools } from '@mcp-web/react';
import { timeTool, todoTools } from './tools';

function App() {
  useTools(timeTool, todoTools);
  return <div>...</div>;
}
```

```tsx
function AdminPanel() {
  // These tools only exist while AdminPanel is mounted
  useTools(adminTools);
  return <div>Admin controls</div>;
}

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  return (
    <div>
      {isAdmin && <AdminPanel />}
    </div>
  );
}
```

```tsx
const allTools = [todoTools, projectTools, settingsTools];

function App() {
  useTools(allTools);
  // or: useTools(...allTools);
  return <div>...</div>;
}
```
