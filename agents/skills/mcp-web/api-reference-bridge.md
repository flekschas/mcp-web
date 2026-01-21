# MCP-Bridge

## Classes

### AlarmScheduler

Defined in: packages/bridge/src/adapters/partykit.ts:134

Scheduler implementation using PartyKit alarms.

PartyKit only supports one alarm at a time per room, so this scheduler
tracks multiple scheduled callbacks and uses the alarm for the soonest one.

#### See

https://docs.partykit.io/guides/scheduling-tasks-with-alarms/

#### Implements

- [`Scheduler`](#scheduler)

#### Constructors

##### Constructor

```ts
new AlarmScheduler(room: PartyRoom): AlarmScheduler;
```

Defined in: packages/bridge/src/adapters/partykit.ts:140

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `room` | `PartyRoom` |

###### Returns

[`AlarmScheduler`](#alarmscheduler)

#### Methods

##### cancel()

```ts
cancel(id: string): void;
```

Defined in: packages/bridge/src/adapters/partykit.ts:152

Cancel a scheduled one-time callback.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `id` | `string` | The ID returned by schedule() |

###### Returns

`void`

###### Implementation of

[`Scheduler`](#scheduler).[`cancel`](#cancel-6)

##### cancelInterval()

```ts
cancelInterval(id: string): void;
```

Defined in: packages/bridge/src/adapters/partykit.ts:165

Cancel a repeating callback.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `id` | `string` | The ID returned by scheduleInterval() |

###### Returns

`void`

###### Implementation of

[`Scheduler`](#scheduler).[`cancelInterval`](#cancelinterval-6)

##### dispose()

```ts
dispose(): void;
```

Defined in: packages/bridge/src/adapters/partykit.ts:170

Clean up all scheduled tasks.
Called when the bridge is shutting down.

###### Returns

`void`

###### Implementation of

[`Scheduler`](#scheduler).[`dispose`](#dispose-6)

##### handleAlarm()

```ts
handleAlarm(): Promise<void>;
```

Defined in: packages/bridge/src/adapters/partykit.ts:180

Called by the PartyKit server's onAlarm() handler.
Executes due callbacks and reschedules the next alarm.

###### Returns

`Promise`\<`void`\>

##### schedule()

```ts
schedule(callback: () => void, delayMs: number): string;
```

Defined in: packages/bridge/src/adapters/partykit.ts:144

Schedule a one-time callback after a delay.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `callback` | () => `void` | Function to execute |
| `delayMs` | `number` | Delay in milliseconds |

###### Returns

`string`

An ID that can be used to cancel the scheduled callback

###### Implementation of

[`Scheduler`](#scheduler).[`schedule`](#schedule-6)

##### scheduleInterval()

```ts
scheduleInterval(callback: () => void, intervalMs: number): string;
```

Defined in: packages/bridge/src/adapters/partykit.ts:157

Schedule a repeating callback.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `callback` | () => `void` | Function to execute repeatedly |
| `intervalMs` | `number` | Interval in milliseconds |

###### Returns

`string`

An ID that can be used to cancel the interval

###### Implementation of

[`Scheduler`](#scheduler).[`scheduleInterval`](#scheduleinterval-6)

***

### ~~MCPWebBridge~~

Defined in: packages/bridge/src/core.ts:221

#### Deprecated

Use MCPWebBridgeNode for new code. This export exists for backwards compatibility.

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
}, scheduler?: Scheduler): MCPWebBridge;
```

Defined in: packages/bridge/src/core.ts:235

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | \{ `agentUrl?`: `string`; `authToken?`: `string`; `autoConnect?`: `boolean`; `description`: `string`; `host?`: `string`; `icon?`: `string`; `maxInFlightQueriesPerToken?`: `number`; `maxSessionsPerToken?`: `number`; `mcpPort?`: `number`; `name`: `string`; `onSessionLimitExceeded?`: `"reject"` \| `"close_oldest"`; `persistAuthToken?`: `boolean`; `sessionMaxDurationMs?`: `number`; `wsPort?`: `number`; \} |
| `config.agentUrl?` | `string` |
| `config.authToken?` | `string` |
| `config.autoConnect?` | `boolean` |
| `config.description?` | `string` |
| `config.host?` | `string` |
| `config.icon?` | `string` |
| `config.maxInFlightQueriesPerToken?` | `number` |
| `config.maxSessionsPerToken?` | `number` |
| `config.mcpPort?` | `number` |
| `config.name?` | `string` |
| `config.onSessionLimitExceeded?` | `"reject"` \| `"close_oldest"` |
| `config.persistAuthToken?` | `boolean` |
| `config.sessionMaxDurationMs?` | `number` |
| `config.wsPort?` | `number` |
| `scheduler?` | [`Scheduler`](#scheduler) |

###### Returns

[`MCPWebBridge`](#mcpwebbridge)

#### Accessors

##### ~~config~~

###### Get Signature

```ts
get config(): {
  agentUrl?: string;
  authToken?: string;
  autoConnect: boolean;
  description: string;
  host: string;
  icon?: string;
  maxInFlightQueriesPerToken?: number;
  maxSessionsPerToken?: number;
  mcpPort: number;
  name: string;
  onSessionLimitExceeded: "reject" | "close_oldest";
  persistAuthToken: boolean;
  sessionMaxDurationMs?: number;
  wsPort: number;
};
```

Defined in: packages/bridge/src/core.ts:255

Get the configuration (read-only)

###### Returns

```ts
{
  agentUrl?: string;
  authToken?: string;
  autoConnect: boolean;
  description: string;
  host: string;
  icon?: string;
  maxInFlightQueriesPerToken?: number;
  maxSessionsPerToken?: number;
  mcpPort: number;
  name: string;
  onSessionLimitExceeded: "reject" | "close_oldest";
  persistAuthToken: boolean;
  sessionMaxDurationMs?: number;
  wsPort: number;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `agentUrl?` | `string` | packages/types/dist/config.d.ts:9 |
| `authToken?` | `string` | packages/types/dist/config.d.ts:10 |
| `autoConnect` | `boolean` | packages/types/dist/config.d.ts:12 |
| `description` | `string` | packages/types/dist/config.d.ts:4 |
| `host` | `string` | packages/types/dist/config.d.ts:5 |
| `icon?` | `string` | packages/types/dist/config.d.ts:8 |
| `maxInFlightQueriesPerToken?` | `number` | packages/types/dist/config.d.ts:18 |
| `maxSessionsPerToken?` | `number` | packages/types/dist/config.d.ts:13 |
| `mcpPort` | `number` | packages/types/dist/config.d.ts:7 |
| `name` | `string` | packages/types/dist/config.d.ts:3 |
| `onSessionLimitExceeded` | `"reject"` \| `"close_oldest"` | packages/types/dist/config.d.ts:14 |
| `persistAuthToken` | `boolean` | packages/types/dist/config.d.ts:11 |
| `sessionMaxDurationMs?` | `number` | packages/types/dist/config.d.ts:19 |
| `wsPort` | `number` | packages/types/dist/config.d.ts:6 |

#### Methods

##### ~~close()~~

```ts
close(): Promise<void>;
```

Defined in: packages/bridge/src/core.ts:276

Graceful shutdown - cleanup all sessions and scheduled tasks.

###### Returns

`Promise`\<`void`\>

##### ~~getHandlers()~~

```ts
getHandlers(): BridgeHandlers;
```

Defined in: packages/bridge/src/core.ts:262

Returns handlers for adapters to wire up to their runtime's I/O.

###### Returns

[`BridgeHandlers`](#bridgehandlers)

***

### MCPWebBridgeBun

Defined in: packages/bridge/src/adapters/bun.ts:171

Bun adapter for MCPWebBridge.
Provides a single-port server using Bun.serve() with native WebSocket support.

#### Example

```typescript
const bridge = new MCPWebBridgeBun({
  name: 'My App',
  description: 'My app',
  port: 3001,
});
```

#### Constructors

##### Constructor

```ts
new MCPWebBridgeBun(config: MCPWebBridgeBunConfig): MCPWebBridgeBun;
```

Defined in: packages/bridge/src/adapters/bun.ts:178

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`MCPWebBridgeBunConfig`](#mcpwebbridgebunconfig) |

###### Returns

[`MCPWebBridgeBun`](#mcpwebbridgebun)

#### Accessors

##### core

###### Get Signature

```ts
get core(): MCPWebBridge;
```

Defined in: packages/bridge/src/adapters/bun.ts:293

Get the underlying MCPWebBridge core instance.

###### Returns

[`MCPWebBridge`](#mcpwebbridge)

##### port

###### Get Signature

```ts
get port(): number;
```

Defined in: packages/bridge/src/adapters/bun.ts:307

Get the port the server is listening on.

###### Returns

`number`

#### Methods

##### close()

```ts
close(): Promise<void>;
```

Defined in: packages/bridge/src/adapters/bun.ts:314

Gracefully shut down the bridge.

###### Returns

`Promise`\<`void`\>

##### getHandlers()

```ts
getHandlers(): BridgeHandlers;
```

Defined in: packages/bridge/src/adapters/bun.ts:300

Get the bridge handlers for custom integrations.

###### Returns

[`BridgeHandlers`](#bridgehandlers)

***

### MCPWebBridgeDeno

Defined in: packages/bridge/src/adapters/deno.ts:141

Deno adapter for MCPWebBridge.
Provides a single-port server using Deno.serve() with WebSocket upgrade.

#### Example

```typescript
const bridge = new MCPWebBridgeDeno({
  name: 'My App',
  description: 'My app',
  port: 3001,
});
```

#### Constructors

##### Constructor

```ts
new MCPWebBridgeDeno(config: MCPWebBridgeDenoConfig): MCPWebBridgeDeno;
```

Defined in: packages/bridge/src/adapters/deno.ts:147

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`MCPWebBridgeDenoConfig`](#mcpwebbridgedenoconfig) |

###### Returns

[`MCPWebBridgeDeno`](#mcpwebbridgedeno)

#### Accessors

##### core

###### Get Signature

```ts
get core(): MCPWebBridge;
```

Defined in: packages/bridge/src/adapters/deno.ts:221

Get the underlying MCPWebBridge core instance.

###### Returns

[`MCPWebBridge`](#mcpwebbridge)

##### port

###### Get Signature

```ts
get port(): number;
```

Defined in: packages/bridge/src/adapters/deno.ts:235

Get the port the server is listening on.

###### Returns

`number`

#### Methods

##### close()

```ts
close(): Promise<void>;
```

Defined in: packages/bridge/src/adapters/deno.ts:242

Gracefully shut down the bridge.

###### Returns

`Promise`\<`void`\>

##### getHandlers()

```ts
getHandlers(): BridgeHandlers;
```

Defined in: packages/bridge/src/adapters/deno.ts:228

Get the bridge handlers for custom integrations.

###### Returns

[`BridgeHandlers`](#bridgehandlers)

***

### MCPWebBridgeNode

Defined in: packages/bridge/src/adapters/node.ts:104

Node.js adapter for MCPWebBridge.
Provides a single-port server for both WebSocket and HTTP traffic.

#### Constructors

##### Constructor

```ts
new MCPWebBridgeNode(config: MCPWebBridgeNodeConfig): MCPWebBridgeNode;
```

Defined in: packages/bridge/src/adapters/node.ts:111

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`MCPWebBridgeNodeConfig`](#mcpwebbridgenodeconfig) |

###### Returns

[`MCPWebBridgeNode`](#mcpwebbridgenode)

#### Accessors

##### core

###### Get Signature

```ts
get core(): MCPWebBridge;
```

Defined in: packages/bridge/src/adapters/node.ts:184

Get the underlying MCPWebBridge core instance.
Useful for advanced usage or custom integrations.

###### Returns

[`MCPWebBridge`](#mcpwebbridge)

##### port

###### Get Signature

```ts
get port(): number;
```

Defined in: packages/bridge/src/adapters/node.ts:198

Get the port the server is listening on.

###### Returns

`number`

#### Methods

##### close()

```ts
close(): Promise<void>;
```

Defined in: packages/bridge/src/adapters/node.ts:205

Gracefully shut down the bridge.

###### Returns

`Promise`\<`void`\>

##### getHandlers()

```ts
getHandlers(): BridgeHandlers;
```

Defined in: packages/bridge/src/adapters/node.ts:191

Get the bridge handlers for custom integrations.

###### Returns

[`BridgeHandlers`](#bridgehandlers)

***

### NoopScheduler

Defined in: packages/bridge/src/runtime/scheduler.ts:110

No-op scheduler for environments where timing isn't needed or supported.
Callbacks are simply not executed.

#### Implements

- [`Scheduler`](#scheduler)

#### Constructors

##### Constructor

```ts
new NoopScheduler(): NoopScheduler;
```

###### Returns

[`NoopScheduler`](#noopscheduler)

#### Methods

##### cancel()

```ts
cancel(_id: string): void;
```

Defined in: packages/bridge/src/runtime/scheduler.ts:115

Cancel a scheduled one-time callback.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `_id` | `string` |

###### Returns

`void`

###### Implementation of

[`Scheduler`](#scheduler).[`cancel`](#cancel-6)

##### cancelInterval()

```ts
cancelInterval(_id: string): void;
```

Defined in: packages/bridge/src/runtime/scheduler.ts:123

Cancel a repeating callback.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `_id` | `string` |

###### Returns

`void`

###### Implementation of

[`Scheduler`](#scheduler).[`cancelInterval`](#cancelinterval-6)

##### dispose()

```ts
dispose(): void;
```

Defined in: packages/bridge/src/runtime/scheduler.ts:127

Clean up all scheduled tasks.
Called when the bridge is shutting down.

###### Returns

`void`

###### Implementation of

[`Scheduler`](#scheduler).[`dispose`](#dispose-6)

##### schedule()

```ts
schedule(_callback: () => void, _delayMs: number): string;
```

Defined in: packages/bridge/src/runtime/scheduler.ts:111

Schedule a one-time callback after a delay.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `_callback` | () => `void` |
| `_delayMs` | `number` |

###### Returns

`string`

An ID that can be used to cancel the scheduled callback

###### Implementation of

[`Scheduler`](#scheduler).[`schedule`](#schedule-6)

##### scheduleInterval()

```ts
scheduleInterval(_callback: () => void, _intervalMs: number): string;
```

Defined in: packages/bridge/src/runtime/scheduler.ts:119

Schedule a repeating callback.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `_callback` | () => `void` |
| `_intervalMs` | `number` |

###### Returns

`string`

An ID that can be used to cancel the interval

###### Implementation of

[`Scheduler`](#scheduler).[`scheduleInterval`](#scheduleinterval-6)

***

### TimerScheduler

Defined in: packages/bridge/src/runtime/scheduler.ts:56

Timer-based scheduler using setTimeout/setInterval.
Works with Node.js, Deno, and Bun.

#### Implements

- [`Scheduler`](#scheduler)

#### Constructors

##### Constructor

```ts
new TimerScheduler(): TimerScheduler;
```

###### Returns

[`TimerScheduler`](#timerscheduler)

#### Methods

##### cancel()

```ts
cancel(id: string): void;
```

Defined in: packages/bridge/src/runtime/scheduler.ts:70

Cancel a scheduled one-time callback.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `id` | `string` | The ID returned by schedule() |

###### Returns

`void`

###### Implementation of

[`Scheduler`](#scheduler).[`cancel`](#cancel-6)

##### cancelInterval()

```ts
cancelInterval(id: string): void;
```

Defined in: packages/bridge/src/runtime/scheduler.ts:85

Cancel a repeating callback.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `id` | `string` | The ID returned by scheduleInterval() |

###### Returns

`void`

###### Implementation of

[`Scheduler`](#scheduler).[`cancelInterval`](#cancelinterval-6)

##### dispose()

```ts
dispose(): void;
```

Defined in: packages/bridge/src/runtime/scheduler.ts:93

Clean up all scheduled tasks.
Called when the bridge is shutting down.

###### Returns

`void`

###### Implementation of

[`Scheduler`](#scheduler).[`dispose`](#dispose-6)

##### schedule()

```ts
schedule(callback: () => void, delayMs: number): string;
```

Defined in: packages/bridge/src/runtime/scheduler.ts:60

Schedule a one-time callback after a delay.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `callback` | () => `void` | Function to execute |
| `delayMs` | `number` | Delay in milliseconds |

###### Returns

`string`

An ID that can be used to cancel the scheduled callback

###### Implementation of

[`Scheduler`](#scheduler).[`schedule`](#schedule-6)

##### scheduleInterval()

```ts
scheduleInterval(callback: () => void, intervalMs: number): string;
```

Defined in: packages/bridge/src/runtime/scheduler.ts:78

Schedule a repeating callback.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `callback` | () => `void` | Function to execute repeatedly |
| `intervalMs` | `number` | Interval in milliseconds |

###### Returns

`string`

An ID that can be used to cancel the interval

###### Implementation of

[`Scheduler`](#scheduler).[`scheduleInterval`](#scheduleinterval-6)

## Interfaces

### ActivityMessage

Defined in: [packages/bridge/src/types.ts:42](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L42)

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="timestamp"></a> `timestamp` | `number` | [packages/bridge/src/types.ts:44](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L44) |
| <a id="type"></a> `type` | `"activity"` | [packages/bridge/src/types.ts:43](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L43) |

***

### AuthenticatedMessage

Defined in: [packages/bridge/src/types.ts:25](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L25)

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="mcpport"></a> `mcpPort?` | `number` | [packages/bridge/src/types.ts:27](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L27) |
| <a id="sessionid"></a> `sessionId` | `string` | [packages/bridge/src/types.ts:28](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L28) |
| <a id="success"></a> `success` | `boolean` | [packages/bridge/src/types.ts:29](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L29) |
| <a id="type-1"></a> `type` | `"authenticated"` | [packages/bridge/src/types.ts:26](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L26) |

***

### AuthenticateMessage

Defined in: [packages/bridge/src/types.ts:15](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L15)

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="authtoken"></a> `authToken` | `string` | [packages/bridge/src/types.ts:18](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L18) |
| <a id="origin"></a> `origin` | `string` | [packages/bridge/src/types.ts:19](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L19) |
| <a id="pagetitle"></a> `pageTitle?` | `string` | [packages/bridge/src/types.ts:20](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L20) |
| <a id="sessionid-1"></a> `sessionId` | `string` | [packages/bridge/src/types.ts:17](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L17) |
| <a id="timestamp-1"></a> `timestamp` | `number` | [packages/bridge/src/types.ts:22](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L22) |
| <a id="type-2"></a> `type` | `"authenticate"` | [packages/bridge/src/types.ts:16](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L16) |
| <a id="useragent"></a> `userAgent?` | `string` | [packages/bridge/src/types.ts:21](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L21) |

***

### BridgeAdapterConfig

Defined in: packages/bridge/src/runtime/types.ts:103

Configuration for bridge adapters.
Extends the base MCPWebConfig with adapter-specific options.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="host"></a> `host?` | `string` | Host to bind to | packages/bridge/src/runtime/types.ts:108 |
| <a id="port-3"></a> `port?` | `number` | Port to listen on (single port for both HTTP and WebSocket) | packages/bridge/src/runtime/types.ts:105 |

***

### BridgeHandlers

Defined in: packages/bridge/src/runtime/types.ts:67

Handlers that the bridge core provides to adapters.
Adapters wire these up to their runtime's native APIs.

#### Methods

##### onHttpRequest()

```ts
onHttpRequest(req: HttpRequest): Promise<HttpResponse>;
```

Defined in: packages/bridge/src/runtime/types.ts:96

Called for HTTP requests (MCP JSON-RPC, query endpoints, etc.)

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `req` | [`HttpRequest`](#httprequest) | The wrapped HTTP request |

###### Returns

`Promise`\<[`HttpResponse`](#httpresponse)\>

The response to send

##### onWebSocketClose()

```ts
onWebSocketClose(sessionId: string): void;
```

Defined in: packages/bridge/src/runtime/types.ts:89

Called when a WebSocket connection closes.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `sessionId` | `string` | The session ID |

###### Returns

`void`

##### onWebSocketConnect()

```ts
onWebSocketConnect(
   sessionId: string, 
   ws: WebSocketConnection, 
   url: URL): boolean;
```

Defined in: packages/bridge/src/runtime/types.ts:75

Called when a WebSocket connection is established.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `sessionId` | `string` | The session ID from the URL query parameter |
| `ws` | [`WebSocketConnection`](#websocketconnection) | The wrapped WebSocket connection |
| `url` | `URL` | The parsed connection URL |

###### Returns

`boolean`

true if the connection should be accepted

##### onWebSocketMessage()

```ts
onWebSocketMessage(
   sessionId: string, 
   ws: WebSocketConnection, 
   data: string): void;
```

Defined in: packages/bridge/src/runtime/types.ts:83

Called when a WebSocket message is received.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `sessionId` | `string` | The session ID |
| `ws` | [`WebSocketConnection`](#websocketconnection) | The wrapped WebSocket connection |
| `data` | `string` | The message data as a string |

###### Returns

`void`

***

### HttpRequest

Defined in: packages/bridge/src/runtime/types.ts:32

Runtime-agnostic HTTP request.
Abstracts differences between Node.js IncomingMessage, Deno Request, etc.

#### Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="headers"></a> `headers` | `readonly` | \{ `get`: `string` \| `null`; \} | Request headers | packages/bridge/src/runtime/types.ts:40 |
| `headers.get` | `public` | `string` \| `null` | - | packages/bridge/src/runtime/types.ts:41 |
| <a id="method"></a> `method` | `readonly` | `string` | HTTP method (GET, POST, PUT, etc.) | packages/bridge/src/runtime/types.ts:34 |
| <a id="url"></a> `url` | `readonly` | `string` | Full URL string | packages/bridge/src/runtime/types.ts:37 |

#### Methods

##### text()

```ts
text(): Promise<string>;
```

Defined in: packages/bridge/src/runtime/types.ts:45

Get the request body as text

###### Returns

`Promise`\<`string`\>

***

### HttpResponse

Defined in: packages/bridge/src/runtime/types.ts:52

Runtime-agnostic HTTP response.
Used to construct responses that adapters convert to native format.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="body"></a> `body` | `string` | Response body | packages/bridge/src/runtime/types.ts:60 |
| <a id="headers-1"></a> `headers` | `Record`\<`string`, `string`\> | Response headers | packages/bridge/src/runtime/types.ts:57 |
| <a id="status"></a> `status` | `number` | HTTP status code | packages/bridge/src/runtime/types.ts:54 |

***

### MCPWebBridgeBunConfig

Defined in: packages/bridge/src/adapters/bun.ts:60

Configuration for the Bun bridge adapter.

#### Extends

- `MCPWebConfig`

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="agenturl"></a> `agentUrl?` | `string` | - | `MCPWebConfig.agentUrl` | packages/types/dist/config.d.ts:9 |
| <a id="authtoken-1"></a> `authToken?` | `string` | - | `MCPWebConfig.authToken` | packages/types/dist/config.d.ts:10 |
| <a id="autoconnect"></a> `autoConnect?` | `boolean` | - | `MCPWebConfig.autoConnect` | packages/types/dist/config.d.ts:12 |
| <a id="description"></a> `description` | `string` | - | `MCPWebConfig.description` | packages/types/dist/config.d.ts:4 |
| <a id="host-1"></a> `host?` | `string` | - | `MCPWebConfig.host` | packages/types/dist/config.d.ts:5 |
| <a id="hostname"></a> `hostname?` | `string` | Hostname to bind to (default: '0.0.0.0') | - | packages/bridge/src/adapters/bun.ts:65 |
| <a id="icon"></a> `icon?` | `string` | - | `MCPWebConfig.icon` | packages/types/dist/config.d.ts:8 |
| <a id="maxinflightqueriespertoken"></a> `maxInFlightQueriesPerToken?` | `number` | - | `MCPWebConfig.maxInFlightQueriesPerToken` | packages/types/dist/config.d.ts:18 |
| <a id="maxsessionspertoken"></a> `maxSessionsPerToken?` | `number` | - | `MCPWebConfig.maxSessionsPerToken` | packages/types/dist/config.d.ts:13 |
| <a id="mcpport-1"></a> `mcpPort?` | `number` | - | `MCPWebConfig.mcpPort` | packages/types/dist/config.d.ts:7 |
| <a id="name"></a> `name` | `string` | - | `MCPWebConfig.name` | packages/types/dist/config.d.ts:3 |
| <a id="onsessionlimitexceeded"></a> `onSessionLimitExceeded?` | `"reject"` \| `"close_oldest"` | - | `MCPWebConfig.onSessionLimitExceeded` | packages/types/dist/config.d.ts:14 |
| <a id="persistauthtoken"></a> `persistAuthToken?` | `boolean` | - | `MCPWebConfig.persistAuthToken` | packages/types/dist/config.d.ts:11 |
| <a id="port-4"></a> `port?` | `number` | Port to listen on (default: 3001) | - | packages/bridge/src/adapters/bun.ts:62 |
| <a id="sessionmaxdurationms"></a> `sessionMaxDurationMs?` | `number` | - | `MCPWebConfig.sessionMaxDurationMs` | packages/types/dist/config.d.ts:19 |
| <a id="wsport"></a> `wsPort?` | `number` | - | `MCPWebConfig.wsPort` | packages/types/dist/config.d.ts:6 |

***

### MCPWebBridgeDenoConfig

Defined in: packages/bridge/src/adapters/deno.ts:54

Configuration for the Deno bridge adapter.

#### Extends

- `MCPWebConfig`

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="agenturl-1"></a> `agentUrl?` | `string` | - | `MCPWebConfig.agentUrl` | packages/types/dist/config.d.ts:9 |
| <a id="authtoken-2"></a> `authToken?` | `string` | - | `MCPWebConfig.authToken` | packages/types/dist/config.d.ts:10 |
| <a id="autoconnect-1"></a> `autoConnect?` | `boolean` | - | `MCPWebConfig.autoConnect` | packages/types/dist/config.d.ts:12 |
| <a id="description-1"></a> `description` | `string` | - | `MCPWebConfig.description` | packages/types/dist/config.d.ts:4 |
| <a id="host-2"></a> `host?` | `string` | - | `MCPWebConfig.host` | packages/types/dist/config.d.ts:5 |
| <a id="hostname-1"></a> `hostname?` | `string` | Hostname to bind to (default: '0.0.0.0') | - | packages/bridge/src/adapters/deno.ts:59 |
| <a id="icon-1"></a> `icon?` | `string` | - | `MCPWebConfig.icon` | packages/types/dist/config.d.ts:8 |
| <a id="maxinflightqueriespertoken-1"></a> `maxInFlightQueriesPerToken?` | `number` | - | `MCPWebConfig.maxInFlightQueriesPerToken` | packages/types/dist/config.d.ts:18 |
| <a id="maxsessionspertoken-1"></a> `maxSessionsPerToken?` | `number` | - | `MCPWebConfig.maxSessionsPerToken` | packages/types/dist/config.d.ts:13 |
| <a id="mcpport-2"></a> `mcpPort?` | `number` | - | `MCPWebConfig.mcpPort` | packages/types/dist/config.d.ts:7 |
| <a id="name-1"></a> `name` | `string` | - | `MCPWebConfig.name` | packages/types/dist/config.d.ts:3 |
| <a id="onsessionlimitexceeded-1"></a> `onSessionLimitExceeded?` | `"reject"` \| `"close_oldest"` | - | `MCPWebConfig.onSessionLimitExceeded` | packages/types/dist/config.d.ts:14 |
| <a id="persistauthtoken-1"></a> `persistAuthToken?` | `boolean` | - | `MCPWebConfig.persistAuthToken` | packages/types/dist/config.d.ts:11 |
| <a id="port-5"></a> `port?` | `number` | Port to listen on (default: 3001, or PORT env var on Deno Deploy) | - | packages/bridge/src/adapters/deno.ts:56 |
| <a id="sessionmaxdurationms-1"></a> `sessionMaxDurationMs?` | `number` | - | `MCPWebConfig.sessionMaxDurationMs` | packages/types/dist/config.d.ts:19 |
| <a id="wsport-1"></a> `wsPort?` | `number` | - | `MCPWebConfig.wsPort` | packages/types/dist/config.d.ts:6 |

***

### MCPWebBridgeNodeConfig

Defined in: packages/bridge/src/adapters/node.ts:32

Configuration for the Node.js bridge adapter.

#### Extends

- `MCPWebConfig`

#### Properties

| Property | Type | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="agenturl-2"></a> `agentUrl?` | `string` | - | - | `MCPWebConfig.agentUrl` | packages/types/dist/config.d.ts:9 |
| <a id="authtoken-3"></a> `authToken?` | `string` | - | - | `MCPWebConfig.authToken` | packages/types/dist/config.d.ts:10 |
| <a id="autoconnect-2"></a> `autoConnect?` | `boolean` | - | - | `MCPWebConfig.autoConnect` | packages/types/dist/config.d.ts:12 |
| <a id="description-2"></a> `description` | `string` | - | - | `MCPWebConfig.description` | packages/types/dist/config.d.ts:4 |
| <a id="host-3"></a> `host?` | `string` | Host to bind to (default: '0.0.0.0') | `MCPWebConfig.host` | - | packages/bridge/src/adapters/node.ts:37 |
| <a id="icon-2"></a> `icon?` | `string` | - | - | `MCPWebConfig.icon` | packages/types/dist/config.d.ts:8 |
| <a id="maxinflightqueriespertoken-2"></a> `maxInFlightQueriesPerToken?` | `number` | - | - | `MCPWebConfig.maxInFlightQueriesPerToken` | packages/types/dist/config.d.ts:18 |
| <a id="maxsessionspertoken-2"></a> `maxSessionsPerToken?` | `number` | - | - | `MCPWebConfig.maxSessionsPerToken` | packages/types/dist/config.d.ts:13 |
| <a id="mcpport-3"></a> `mcpPort?` | `number` | - | - | `MCPWebConfig.mcpPort` | packages/types/dist/config.d.ts:7 |
| <a id="name-2"></a> `name` | `string` | - | - | `MCPWebConfig.name` | packages/types/dist/config.d.ts:3 |
| <a id="onsessionlimitexceeded-2"></a> `onSessionLimitExceeded?` | `"reject"` \| `"close_oldest"` | - | - | `MCPWebConfig.onSessionLimitExceeded` | packages/types/dist/config.d.ts:14 |
| <a id="persistauthtoken-2"></a> `persistAuthToken?` | `boolean` | - | - | `MCPWebConfig.persistAuthToken` | packages/types/dist/config.d.ts:11 |
| <a id="port-6"></a> `port?` | `number` | Port to listen on (default: 3001) | - | - | packages/bridge/src/adapters/node.ts:34 |
| <a id="sessionmaxdurationms-2"></a> `sessionMaxDurationMs?` | `number` | - | - | `MCPWebConfig.sessionMaxDurationMs` | packages/types/dist/config.d.ts:19 |
| <a id="wsport-2"></a> `wsPort?` | `number` | - | - | `MCPWebConfig.wsPort` | packages/types/dist/config.d.ts:6 |

***

### MCPWebBridgePartyConfig

Defined in: packages/bridge/src/adapters/partykit.ts:112

Configuration for the PartyKit bridge adapter.
Note: Port is not configurable - PartyKit manages this.

#### Extends

- `Omit`\<`MCPWebConfig`, `"wsPort"` \| `"mcpPort"` \| `"host"`\>

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="agenturl-3"></a> `agentUrl?` | `string` | - | `Omit.agentUrl` | packages/types/dist/config.d.ts:9 |
| <a id="authtoken-4"></a> `authToken?` | `string` | - | `Omit.authToken` | packages/types/dist/config.d.ts:10 |
| <a id="autoconnect-3"></a> `autoConnect?` | `boolean` | - | `Omit.autoConnect` | packages/types/dist/config.d.ts:12 |
| <a id="description-3"></a> `description` | `string` | - | `Omit.description` | packages/types/dist/config.d.ts:4 |
| <a id="icon-3"></a> `icon?` | `string` | - | `Omit.icon` | packages/types/dist/config.d.ts:8 |
| <a id="maxinflightqueriespertoken-3"></a> `maxInFlightQueriesPerToken?` | `number` | - | `Omit.maxInFlightQueriesPerToken` | packages/types/dist/config.d.ts:18 |
| <a id="maxsessionspertoken-3"></a> `maxSessionsPerToken?` | `number` | - | `Omit.maxSessionsPerToken` | packages/types/dist/config.d.ts:13 |
| <a id="name-3"></a> `name` | `string` | - | `Omit.name` | packages/types/dist/config.d.ts:3 |
| <a id="onsessionlimitexceeded-3"></a> `onSessionLimitExceeded?` | `"reject"` \| `"close_oldest"` | - | `Omit.onSessionLimitExceeded` | packages/types/dist/config.d.ts:14 |
| <a id="persistauthtoken-3"></a> `persistAuthToken?` | `boolean` | - | `Omit.persistAuthToken` | packages/types/dist/config.d.ts:11 |
| <a id="sessioncheckintervalms"></a> `sessionCheckIntervalMs?` | `number` | Session timeout check interval in milliseconds. PartyKit uses alarms instead of setInterval, so this determines how often the alarm fires to check for expired sessions. Default: 60000 (1 minute) | - | packages/bridge/src/adapters/partykit.ts:119 |
| <a id="sessionmaxdurationms-3"></a> `sessionMaxDurationMs?` | `number` | - | `Omit.sessionMaxDurationMs` | packages/types/dist/config.d.ts:19 |

***

### QueryTracking

Defined in: [packages/bridge/src/types.ts:88](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L88)

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="responsetool"></a> `responseTool?` | `string` | [packages/bridge/src/types.ts:90](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L90) |
| <a id="restricttools"></a> `restrictTools?` | `boolean` | [packages/bridge/src/types.ts:95](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L95) |
| <a id="sessionid-2"></a> `sessionId` | `string` | [packages/bridge/src/types.ts:89](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L89) |
| <a id="state"></a> `state` | `QueryState` | [packages/bridge/src/types.ts:93](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L93) |
| <a id="toolcalls"></a> `toolCalls` | [`TrackedToolCall`](#trackedtoolcall)[] | [packages/bridge/src/types.ts:91](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L91) |
| <a id="tools"></a> `tools?` | ( \| \{ `description`: `string`; `inputSchema?`: `ZodObject`\<`$ZodLooseShape`, `$strip`\>; `name`: `string`; `outputSchema?`: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \} \| \{ `description`: `string`; `inputSchema?`: `JSONSchema`; `name`: `string`; `outputSchema?`: `JSONSchema`; \})[] | [packages/bridge/src/types.ts:94](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L94) |
| <a id="ws"></a> `ws` | `WebSocket` | [packages/bridge/src/types.ts:92](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L92) |

***

### RegisterToolMessage

Defined in: [packages/bridge/src/types.ts:32](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L32)

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="tool"></a> `tool` | \{ `description`: `string`; `inputSchema?`: `JSONSchema`; `name`: `string`; `outputSchema?`: `JSONSchema`; \} | [packages/bridge/src/types.ts:34](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L34) |
| `tool.description` | `string` | [packages/bridge/src/types.ts:36](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L36) |
| `tool.inputSchema?` | `JSONSchema` | [packages/bridge/src/types.ts:37](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L37) |
| `tool.name` | `string` | [packages/bridge/src/types.ts:35](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L35) |
| `tool.outputSchema?` | `JSONSchema` | [packages/bridge/src/types.ts:38](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L38) |
| <a id="type-3"></a> `type` | `"register-tool"` | [packages/bridge/src/types.ts:33](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L33) |

***

### Scheduler

Defined in: packages/bridge/src/runtime/scheduler.ts:16

Abstract scheduler interface.
Implementations handle the runtime-specific timing mechanism.

#### Methods

##### cancel()

```ts
cancel(id: string): void;
```

Defined in: packages/bridge/src/runtime/scheduler.ts:29

Cancel a scheduled one-time callback.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `id` | `string` | The ID returned by schedule() |

###### Returns

`void`

##### cancelInterval()

```ts
cancelInterval(id: string): void;
```

Defined in: packages/bridge/src/runtime/scheduler.ts:43

Cancel a repeating callback.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `id` | `string` | The ID returned by scheduleInterval() |

###### Returns

`void`

##### dispose()

```ts
dispose(): void;
```

Defined in: packages/bridge/src/runtime/scheduler.ts:49

Clean up all scheduled tasks.
Called when the bridge is shutting down.

###### Returns

`void`

##### schedule()

```ts
schedule(callback: () => void, delayMs: number): string;
```

Defined in: packages/bridge/src/runtime/scheduler.ts:23

Schedule a one-time callback after a delay.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `callback` | () => `void` | Function to execute |
| `delayMs` | `number` | Delay in milliseconds |

###### Returns

`string`

An ID that can be used to cancel the scheduled callback

##### scheduleInterval()

```ts
scheduleInterval(callback: () => void, intervalMs: number): string;
```

Defined in: packages/bridge/src/runtime/scheduler.ts:37

Schedule a repeating callback.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `callback` | () => `void` | Function to execute repeatedly |
| `intervalMs` | `number` | Interval in milliseconds |

###### Returns

`string`

An ID that can be used to cancel the interval

***

### ToolCallMessage

Defined in: [packages/bridge/src/types.ts:47](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L47)

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="queryid"></a> `queryId?` | `string` | [packages/bridge/src/types.ts:52](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L52) |
| <a id="requestid"></a> `requestId` | `string` | [packages/bridge/src/types.ts:49](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L49) |
| <a id="toolinput"></a> `toolInput?` | `Record`\<`string`, `unknown`\> | [packages/bridge/src/types.ts:51](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L51) |
| <a id="toolname"></a> `toolName` | `string` | [packages/bridge/src/types.ts:50](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L50) |
| <a id="type-4"></a> `type` | `"tool-call"` | [packages/bridge/src/types.ts:48](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L48) |

***

### ToolResponseMessage

Defined in: [packages/bridge/src/types.ts:55](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L55)

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="requestid-1"></a> `requestId` | `string` | [packages/bridge/src/types.ts:57](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L57) |
| <a id="result"></a> `result` | `unknown` | [packages/bridge/src/types.ts:58](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L58) |
| <a id="type-5"></a> `type` | `"tool-response"` | [packages/bridge/src/types.ts:56](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L56) |

***

### TrackedToolCall

Defined in: [packages/bridge/src/types.ts:80](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L80)

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="arguments"></a> `arguments` | `unknown` | [packages/bridge/src/types.ts:82](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L82) |
| <a id="result-1"></a> `result` | `unknown` | [packages/bridge/src/types.ts:83](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L83) |
| <a id="tool-1"></a> `tool` | `string` | [packages/bridge/src/types.ts:81](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L81) |

***

### WebSocketConnection

Defined in: packages/bridge/src/runtime/types.ts:11

Runtime-agnostic WebSocket connection.
Wraps the native WebSocket implementation of each runtime.

#### Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="readystate"></a> `readyState` | `readonly` | `"CONNECTING"` \| `"OPEN"` \| `"CLOSING"` \| `"CLOSED"` | Current connection state | packages/bridge/src/runtime/types.ts:19 |

#### Methods

##### close()

```ts
close(code?: number, reason?: string): void;
```

Defined in: packages/bridge/src/runtime/types.ts:16

Close the connection

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `code?` | `number` |
| `reason?` | `string` |

###### Returns

`void`

##### offMessage()

```ts
offMessage(handler: (data: string) => void): void;
```

Defined in: packages/bridge/src/runtime/types.ts:25

Remove a message handler

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `handler` | (`data`: `string`) => `void` |

###### Returns

`void`

##### onMessage()

```ts
onMessage(handler: (data: string) => void): void;
```

Defined in: packages/bridge/src/runtime/types.ts:22

Add a message handler

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `handler` | (`data`: `string`) => `void` |

###### Returns

`void`

##### send()

```ts
send(data: string): void;
```

Defined in: packages/bridge/src/runtime/types.ts:13

Send a string message to the client

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | `string` |

###### Returns

`void`

## Type Aliases

### BridgeMessage

```ts
type BridgeMessage = 
  | AuthenticatedMessage
  | ToolCallMessage
  | QueryAcceptedMessage
  | QueryProgressMessage
  | QueryCompleteBridgeMessage
  | QueryFailureMessage
  | QueryCancelMessage;
```

Defined in: [packages/bridge/src/types.ts:71](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L71)

***

### FrontendMessage

```ts
type FrontendMessage = 
  | AuthenticateMessage
  | RegisterToolMessage
  | ActivityMessage
  | ToolResponseMessage
  | QueryMessage
  | QueryCompleteClientMessage
  | QueryProgressMessage
  | QueryCancelMessage;
```

Defined in: [packages/bridge/src/types.ts:61](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/bridge/src/types.ts#L61)

***

### QueryAcceptedMessage

```ts
type QueryAcceptedMessage = z.output<typeof QueryAcceptedMessageSchema>;
```

Defined in: packages/types/dist/query.d.ts:121

@mcp-web/bridge - MCP Web Bridge for connecting web frontends to AI agents.

This package provides a runtime-agnostic bridge that mediates between
web frontends and AI agents via the Model Context Protocol (MCP).

#### Examples

```typescript
import { MCPWebBridgeNode } from '@mcp-web/bridge';

const bridge = new MCPWebBridgeNode({
  name: 'My App',
  description: 'My awesome app',
  port: 3001,
});
```

```typescript
import { MCPWebBridge } from '@mcp-web/bridge';

const core = new MCPWebBridge(config);
const handlers = core.getHandlers();
// Wire handlers to your runtime's WebSocket/HTTP servers
```

***

### QueryCompleteBridgeMessage

```ts
type QueryCompleteBridgeMessage = z.output<typeof QueryCompleteBridgeMessageSchema>;
```

Defined in: packages/types/dist/query.d.ts:124

@mcp-web/bridge - MCP Web Bridge for connecting web frontends to AI agents.

This package provides a runtime-agnostic bridge that mediates between
web frontends and AI agents via the Model Context Protocol (MCP).

#### Examples

```typescript
import { MCPWebBridgeNode } from '@mcp-web/bridge';

const bridge = new MCPWebBridgeNode({
  name: 'My App',
  description: 'My awesome app',
  port: 3001,
});
```

```typescript
import { MCPWebBridge } from '@mcp-web/bridge';

const core = new MCPWebBridge(config);
const handlers = core.getHandlers();
// Wire handlers to your runtime's WebSocket/HTTP servers
```

***

### QueryCompleteClientMessage

```ts
type QueryCompleteClientMessage = z.output<typeof QueryCompleteClientMessageSchema>;
```

Defined in: packages/types/dist/query.d.ts:123

@mcp-web/bridge - MCP Web Bridge for connecting web frontends to AI agents.

This package provides a runtime-agnostic bridge that mediates between
web frontends and AI agents via the Model Context Protocol (MCP).

#### Examples

```typescript
import { MCPWebBridgeNode } from '@mcp-web/bridge';

const bridge = new MCPWebBridgeNode({
  name: 'My App',
  description: 'My awesome app',
  port: 3001,
});
```

```typescript
import { MCPWebBridge } from '@mcp-web/bridge';

const core = new MCPWebBridge(config);
const handlers = core.getHandlers();
// Wire handlers to your runtime's WebSocket/HTTP servers
```

***

### QueryFailureMessage

```ts
type QueryFailureMessage = z.output<typeof QueryFailureMessageSchema>;
```

Defined in: packages/types/dist/query.d.ts:125

@mcp-web/bridge - MCP Web Bridge for connecting web frontends to AI agents.

This package provides a runtime-agnostic bridge that mediates between
web frontends and AI agents via the Model Context Protocol (MCP).

#### Examples

```typescript
import { MCPWebBridgeNode } from '@mcp-web/bridge';

const bridge = new MCPWebBridgeNode({
  name: 'My App',
  description: 'My awesome app',
  port: 3001,
});
```

```typescript
import { MCPWebBridge } from '@mcp-web/bridge';

const core = new MCPWebBridge(config);
const handlers = core.getHandlers();
// Wire handlers to your runtime's WebSocket/HTTP servers
```

***

### QueryMessage

```ts
type QueryMessage = z.output<typeof QueryMessageSchema>;
```

Defined in: packages/types/dist/query.d.ts:120

@mcp-web/bridge - MCP Web Bridge for connecting web frontends to AI agents.

This package provides a runtime-agnostic bridge that mediates between
web frontends and AI agents via the Model Context Protocol (MCP).

#### Examples

```typescript
import { MCPWebBridgeNode } from '@mcp-web/bridge';

const bridge = new MCPWebBridgeNode({
  name: 'My App',
  description: 'My awesome app',
  port: 3001,
});
```

```typescript
import { MCPWebBridge } from '@mcp-web/bridge';

const core = new MCPWebBridge(config);
const handlers = core.getHandlers();
// Wire handlers to your runtime's WebSocket/HTTP servers
```

***

### QueryProgressMessage

```ts
type QueryProgressMessage = z.output<typeof QueryProgressMessageSchema>;
```

Defined in: packages/types/dist/query.d.ts:122

@mcp-web/bridge - MCP Web Bridge for connecting web frontends to AI agents.

This package provides a runtime-agnostic bridge that mediates between
web frontends and AI agents via the Model Context Protocol (MCP).

#### Examples

```typescript
import { MCPWebBridgeNode } from '@mcp-web/bridge';

const bridge = new MCPWebBridgeNode({
  name: 'My App',
  description: 'My awesome app',
  port: 3001,
});
```

```typescript
import { MCPWebBridge } from '@mcp-web/bridge';

const core = new MCPWebBridge(config);
const handlers = core.getHandlers();
// Wire handlers to your runtime's WebSocket/HTTP servers
```

## Variables

### ~~Bridge~~

```ts
const Bridge: typeof MCPWebBridgeNode = MCPWebBridgeNode;
```

Defined in: packages/bridge/src/adapters/node.ts:236

For backwards compatibility, also export as Bridge

#### Deprecated

Use MCPWebBridgeNode instead

***

### InternalErrorCode

```ts
const InternalErrorCode: "InternalError" = "InternalError";
```

Defined in: packages/types/dist/errors.d.ts:10

***

### InvalidAuthenticationErrorCode

```ts
const InvalidAuthenticationErrorCode: "InvalidAuthentication" = "InvalidAuthentication";
```

Defined in: packages/types/dist/errors.d.ts:2

***

### MCPWebBridgeParty()

```ts
const MCPWebBridgeParty: (room: PartyRoom) => PartyServer;
```

Defined in: packages/bridge/src/adapters/partykit.ts:451

Pre-configured bridge class for direct export.
Use `createPartyKitBridge()` if you need custom configuration.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `room` | `PartyRoom` |

#### Returns

`PartyServer`

#### Example

```typescript
// For simple cases where you configure via environment
export { MCPWebBridgeParty } from '@mcp-web/bridge';
```

***

### MissingAuthenticationErrorCode

```ts
const MissingAuthenticationErrorCode: "MissingAuthentication" = "MissingAuthentication";
```

Defined in: packages/types/dist/errors.d.ts:1

***

### QueryNotActiveErrorCode

```ts
const QueryNotActiveErrorCode: "QueryNotActive" = "QueryNotActive";
```

Defined in: packages/types/dist/errors.d.ts:7

***

### QueryNotFoundErrorCode

```ts
const QueryNotFoundErrorCode: "QueryNotFound" = "QueryNotFound";
```

Defined in: packages/types/dist/errors.d.ts:6

***

### UnknownMethodErrorCode

```ts
const UnknownMethodErrorCode: "UnknownMethod" = "UnknownMethod";
```

Defined in: packages/types/dist/errors.d.ts:9

***

### WebSocketReadyState

```ts
const WebSocketReadyState: {
  CLOSED: 3;
  CLOSING: 2;
  CONNECTING: 0;
  OPEN: 1;
};
```

Defined in: packages/bridge/src/runtime/types.ts:144

WebSocket ready state constants (matching the WebSocket API)

#### Type Declaration

| Name | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="closed"></a> `CLOSED` | `3` | `3` | packages/bridge/src/runtime/types.ts:148 |
| <a id="closing"></a> `CLOSING` | `2` | `2` | packages/bridge/src/runtime/types.ts:147 |
| <a id="connecting"></a> `CONNECTING` | `0` | `0` | packages/bridge/src/runtime/types.ts:145 |
| <a id="open"></a> `OPEN` | `1` | `1` | packages/bridge/src/runtime/types.ts:146 |

## Functions

### createHttpResponse()

```ts
function createHttpResponse(
   status: number, 
   body: unknown, 
   headers: Record<string, string>): HttpResponse;
```

Defined in: packages/bridge/src/runtime/types.ts:114

Helper to create an HttpResponse

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `status` | `number` |
| `body` | `unknown` |
| `headers` | `Record`\<`string`, `string`\> |

#### Returns

[`HttpResponse`](#httpresponse)

***

### createPartyKitBridge()

```ts
function createPartyKitBridge(config: MCPWebBridgePartyConfig): (room: PartyRoom) => PartyServer;
```

Defined in: packages/bridge/src/adapters/partykit.ts:331

Creates a PartyKit-compatible bridge server class.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`MCPWebBridgePartyConfig`](#mcpwebbridgepartyconfig) |

#### Returns

```ts
new createPartyKitBridge(room: PartyRoom): PartyServer;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `room` | `PartyRoom` |

##### Returns

`PartyServer`

#### Example

```typescript
// server.ts
import { createPartyKitBridge } from '@mcp-web/bridge';

export default createPartyKitBridge({
  name: 'My Bridge',
  description: 'MCP Web bridge on the edge',
});
```

***

### jsonResponse()

```ts
function jsonResponse(status: number, data: unknown): HttpResponse;
```

Defined in: packages/bridge/src/runtime/types.ts:133

Helper to create a JSON response

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `status` | `number` |
| `data` | `unknown` |

#### Returns

[`HttpResponse`](#httpresponse)

***

### readyStateToString()

```ts
function readyStateToString(state: number): "CONNECTING" | "OPEN" | "CLOSING" | "CLOSED";
```

Defined in: packages/bridge/src/runtime/types.ts:154

Convert numeric ready state to string

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | `number` |

#### Returns

`"CONNECTING"` \| `"OPEN"` \| `"CLOSING"` \| `"CLOSED"`

## References

### ~~MCPWebBridgeCore~~

Renames and re-exports [MCPWebBridge](#mcpwebbridge)
