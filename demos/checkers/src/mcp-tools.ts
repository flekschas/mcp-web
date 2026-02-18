import { MCPWeb } from '@mcp-web/core';
import { z } from 'zod';
import baseConfig from '../mcp-web.config.js';
import { claimGameName } from './game-names.js';
import { makeMove } from './game-logic.js';
import { GameStateSchema, MoveSchema } from './schemas.js';
import { state } from './state.svelte.js';

// In dev mode, use the config's bridgeUrl (e.g., localhost:3001).
// In production, omit it so MCPWeb defaults to window.location.host.
const config = {
  ...baseConfig,
  ...(!import.meta.env.DEV && { bridgeUrl: undefined }),
};

const { name: gameName, release: releaseGameName } = claimGameName();

export { gameName, releaseGameName };

export const mcpWeb = new MCPWeb({
  ...config,
  sessionName: gameName,
});

export const getGameStateToolDefinition = mcpWeb.addTool({
  name: 'get_game_state',
  description: 'Get the current game state including board, turn, and move history. As wel as all valid moves for the current player',
  handler: () => {
    const { moveHistory, ...rest } = state.gameState;
    return { ...rest, moveHistory: moveHistory.slice(-20), valid_moves: state.allValidMoves };
  },
  outputSchema: GameStateSchema
});

export const makeMoveToolDefinition = mcpWeb.addTool({
  name: 'make_move',
  description: 'Make a move for the current player in the game',
  handler: (move) => {
    const currentPlayer = state.gameState.currentTurn;

    // Validate the move is legal
    const isValid = state.allValidMoves.some(m => {
      const [mFromRow, mFromCol] = m.from;
      const [mToRow, mToCol] = m.to;
      const [moveFromRow, moveFromCol] = move.from;
      const [moveToRow, moveToCol] = move.to;
      return (
        mFromRow === moveFromRow &&
        mFromCol === moveFromCol &&
        mToRow === moveToRow &&
        mToCol === moveToCol
      );
    });

    if (!isValid) {
      console.error('Invalid move!');
      return { error: 'Invalid move! Must be one of: ' + JSON.stringify(state.allValidMoves) };
    }

    const currentCapturedPieces = state.gameState.capturedPieces[currentPlayer];

    const newState = makeMove(state.gameState, move);
    Object.assign(state.gameState, newState);

    const newCapturedPieces = state.gameState.capturedPieces[currentPlayer];

    return {
      numCapturedPieces: newCapturedPieces - currentCapturedPieces,
      gameStatus: state.gameState.gameStatus
    };
  },
  inputSchema: MoveSchema,
  outputSchema: z.union([
    z.object({
      numCapturedPieces: z.number(),
      gameStatus: GameStateSchema.shape.gameStatus,
    }),
    z.object({ error: z.string() })
  ]),
});
