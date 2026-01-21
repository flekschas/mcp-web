# MCP Web Bridge

A bridge server that enables web frontend applications to be controlled by AI agents through the Model Context Protocol (MCP). The bridge mediates between web applications (via WebSocket) and AI agents (via HTTP/JSON-RPC).

## Overview

The bridge server:
- Runs a **single-port server** for both WebSocket and HTTP connections
- Manages session authentication and tool registration
- Routes tool calls between AI agents and the appropriate frontend session
- Supports multiple JavaScript runtimes (Node.js, Deno, Bun, PartyKit/Cloudflare)

## Quick Start

### Node.js

```typescript
import { MCPWebBridgeNode } from '@mcp-web/bridge';

const bridge = new MCPWebBridgeNode({
  name: 'My App',
  description: 'My awesome application',
  port: 3001,
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await bridge.close();
  process.exit(0);
});
```

### Deno

```typescript
import { MCPWebBridgeDeno } from '@mcp-web/bridge';

const bridge = new MCPWebBridgeDeno({
  name: 'My App',
  description: 'My awesome application',
  port: 3001,
});

// Bridge is now listening on ws://localhost:3001 and http://localhost:3001
```

### Bun

```typescript
import { MCPWebBridgeBun } from '@mcp-web/bridge';

const bridge = new MCPWebBridgeBun({
  name: 'My App',
  description: 'My awesome application',
  port: 3001,
});
```

### PartyKit / Cloudflare

```typescript
// server.ts
import { createPartyKitBridge } from '@mcp-web/bridge';

export default createPartyKitBridge({
  name: 'My App',
  description: 'My awesome application on the edge',
});
```

## Runtime Adapters

The bridge supports multiple JavaScript runtimes through adapters. Each adapter wraps the runtime-agnostic core and provides I/O specific to that runtime.

### MCPWebBridgeNode (Node.js)

**Status:** Production Ready ✅

The Node.js adapter uses `http.createServer()` with the `ws` library for WebSocket support.

```typescript
import { MCPWebBridgeNode } from '@mcp-web/bridge';

const bridge = new MCPWebBridgeNode({
  name: 'My App',
  description: 'My application',
  port: 3001,           // Single port for HTTP + WebSocket
  host: '0.0.0.0',      // Optional: bind address
});

// Access the core for advanced usage
const handlers = bridge.getHandlers();

// Graceful shutdown
await bridge.close();
```

**Features:**
- Single port for both HTTP and WebSocket (uses HTTP upgrade)
- Full session and query limit support
- Timer-based scheduler for session timeouts

---

### MCPWebBridgeDeno (Deno / Deno Deploy)

**Status:** Experimental 🧪

The Deno adapter uses `Deno.serve()` with native WebSocket upgrade support.

```typescript
import { MCPWebBridgeDeno } from '@mcp-web/bridge';

const bridge = new MCPWebBridgeDeno({
  name: 'My App',
  description: 'My application',
  port: 3001,
  hostname: '0.0.0.0',  // Optional
});
```

**Deno Deploy:**

```typescript
// main.ts - Entry point for Deno Deploy
import { MCPWebBridgeDeno } from '@mcp-web/bridge';

new MCPWebBridgeDeno({
  name: 'Production Bridge',
  description: 'MCP Web bridge on Deno Deploy',
  port: Number(Deno.env.get('PORT')) || 8000,
});
```

**Features:**
- Native Deno.serve() with WebSocket upgrade
- Works with Deno Deploy
- Timer-based scheduler

**Limitations:**
- Deno Deploy doesn't support monorepo subdirectories for entry points
- Consider using a separate repo or root-level entry point for deployment

---

### MCPWebBridgeBun (Bun)

**Status:** Experimental 🧪

The Bun adapter uses `Bun.serve()` with native WebSocket support.

```typescript
import { MCPWebBridgeBun } from '@mcp-web/bridge';

const bridge = new MCPWebBridgeBun({
  name: 'My App',
  description: 'My application',
  port: 3001,
  hostname: '0.0.0.0',  // Optional
});
```

**Features:**
- Native Bun.serve() with built-in WebSocket
- Excellent performance
- Timer-based scheduler

---

### MCPWebBridgeParty (PartyKit / Cloudflare)

