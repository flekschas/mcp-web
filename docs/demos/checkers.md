# Frontend Query Demo: Spanish Checkers Game :cherries:

The _Checkers_ demo showcases **action tools** and **frontend-triggered queries**.
Play a game of Spanish Checkers against an AI opponent. When you make a move,
the frontend automatically queries the AI agent for its counter-move. To check
it out entirely, you can also ask AI (through your favorite MCP-compatible AI agent)
to make moves for you.

<video autoplay loop muted playsinline width="1256" data-name="checkers">
  <source
    src="https://storage.googleapis.com/mcp-web/checkers-light.mp4"
    type="video/mp4"
  />
</video>

This demo illustrates how MCP-Web can power bidirectional AI interactions:
the AI can control the game board, but the frontend can also request the AI
to analyze positions and suggest moves.

**Live Version:** https://checkers.demo.mcp-web.dev

**Code:** https://github.com/flekschas/mcp-web/tree/main/demos/checkers

## Key Components

- `src/queries/`: Defines action tools for game moves and board state exposure.

- `src/agent-query.ts`: Shows how to trigger AI queries from the frontend
   when the player makes a move.

<script setup>
  import { videoColorModeSrcSwitcher } from '../utils';
  videoColorModeSrcSwitcher();
</script>
