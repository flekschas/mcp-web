# Checkers Demo - Frontend-Triggered Queries

This demo showcases the frontend-triggered query system in mcp-web by implementing a checkers game where a human player competes against an AI agent.

## Overview

The demo consists of three components:
- **Frontend App** (`app/`) - Svelte app with the checkers game UI
- **Bridge Server** (`app/src/bridge.ts`) - MCP bridge that connects frontend to agent
- **AI Agent** (`agent/`) - Hono server that receives queries and plays checkers

## Architecture

```
Frontend (Svelte) ↔ Bridge (MCP) ↔ AI Agent (Hono + Claude)
     Tools              WebSocket         HTTP API
```

When the human makes a move:
1. Frontend calls `mcp.query()` with game context
2. Bridge forwards query to AI agent via HTTP PUT
3. Agent analyzes position using Claude AI
4. Agent calls MCP tools to make its move
5. Bridge forwards tool calls back to frontend
6. Frontend updates game state

## Setup

### Prerequisites

- Node.js 22+
- PNPM package manager
- Anthropic API key

### Environment Variables

In `agent`, create an `.env` file with the following variables:

```bash
# One of these
ANTHROPIC_API_KEY="your-anthropic-api-key-here"
CEREBRAS_API_KEY="your-cerebras-api-key-here"
GOOGLE_GENERATIVE_AI_API_KEY="your-google-api-key-here"
OPENAI_API_KEY="your-openai-api-key-here"
# Optionally
MODEL_PROVIDER="anthropic"
MODEL_NAME="claude-haiku-4-5-20251001"
```

All port configurations are managed centrally in `shared/mcp-config.ts`:
- Frontend: Port 3000
- Bridge WebSocket: Port 3001
- Bridge MCP: Port 3002
- Agent: Port 3003

### Installation

From the repository root:

```bash
pnpm install
```

## Running the Demo

You can start the three services (app, agent, bridge) conveniently via:

```bash
pnpm run dev
```

This starts:
1. the Svelte app on `http://localhost:3000`.
2. the AI agent on `http://localhost:8000`.
3. the MCP bridge with:
   - WebSocket server: `ws://localhost:3001`
   - MCP server: `http://localhost:3002`
   - Configured agent URL: `http://localhost:3003`

## How to Play

1. Open `http://localhost:3000` in your browser
2. You play as red pieces (bottom of board)
3. AI plays as black pieces (top of board)
4. Click a piece to select it, then click destination square
5. Game follows standard checkers rules:
   - Captures are mandatory
   - Pieces become queens when reaching opposite end
   - Win by capturing all opponent pieces or blocking all moves

## Technical Details

### Game Rules

- **Board**: 8x8 checkerboard, pieces only on dark squares
- **Players**: Human (red) starts first, AI (black) responds
- **Movement**: Diagonal moves only
- **Captures**: Mandatory jumps over opponent pieces
- **Promotion**: Pieces become queens at opposite end
- **Victory**: Capture all pieces or block all moves

### MCP Tools

The frontend exposes these tools to the AI:

1. **`getGameState`** - Returns current board, turn, move history
2. **`getLegalMoves`** - Returns all valid moves for current player
3. **`makeMove`** - Executes a move (AI only)
4. **`getBoardAscii`** - Returns ASCII board visualization
