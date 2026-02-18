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
