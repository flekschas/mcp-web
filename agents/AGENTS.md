# MCP-Web

A bridge architecture that allows web frontends to be controlled by AI agents through the Model Context Protocol (MCP). Web apps expose their state and actions as tools that AI can understand and invoke.

```
Claude Desktop <-> MCP Client <-> Bridge Server <-> Frontend Library (in Web App)
```

## Packages

| Package | Path | Description |
|---------|------|-------------|
| `@mcp-web/core` | `packages/core/` | Frontend library - MCPWeb class, state tools |
| `@mcp-web/bridge` | `packages/bridge/` | WebSocket/HTTP bridge server - MCPWebBridge class |
| `@mcp-web/client` | `packages/client/` | MCP client connecting Claude Desktop to bridge |
| `@mcp-web/react` | `packages/integrations/react/` | React hooks and components for state management |
| `@mcp-web/types` | `packages/types/` | Shared TypeScript type definitions |
| `@mcp-web/decompose-zod-schema` | `packages/decompose-zod-schema/` | Zod schema decomposition utilities |
| `@mcp-web/tools` | `packages/tools/` | Reusable tool implementations |

## Available Skills

Load these skills for detailed guidance on specific tasks:

| Skill | When to Use |
|-------|-------------|
| `mcp-web` | Building MCP-Web apps, exposing frontend state to AI, registering tools, using `@mcp-web/*` packages |
| `mcp-web-agent-docs` | Updating agent documentation in `./agents/` |

## Development Commands

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm clean            # Clean build artifacts

# Package-specific
pnpm --filter @mcp-web/core build
pnpm --filter @mcp-web/bridge dev
```

## Code Standards

- TypeScript throughout, ES modules (`"type": "module"`)
- Biome for linting/formatting (single quotes, 2 spaces, 80 char width)
- Use `unknown` instead of `any` for unknown types
- Descriptive variable names

## Key Entry Points

| Purpose | File |
|---------|------|
| Frontend integration | `packages/core/src/index.ts` |
| Bridge server | `packages/bridge/src/bridge.ts` |
| MCP client | `packages/client/src/client.ts` |
| Type definitions | `packages/types/src/index.ts` |

## Documentation

- **Agent docs**: `agents/` (this file + skills)
- **API docs**: Generated via `pnpm docs:generate` to `docs/`
- **Package READMEs**: `packages/*/README.md`
