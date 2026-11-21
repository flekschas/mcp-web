# MCP Web Bridge

A bridge server that enables web frontend applications to be controlled by AI agents through the Model Context Protocol (MCP). The bridge mediates between web applications (via WebSocket) and AI agents (via HTTP/JSON-RPC).

## Overview

The bridge server:
- Runs a **single-port server** for both WebSocket and HTTP connections
- Manages session authentication and tool registration
- Routes tool calls between AI agents and the appropriate frontend session
- Supports multiple JavaScript runtimes (Node.js, Bun, Cloudflare Workers)

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

### Bun

```typescript
import { MCPWebBridgeBun } from '@mcp-web/bridge';

const bridge = new MCPWebBridgeBun({
  name: 'My App',
  description: 'My awesome application',
  port: 3001,
});
```

### Cloudflare Workers

```typescript
// worker.ts
import { createCloudflareBridge } from '@mcp-web/bridge/cloudflare';

const bridge = createCloudflareBridge({
  config: {
    name: 'My App',
    description: 'My awesome application on the edge',
  },
});

export const MCPWebBridgeObject = bridge.DurableObject;
export default bridge.worker;
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

### createCloudflareBridge (Cloudflare Workers)

**Status:** Experimental 🧪

Deploys to Cloudflare Workers with Durable Objects. A Worker routes each request
to an object; each object runs one bridge core.

Objects are keyed by a **room**, derived from the auth token. Every cross-session
feature in the bridge — session lists, tool-change notifications, per-token
limits — is already scoped to one token, so this partition lets the core's
in-memory state work unchanged. In practice one browser gets one object.

```typescript
// worker.ts
import { createCloudflareBridge } from '@mcp-web/bridge/cloudflare';

interface Env {
  AGENT_URL?: string;
}

const bridge = createCloudflareBridge<Env>({
  // A function receives the Worker env, for config that depends on vars
  config: (env) => ({
    name: 'My App',
    description: 'My application on the edge',
    agentUrl: env.AGENT_URL,
  }),
});

export const MCPWebBridgeObject = bridge.DurableObject;
export const MCPWebQueryIndex = bridge.QueryIndex;  // only needed with an agent
export default bridge.worker;
```

**wrangler.jsonc:**
```jsonc
{
  "name": "my-mcp-bridge",
  "main": "worker.ts",
  "compatibility_date": "2026-08-01",
  "durable_objects": {
    "bindings": [
      { "name": "MCP_WEB_BRIDGE", "class_name": "MCPWebBridgeObject" }
    ]
  },
  "migrations": [
    // SQLite-backed objects are the only kind on the free plan
    { "tag": "v1", "new_sqlite_classes": ["MCPWebBridgeObject"] }
  ]
}
```

**Deploy:**
```bash
npx wrangler deploy
```

**Serving a frontend from the same Worker.** Add an `assets` binding and the
Worker will fall back to it for anything that is not bridge traffic. List the
bridge's own paths in `run_worker_first`, or asset routing will answer the
WebSocket upgrade on `/` before the Worker sees it:

```jsonc
"assets": {
  "directory": "./dist",
  "binding": "ASSETS",
  "not_found_handling": "single-page-application",
  "run_worker_first": ["/", "/health"]
}
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `config` | `MCPWebConfig \| (env) => MCPWebConfig` | Bridge configuration |
| `bindings` | `object` | Override binding names (`bridge`, `queryIndex`, `assets`) |
| `serveAssets` | `boolean` | Serve non-bridge requests from `ASSETS`. Defaults to true when the binding exists |

**Notes:**
- Bridge sessions use ordinary timers. Only the query index schedules a storage
  alarm, to sweep expired callback routes
- Sockets are accepted with `accept()`, not the Hibernation API, so an object
  stays live while any client is connected
- Only needed when the bridge forwards queries to an agent: bind
  `MCP_WEB_QUERY_INDEX` and export `QueryIndex`. Agent callbacks arrive on
  `/query/:uuid/*` with no auth token, and the index is how the router finds the
  object that owns the query

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

**Node.js / Bun:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3001` | Port to listen on |
| `host` / `hostname` | `string` | `'0.0.0.0'` | Hostname to bind to |

**Cloudflare Workers:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `bindings` | `object` | binding names below | Override `MCP_WEB_BRIDGE`, `MCP_WEB_QUERY_INDEX`, `ASSETS` |
| `serveAssets` | `boolean` | `true` when `ASSETS` exists | Serve unmatched requests from the assets binding |

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
    │ Node.js     │    │ Bun         │    │ Cloudflare  │
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
