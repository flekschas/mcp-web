## Next

`@mcp-web/core`:

- feat: `idleTimeoutMs` option to disconnect after a period without requests from AI or user interaction, and reconnect on the next interaction. Hosted bridges like the Cloudflare adapter keep running, and billing, while a page is connected. `idle` and `idleDisconnectAt` expose the state, for example to show a countdown
- fix: report user activity to the bridge every 30 seconds instead of on every mouse move
- fix: check tool results against JSON Schema output schemas too, the way the MCP TypeScript SDK client does (draft-07, with string formats such as `date-time`), and send the parsed result of a Zod output schema, which drops unknown keys and fills in defaults. A result that doesn't match its output schema now fails the call, because MCP clients reject it. An error result (`{ error }`) is sent as is. App props are checked the same way against `propsSchema`, so a prop declared `.optional()` no longer accepts `null`. A JSON Schema output schema is compiled when the tool is added; on a page whose Content Security Policy blocks that, results go unchecked
- fix: send Zod output schemas as JSON Schema draft-07, so MCP clients accept tuples in results
- fix: `validateInput()` checks string formats of a JSON Schema too, and tools can share a schema with the same `$id`
- fix: accept a tool or app with a Zod schema for one of its input and output schemas and a JSON Schema for the other
- feat: register tools with [WebMCP](https://webmachinelearning.github.io/webmcp/) (`document.modelContext`) when the browser supports it, so browser agents can call them without the bridge. This is on by default, so any agent in the browser can call your tools without the bridge's auth token. Set `disableWebMCP: true` to keep tools bridge-only. `onlyWebMCP` never connects to the bridge. App tools and tools whose `_meta.ui.visibility` leaves out `'model'` are not registered
- feat: `annotations` on tools for MCP's tool hints, such as `readOnlyHint`. Getters from `addStateTools()` are marked read-only, and generated `delete_*` tools destructive
- fix: `persistAuthToken: false` no longer reads `localStorage`, and blocked storage no longer makes the constructor throw

`@mcp-web/bridge` and `@mcp-web/client`:

- feat: forward tool `annotations` to MCP clients. When pages with the same tool disagree on its hints, the list of all sessions' tools leaves them out
- fix: keep a tool result's `_meta` out of the text of an error result, and only turn base64 image data URLs into image content
- fix: when no page is connected, tell AI to ask the user to switch back to the page, not only to open it
- feat: list a tool's output schema and return its result as `structuredContent` when the schema is an object, as MCP requires. The JSON text content stays for clients that don't read structured content
- fix: reject a tool from another page with the same name but a different output schema, not only a different input schema. The order of keys in a schema and its root `$schema` don't count as a difference
- fix: fail a call whose tool has an object output schema but returns something other than an object, such as `null`. Such a result no longer completes a query

## v0.2.0

`@mcp-web/tools`:

- feat: add a code tool (`@mcp-web/tools/code`) that lets AI write a short JavaScript program that calls your tools as functions, instead of calling them one by one. Programs run in a sandboxed iframe by default, and every call goes through the same handler and Zod validation as a direct tool call ([#14](https://github.com/flekschas/mcp-web/pull/14))
- feat: `createCodeMode()` to expose state tools through a code tool, and `CodeTool` to wrap any set of tools
- feat: roll back the state when a program fails, via `stateTransaction()` and `combineTransactions()`
- feat: report all invalid calls of a program at once, with optional `hints` to help AI fix them
- feat: `signatures: 'lookup'` option to keep the tool description short for large tool sets
- feat: `patch` option to let AI fix a failed program by sending line edits
- feat: `WorkerExecutor` (`@mcp-web/tools/code/worker`) to run programs in Node, and `FunctionExecutor` for tests

`@mcp-web/core`:

- feat: `codeMode` option for `addStateTools()` and `createStateTools()`, which registers the getter and a code tool instead of the individual state tools ([#14](https://github.com/flekschas/mcp-web/pull/14))
- feat: `addCodeTool()` to register a `CodeTool`
- feat: `zodSchemasToTools()` to generate tools from several Zod schemas
- fix: `removeTool()` and `removeResource()` now tell the bridge, so removed tools and resources disappear for AI ([#16](https://github.com/flekschas/mcp-web/pull/16))

`@mcp-web/bridge`:

- feat: add a Cloudflare Workers adapter, `createCloudflareBridge` from `@mcp-web/bridge/cloudflare` ([#10](https://github.com/flekschas/mcp-web/pull/10))
- fix: notify MCP clients when tools or resources are removed ([#16](https://github.com/flekschas/mcp-web/pull/16))
- fix: report a tool result as an error only when its `error` is set, so results like `{ status: 'rendered', error: null }` no longer show as failed
- chore: remove the Deno and PartyKit adapters ([#8](https://github.com/flekschas/mcp-web/pull/8), [#10](https://github.com/flekschas/mcp-web/pull/10))

`@mcp-web/client`:

- fix: forward tool and resource list changes from the bridge to the MCP host, so AI apps pick up tools added or removed after connecting ([#17](https://github.com/flekschas/mcp-web/pull/17))

`@mcp-web/decompose-zod-schema`:

- feat: auto-detect arrays and records in split paths (`'todos'` instead of `'todos[]'`) and support deep paths through array elements (`'views.tracks.top'`) ([#14](https://github.com/flekschas/mcp-web/pull/14))
- feat: export `getSchemaAtDeepPath`

`@mcp-web/mcpb`:

- chore: retire the package ([#4](https://github.com/flekschas/mcp-web/pull/4))

## v0.1.3

`@mcp-web/bridge`:

- feat: return a synthetic `get_connection_status` tool when no browser session is connected, so MCP clients can discover the bridge before any frontend has authenticated
- fix: remove default bridge URL requirement from config — bridge URL must now be explicitly provided

`@mcp-web/client`:

- feat: re-poll `tools/list` after browser connects, so the client picks up real tools registered by the frontend
- fix: avoid false CLI detection in bundled builds — the `isNodeCLI` guard now checks for `MCP_SERVER_URL` to prevent the standalone CLI code from running when `@mcp-web/client` is bundled into other entry points via esbuild

`@mcp-web/core`:

- fix: correct WebSocket connection URL construction
- feat: expose `onConnectionStateChange` callback for tracking connection lifecycle

`@mcp-web/react`:

- feat: improved connection status tracking in `useConnectedMCPWeb` hook

## v0.1.2

`@mcp-web/client`:

- fix: pass `icons` array (not singular `icon` string) per MCP SDK schema, fixing missing icon in Claude Desktop
- fix: add `Accept: application/json` header to bridge info fetch
- fix: log tool execution and bridge info fetch errors instead of silently swallowing them

`@mcp-web/bridge`:

- fix: return `icons` array in server info and initialize responses
- fix: use actual request ID in error responses instead of hardcoded `0`
- fix: log JSON parse warnings for tool/resource responses

## v0.1.1

`@mcp-web/client`:

- fix: make CLI more robust and point `bin` to standalone bundle

## v0.1.0

- initial release
