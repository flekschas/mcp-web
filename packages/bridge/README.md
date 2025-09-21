# MCP Frontend Bridge

A bridge server that enables web frontend applications to be controlled by Claude Desktop through the Model Context Protocol (MCP). The bridge mediates between web applications (via WebSocket) and Claude Desktop (via HTTP/JSON-RPC).

## Overview

The bridge server:
- Runs a **WebSocket server** (default port 3001) for frontend connections
- Runs an **MCP server** (default port 3002) for Claude Desktop connections
- Manages session authentication and tool registration
- Routes tool calls between Claude Desktop and the appropriate frontend session

## Basic Usage

### Default Configuration

```typescript
import { Bridge } from 'mcp-frontend-bridge';

// Start the bridge server with default configuration
new Bridge();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down MCP Bridge...');
  process.exit(0);
});
```

This creates a bridge with:
- WebSocket server on port 3001
- MCP server on port 3002
- Default server name: "Web App Controller"
- Default description: "Control web applications and dashboards through your browser"

### Custom Configuration

```typescript
import { Bridge, type BridgeServerConfig } from 'mcp-frontend-bridge';

const config: BridgeServerConfig = {
  wsPort: 8001,
  mcpPort: 8002,
  name: "My Dashboard Controller",
  description: "Control my custom dashboard application",
  icon: "https://example.com/icon.png" // Optional icon URL or data URI
};

const bridge = new Bridge(config);

console.log('Bridge server started');
console.log(`- WebSocket server: ws://localhost:${config.wsPort}`);
console.log(`- MCP server: http://localhost:${config.mcpPort}`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down MCP Bridge...');
  process.exit(0);
});
```

## Configuration Options

The `BridgeServerConfig` interface supports:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `wsPort` | `number` | `3001` | Port for WebSocket server (frontend connections) |
| `mcpPort` | `number` | `3002` | Port for MCP server (Claude Desktop connections) |
| `name` | `string` | `"Web App Controller"` | Server name displayed in Claude Desktop |
| `description` | `string` | `"Control web applications..."` | Server description |
| `icon` | `string` | `undefined` | Optional icon URL or data URI |

## Architecture

```
Claude Desktop ↔ MCP Client ↔ Bridge Server ↔ Frontend Library (in Web App)
                              (port 3002)    (port 3001)
```

The bridge server acts as the central hub:
1. **Frontend connections**: Web apps connect via WebSocket to register tools and receive tool calls
2. **MCP connections**: Claude Desktop connects via HTTP/JSON-RPC to discover and execute tools
3. **Session management**: Each frontend gets a unique session with authentication
4. **Tool routing**: Tool calls from Claude Desktop are routed to the appropriate frontend session

## Next Steps

Once your bridge server is running:

1. **Configure your web app** to connect using the [Frontend Library](../frontend/)
2. **Set up Claude Desktop** to connect using the [MCP Client](../client/)
3. **Register tools** in your web app that Claude Desktop can call

## Development

Build the package:
```bash
pnpm build
```

Run in development mode:
```bash
pnpm dev
```