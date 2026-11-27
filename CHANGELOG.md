## Next

`@mcp-web/core`:

- feat: `idleTimeoutMs` option to disconnect after a period without requests from AI or user interaction, and reconnect on the next interaction. Hosted bridges like the Cloudflare adapter keep running, and billing, while a page is connected. `idle` and `idleDisconnectAt` expose the state, for example to show a countdown
- fix: report user activity to the bridge every 30 seconds instead of on every mouse move
- fix: check tool results against JSON Schema output schemas too, the way the MCP TypeScript SDK client does (draft-07, with string formats such as `date-time`), and send the parsed result of a Zod output schema, which drops unknown keys and fills in defaults. A result that doesn't match its output schema now fails the call, because MCP clients reject it. An error result (`{ error }`) is sent as is. App props are checked the same way against `propsSchema`, so a prop declared `.optional()` no longer accepts `null`. A JSON Schema output schema is compiled when the tool is added; on a page whose Content Security Policy blocks that, results go unchecked
- fix: send Zod output schemas as JSON Schema draft-07, so MCP clients accept tuples in results
- fix: `validateInput()` checks string formats of a JSON Schema too, and tools can share a schema with the same `$id`
- fix: accept a tool or app with a Zod schema for one of its input and output schemas and a JSON Schema for the other
- feat: `mcpApp` option to let AI open the whole web app as an MCP App, for example in a Claude chat. `true` opens `index.html`, and `{ page: 'admin.html' }` opens another page. The view is a new copy of the app that starts from its initial state, and `{ page, csp }` lists the domains it may reach. In the view, `MCPWeb` offers its tools to the host as app tools instead of connecting to the bridge, and sends the state of `addStateTools()` states to the host for the model after tool calls and user input. `isMCPApp` tells from the start whether the page runs as a view, so it can leave out what a view doesn't need, `version` sets the app version shown to the host, and `disableAppTools: true` uses the bridge in the view too, while the view still does the handshake with the host

`@mcp-web/app`:

- feat: `defineMCPAppsConfig()` builds each page opened through `mcpApp` as a single-file view, at the same path in its output directory, such as `public/mcp-web-apps/index.html`
- fix: build each view on its own, so views that share code no longer load JavaScript files that the build didn't keep
- fix: the default URL of an app's view matches the file the plugin builds, such as `/mcp-web-apps/show-stats.html` for `show_stats`
- feat: views tell the host the app's name and version, instead of `mcp-web-app` and `0.1.0`. The version comes from `version` in `createApp()` or from the closest `package.json`, and `renderMCPApp()` takes `name` and `version` options
- fix: build every view in the mode and output directory of the build (`--mode`, `--outDir`), and in watch mode rebuild a view when a module only it uses changes
- fix: stop the build with an error when two views would be written to the same file, or when there are no views to build
- feat: warn when a built view loads local files by URL, since hosts get only the HTML of a view
- fix: leave the page's icon links out of views, so the build no longer writes an icon file that a view can't load
- fix: `createApp` components imported as a default export or under another name now render. A `version` that isn't one string literal falls back to `package.json`

`@mcp-web/bridge`:

- feat: with `mcpApp`, the bridge offers an `open_app` tool that opens the web app as an MCP App, also while no browser tab is connected. The Node and Bun adapters read the view from `public/` or the new `publicDir` option, and the Cloudflare adapter from the `ASSETS` binding. Only the copy the bridge serves to the host is marked as a view, so a site that frames the view's public file can't use its tools. Pages can't register a tool named `open_app` or a resource at the view's URI while `mcpApp` is set
- fix: move `_meta` of error and image results to the top level of the tool result too, instead of showing it to AI or dropping it

`@mcp-web/bridge` and `@mcp-web/client`:

- fix: when no page is connected, tell AI to ask the user to switch back to the page, not only to open it
- feat: list a tool's output schema and return its result as `structuredContent` when the schema is an object, as MCP requires. The JSON text content stays for clients that don't read structured content
- fix: reject a tool from another page with the same name but a different output schema, not only a different input schema. The order of keys in a schema and its root `$schema` don't count as a difference
- fix: fail a call whose tool has an object output schema but returns something other than an object, such as `null`. Such a result no longer completes a query
- fix: the client passes `get_connection_status` on to the bridge, so its answer can mention `open_app`

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
