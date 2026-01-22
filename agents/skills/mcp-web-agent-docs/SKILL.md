---
name: mcp-web-agent-docs
description: Review and update agent documentation and skills in `./agents/` related to MCP-Web.
---

# Agent Documentation Maintenance

This skill provides guidance for keeping the agent documentation and skills in `./agents/` up to date.

## Documentation Structure

```
agents/
├── AGENTS.md              # High-level overview & navigation (symlinked to root)
├── README.md              # Meta-documentation about the agents folder itself
└── skills/
    ├── mcp-web-agent-docs/  # THIS skill - meta documentation maintenance
    │   └── SKILL.md
    └── mcp-web/             # MCP-Web library usage skill
        ├── SKILL.md         # Main skill document
        ├── examples.md      # Complete code examples
        └── api-reference-*.md  # Per-package API documentation
```

## AGENTS.md Purpose & Content Guidelines

The `AGENTS.md` file serves as the **high-level entry point** for AI agents working in this repository. It should:

### DO Include:
- **Project overview**: Brief description of what mcp-web is (1-2 paragraphs max)
- **Architecture diagram**: Simple ASCII showing component relationships
- **Package map**: List of packages with one-line descriptions and paths
- **Navigation pointers**: Where to find detailed information (skills, package READMEs)
- **Available skills**: List of skills with their trigger conditions
- **Development commands**: Common pnpm commands for the monorepo
- **Code standards**: Brief coding conventions (TypeScript, Biome, ES modules)
- **Key entry points**: Main files an agent might need to find quickly

### DO NOT Include:
- Detailed API documentation (belongs in mcp-web skill)
- Full code examples (belongs in mcp-web skill)
- Implementation details of specific packages
- Tutorial-style content

### Target Length
AGENTS.md should be **50-100 lines** - concise enough to fit in context without overwhelming.

## mcp-web Skill Purpose & Content Guidelines

The `mcp-web` skill (`agents/skills/mcp-web/`) provides **detailed guidance** for building MCP-Web applications.

### SKILL.md Should Include:
- Design philosophy and patterns
- Project structure recommendations
- The State-Schema-Tool pattern explanation
- Quick reference checklists
- Links to additional resource files

### Supporting Files:
- `examples.md` - Complete, runnable code examples
- `api-reference-*.md` - Per-package API documentation:
  - `api-reference-core.md` - `@mcp-web/core` (MCPWeb class, state tools)
  - `api-reference-bridge.md` - `@mcp-web/bridge` (MCPWebBridge class)
  - `api-reference-client.md` - `@mcp-web/client` (MCP client for Claude)
  - `api-reference-integrations.md` - Framework integrations (Jotai, React)
  - `api-reference-tools.md` - Built-in tools (screenshot, DOM, Python)
  - `api-reference-decompose-zod-schema.md` - Schema decomposition utilities

## When to Update Documentation

### Update AGENTS.md When:
- A new package is added to the monorepo
- Package purposes or locations change
- New skills are created
- Development workflow changes (commands, tooling)
- Architecture changes significantly

### Update mcp-web Skill When:
- API signatures change in any `@mcp-web/*` package
- New patterns or best practices emerge
- New framework integrations are added
- New built-in tools are added
- Design recommendations change

## Update Procedure

### 1. Verify Current State
Before updating, read the current documentation:
```
agents/AGENTS.md
agents/skills/mcp-web/SKILL.md
```

### 2. Cross-Reference with Source Code
Check that documentation matches actual implementation:
- Package exports in `packages/*/src/index.ts`
- Class and function signatures
- Configuration options
- Type definitions in `packages/types/`

### 3. Update in Order
1. **API reference files first** - These are the source of truth
2. **SKILL.md second** - Update patterns if APIs changed
3. **AGENTS.md last** - Update navigation if structure changed

### 4. Maintain Consistency
- Keep terminology consistent across all files
- Use the same class names (`MCPWeb`, `MCPWebBridge`, not alternatives)
- Match import paths to actual package exports

## Package Reference

Current packages in the monorepo:

| Package | Path | Purpose |
|---------|------|---------|
| `@mcp-web/core` | `packages/core/` | Frontend library - MCPWeb class, state tools |
| `@mcp-web/bridge` | `packages/bridge/` | WebSocket/HTTP bridge server - MCPWebBridge class |
| `@mcp-web/client` | `packages/client/` | MCP client for Claude Desktop connection |
| `@mcp-web/react` | `packages/integrations/react/` | React hooks and components for state management |
| `@mcp-web/types` | `packages/types/` | Shared TypeScript types |
| `@mcp-web/decompose-zod-schema` | `packages/decompose-zod-schema/` | Zod schema decomposition utilities |
| `@mcp-web/tools` | `packages/tools/` | Reusable tool implementations |

## Symlink Reference

The `agents/` folder is the single source of truth. These symlinks expose it:

| Source | Symlink | Purpose |
|--------|---------|---------|
| `agents/AGENTS.md` | `./AGENTS.md` | OpenCode, Codex, Cursor |
| `agents/AGENTS.md` | `./CLAUDE.md` | Claude Code |
| `agents/AGENTS.md` | `.github/copilot-instructions.md` | GitHub Copilot |
| `agents/skills/` | `.claude/skills/` | Claude Code skills |
| `agents/skills/` | `.codex/skills/` | Codex CLI skills |

To recreate symlinks:
```bash
# From repo root
ln -sf agents/AGENTS.md AGENTS.md
ln -sf agents/AGENTS.md CLAUDE.md
ln -sf ../agents/AGENTS.md .github/copilot-instructions.md
ln -sf ../agents/skills .claude/skills
ln -sf ../agents/skills .codex/skills
```

## Quality Checklist

Before finalizing documentation updates:

- [ ] AGENTS.md is under 100 lines
- [ ] AGENTS.md contains no detailed API docs
- [ ] All packages are listed in AGENTS.md
- [ ] All skills are listed in AGENTS.md
- [ ] mcp-web skill SKILL.md links to all API reference files
- [ ] API reference files match actual package exports
- [ ] Class names are consistent (`MCPWeb`, `MCPWebBridge`)
- [ ] Import paths are accurate
- [ ] Code examples compile/run correctly