**Status:** Experimental 🧪

The PartyKit adapter enables deployment to Cloudflare's edge network with Durable Objects for state management.

```typescript
// server.ts
import { createPartyKitBridge } from '@mcp-web/bridge';

export default createPartyKitBridge({
  name: 'My App',
  description: 'My application on the edge',
  sessionCheckIntervalMs: 60000,  // Optional: alarm interval
});
```

**partykit.json:**
```json
{
  "name": "my-mcp-bridge",
  "main": "server.ts",
  "compatibility_date": "2024-01-01"
}
```

**Deploy:**
```bash
npx partykit deploy
```

**Features:**
- Global edge deployment via Cloudflare
- Durable Objects for stateful WebSocket handling
- Hibernation support for cost efficiency
- Uses PartyKit Alarms instead of setInterval for session timeouts

**Key Differences:**
- No explicit port configuration (managed by PartyKit/Cloudflare)
- Uses `AlarmScheduler` instead of `TimerScheduler`
- State persists across hibernation cycles via `Party.storage`

---

## Custom Adapters

You can create custom adapters for other runtimes by using the core `MCPWebBridge` class directly:

```typescript
import { MCPWebBridge, TimerScheduler } from '@mcp-web/bridge';
import type { BridgeHandlers, WebSocketConnection, HttpRequest, HttpResponse } from '@mcp-web/bridge';

// Create the core with a scheduler
const scheduler = new TimerScheduler();
const core = new MCPWebBridge(config, scheduler);

// Get handlers to wire up to your runtime
const handlers: BridgeHandlers = core.getHandlers();

// Implement these in your adapter:
// - handlers.onWebSocketConnect(sessionId, ws, url)
// - handlers.onWebSocketMessage(sessionId, ws, data)
// - handlers.onWebSocketClose(sessionId)
// - handlers.onHttpRequest(req) -> Promise<HttpResponse>
```

## Configuration Options

All adapters accept these common options from `MCPWebConfig`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | **required** | Server name displayed to clients |
| `description` | `string` | **required** | Server description |
| `icon` | `string` | `undefined` | Optional icon URL or data URI |
| `agentUrl` | `string` | `undefined` | URL of the AI agent for query forwarding |
| `authToken` | `string` | `undefined` | Auth token for agent communication |
| `maxSessionsPerToken` | `number` | `undefined` | Max sessions per auth token |
| `onSessionLimitExceeded` | `'reject' \| 'close_oldest'` | `'reject'` | Behavior when limit exceeded |
| `maxInFlightQueriesPerToken` | `number` | `undefined` | Max concurrent queries per token |
| `sessionMaxDurationMs` | `number` | `undefined` | Max session duration (ms) |

### Adapter-Specific Options

**Node.js / Deno / Bun:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3001` | Port to listen on |
| `host` / `hostname` | `string` | `'0.0.0.0'` | Hostname to bind to |

**PartyKit:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sessionCheckIntervalMs` | `number` | `60000` | Alarm interval for session checks |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI Agent      │────▶│  Bridge Server  │◀────│   Web Frontend  │
│  (HTTP/JSON-RPC)│     │  (Single Port)  │     │   (WebSocket)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   MCPWebBridge      │
                    │   (Runtime-Agnostic │
                    │    Core Logic)      │
                    └─────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
    ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐
    │ Node.js     │    │ Deno        │    │ PartyKit    │
    │ Adapter     │    │ Adapter     │    │ Adapter     │
    └─────────────┘    └─────────────┘    └─────────────┘
```

The bridge server acts as the central hub:
1. **Frontend connections**: Web apps connect via WebSocket to register tools and receive tool calls
2. **Agent connections**: AI agents connect via HTTP/JSON-RPC to discover and execute tools
3. **Session management**: Each frontend gets a unique session with authentication
4. **Tool routing**: Tool calls from agents are routed to the appropriate frontend session

## Development

Build the package:
```bash
pnpm build
```

Run tests:
```bash
pnpm test
```

## Next Steps

Once your bridge server is running:

1. **Configure your web app** to connect using [@mcp-web/core](../core/)
2. **Set up your AI agent** to connect using [@mcp-web/client](../client/)
3. **Register tools** in your web app that the AI agent can call
