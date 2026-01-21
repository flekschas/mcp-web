# Agents Docs

This folder is the source for various agent docs and skills. Since, every AI agent uses their own file path, we simply symlink out from this folder.

## Structure

- `AGENTS.md`: this file contains high-level, navigational, and skill information about the repo.
- `skills/`: this folder contains skills organized by folder.

---

## Symlinking

The `agents/` folder is the **single source of truth**. Symlinks expose these files to various AI coding agents that expect different paths.

### Instruction Files

| Target | Symlink | Agent |
|--------|---------|-------|
| `agents/AGENTS.md` | `./AGENTS.md` | Codex, OpenCode, Cursor |
| `agents/AGENTS.md` | `./CLAUDE.md` | Claude Code |
| `agents/AGENTS.md` | `.github/copilot-instructions.md` | GitHub Copilot |

### Skills Directory

| Target | Symlink | Agent |
|--------|---------|-------|
| `agents/skills/` | `.claude/skills/` | Claude Code |
| `agents/skills/` | `.codex/skills/` | Codex CLI |

### Recreating Symlinks

```bash
# Instruction files (from repo root)
ln -sf agents/AGENTS.md AGENTS.md
ln -sf agents/AGENTS.md CLAUDE.md
ln -sf ../agents/AGENTS.md .github/copilot-instructions.md

# Skills directories
ln -sf ../agents/skills .claude/skills
ln -sf ../agents/skills .codex/skills
```
