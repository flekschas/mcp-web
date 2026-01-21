# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the MCP Frontend Integration System - a bridge architecture that allows web frontends to be controlled by Claude Desktop through the Model Context Protocol (MCP). The system consists of three main packages:

1. **Bridge** (`packages/bridge/`) - WebSocket/HTTP server that mediates between frontends and Claude Desktop
2. **Frontend** (`packages/frontend/`) - JavaScript library that web apps integrate to expose tools to Claude
3. **Client** (`packages/client/`) - MCP client that connects Claude Desktop to the bridge server

## Architecture

```
Claude Desktop ↔ MCP Client ↔ Bridge Server ↔ Frontend Library (in Web App)
```

## Development Commands

Since this is a PNPM workspace, use these commands from the root:

```bash
# Install dependencies for all packages
pnpm install

# Build all packages
pnpm -r build

# Build specific package
pnpm --filter bridge build
pnpm --filter client build  
pnpm --filter frontend build

# Run specific package in dev mode
pnpm --filter client dev
pnpm --filter frontend dev
```

## Code Standards

- TypeScript is used throughout the project
- Biome is configured for linting and formatting (single quotes, 2 spaces, 80 char line width)
- All packages use ES modules (`"type": "module"`)

## Key Files and Their Purposes

### Bridge Server (`packages/bridge/src/bridge.ts`)
- Handles WebSocket connections from frontends on port 3001
- Provides HTTP/JSON-RPC MCP server interface on port 3002
- Manages session authentication and tool registration
- Routes tool calls between Claude Desktop and appropriate frontend sessions

### Frontend Library (`packages/frontend/src/frontend.ts`)
- `MCPFrontend` class that web apps instantiate
- Handles WebSocket connection to bridge server
- Provides `addTool()` method for registering interactive tools
- Includes built-in UI (floating button) for connection configuration
- Utility functions in `MCPUtils` for common tool patterns (DOM queries, screenshots, forms)

### MCP Client (`packages/client/src/client.ts`)
- Standard MCP server implementation using `@modelcontextprotocol/sdk`
- Translates MCP requests to bridge server HTTP API calls
- Handles tool execution responses and session management
- Configured via environment variables (MCP_SERVER_URL, AUTH_TOKEN)

## Tool Registration Pattern

Frontend tools are registered with this signature:
```typescript
addTool(name: string, description: string, handler: Function, inputSchema?: JsonSchema)
```

The bridge server automatically:
- Aggregates tools from all active sessions
- Handles session routing (auto-selects if only one session active)
- Provides session management tools (`list_active_sessions`)

## Session Management

- Each frontend gets a unique session key (persisted in localStorage)
- Authentication uses auto-generated tokens
- Bridge server tracks session metadata (origin, page title, activity)
- Tools are scoped to sessions but can be called cross-session if needed

## Testing and Debugging

- No test framework is currently configured
- Frontend library includes debug mode option
- Bridge server logs all connections and tool calls to console
- Use browser dev tools to inspect WebSocket messages

## Publishing/Distribution

All packages are currently marked as `"private": true` - they are not published to npm. The README contains installation instructions that reference placeholder package names (`@your-company/mcp-*`).
- Always use descriptive variable names
- Do not introduce `any` types. If the type is now known, use `unknown`