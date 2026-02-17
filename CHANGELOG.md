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
