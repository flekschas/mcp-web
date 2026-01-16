# MCP-Bridge

## Classes

### MCPWebBridge

Defined in: [packages/bridge/src/bridge.ts:88](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/bridge/src/bridge.ts#L88)

#### Constructors

##### Constructor

```ts
new MCPWebBridge(config: {
  agentUrl?: string;
  authToken?: string;
  autoConnect?: boolean;
  description: string;
  host?: string;
  icon?: string;
  maxInFlightQueriesPerToken?: number;
  maxSessionsPerToken?: number;
  mcpPort?: number;
  name: string;
  onSessionLimitExceeded?: "reject" | "close_oldest";
  persistAuthToken?: boolean;
  sessionMaxDurationMs?: number;
  wsPort?: number;
}): MCPWebBridge;
```

Defined in: [packages/bridge/src/bridge.ts:100](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/bridge/src/bridge.ts#L100)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | \{ `agentUrl?`: `string`; `authToken?`: `string`; `autoConnect?`: `boolean`; `description`: `string`; `host?`: `string`; `icon?`: `string`; `maxInFlightQueriesPerToken?`: `number`; `maxSessionsPerToken?`: `number`; `mcpPort?`: `number`; `name`: `string`; `onSessionLimitExceeded?`: `"reject"` \| `"close_oldest"`; `persistAuthToken?`: `boolean`; `sessionMaxDurationMs?`: `number`; `wsPort?`: `number`; \} |
| `config.agentUrl?` | `string` |
| `config.authToken?` | `string` |
| `config.autoConnect?` | `boolean` |
| `config.description` | `string` |
| `config.host?` | `string` |
| `config.icon?` | `string` |
| `config.maxInFlightQueriesPerToken?` | `number` |
| `config.maxSessionsPerToken?` | `number` |
| `config.mcpPort?` | `number` |
| `config.name` | `string` |
| `config.onSessionLimitExceeded?` | `"reject"` \| `"close_oldest"` |
| `config.persistAuthToken?` | `boolean` |
| `config.sessionMaxDurationMs?` | `number` |
| `config.wsPort?` | `number` |

###### Returns

[`MCPWebBridge`](#mcpwebbridge)

#### Methods

##### close()

```ts
close(): Promise<void>;
```

Defined in: [packages/bridge/src/bridge.ts:1191](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/bridge/src/bridge.ts#L1191)

Close the bridge servers and cleanup all connections

###### Returns

`Promise`\<`void`\>
