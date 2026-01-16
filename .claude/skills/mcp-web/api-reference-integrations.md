# MCP-React-Integration

## Interfaces

### MCPWebProviderProps

Defined in: [integrations/react/src/index.ts:258](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/integrations/react/src/index.ts#L258)

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="children"></a> `children` | `ReactNode` | [integrations/react/src/index.ts:259](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/integrations/react/src/index.ts#L259) |
| <a id="config"></a> `config` | \{ `agentUrl?`: `string`; `authToken?`: `string`; `autoConnect?`: `boolean`; `description`: `string`; `host?`: `string`; `icon?`: `string`; `maxInFlightQueriesPerToken?`: `number`; `maxSessionsPerToken?`: `number`; `mcpPort?`: `number`; `name`: `string`; `onSessionLimitExceeded?`: `"reject"` \| `"close_oldest"`; `persistAuthToken?`: `boolean`; `sessionMaxDurationMs?`: `number`; `wsPort?`: `number`; \} | [integrations/react/src/index.ts:260](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/integrations/react/src/index.ts#L260) |
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

### UseToolConfig

Defined in: [integrations/react/src/index.ts:13](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/integrations/react/src/index.ts#L13)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="description"></a> `description` | `string` | The description of the tool. | [integrations/react/src/index.ts:23](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/integrations/react/src/index.ts#L23) |
| <a id="mcpweb"></a> `mcpWeb?` | `MCPWeb` | The MCPWeb instance to register tools with. Optional - if not provided, will use the instance from MCPWebProvider context. If both are available, the prop takes precedence over context. | [integrations/react/src/index.ts:19](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/integrations/react/src/index.ts#L19) |
| <a id="name"></a> `name` | `string` | The name of the tool. | [integrations/react/src/index.ts:21](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/integrations/react/src/index.ts#L21) |
| <a id="setvalue"></a> `setValue?` | (`value`: `T`) => `void` | The React useState setter function. | [integrations/react/src/index.ts:27](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/integrations/react/src/index.ts#L27) |
| <a id="value"></a> `value` | `T` | The React useState value. | [integrations/react/src/index.ts:25](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/integrations/react/src/index.ts#L25) |
| <a id="valueschema"></a> `valueSchema` | \| `ZodType`\<`T`, `unknown`, `$ZodTypeInternals`\<`T`, `unknown`\>\> \| `JSONSchema` | The schema for validating new values and informing tool use. Can be either a Zod or JSON Schema. | [integrations/react/src/index.ts:29](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/integrations/react/src/index.ts#L29) |
| <a id="valueschemasplit"></a> `valueSchemaSplit?` | `SplitPlan` \| `DecompositionOptions` | The split plan or decomposition options for the value schema (only applies to object schemas). | [integrations/react/src/index.ts:31](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/integrations/react/src/index.ts#L31) |

## Functions

### MCPWebProvider()

```ts
function MCPWebProvider(__namedParameters: MCPWebProviderProps): FunctionComponentElement<ProviderProps<MCPWebContextValue | null>>;
```

Defined in: [integrations/react/src/index.ts:278](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/integrations/react/src/index.ts#L278)

Provider component for sharing MCPWeb instance across component tree.
Handles MCPWeb instantiation and connection lifecycle automatically.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | [`MCPWebProviderProps`](#mcpwebproviderprops) |

#### Returns

`FunctionComponentElement`\<`ProviderProps`\<`MCPWebContextValue` \| `null`\>\>

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

Defined in: [integrations/react/src/index.ts:304](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/integrations/react/src/index.ts#L304)

Hook for accessing MCPWeb instance from context.
Must be used within MCPWebProvider.

#### Returns

`MCPWebContextValue`

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

### useTool()

```ts
function useTool<T>(__namedParameters: UseToolConfig<T>): ToolDefinition[];
```

Defined in: [integrations/react/src/index.ts:68](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/integrations/react/src/index.ts#L68)

Hook for registering tools for a given state value.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | [`UseToolConfig`](#usetoolconfig)\<`T`\> |

#### Returns

`ToolDefinition`[]

#### Example

```tsx
const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});
type Todo = z.infer<typeof TodoSchema>;

function Todos() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useTool({
    name: 'todos',
    description: 'All todos',
    value: todos,
    setValue: setTodos,
    valueSchema: z.array(TodoSchema),
  });

  return (
    <div>
      {todos.map((todo) => (
        <div key={todo.id}>{todo.title}</div>
      ))}
    </div>
  );
}

```
