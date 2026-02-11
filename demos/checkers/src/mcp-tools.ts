import { MCPWeb } from '@mcp-web/core';
import { z } from 'zod';
import config from '../mcp-web.config.js';
import { makeMove } from './game-logic.js';
import { GameStateSchema, MoveSchema } from './schemas.js';
import { state } from './state.svelte.js';

export const mcpWeb = new MCPWeb(config);

export const getGameStateToolDefinition = mcpWeb.addTool({
  name: 'get_game_state',
  description: 'Get the current game state including board, turn, and move history. As wel as all valid moves for the current player',
  handler: () => ({ ...state.gameState, valid_moves: state.allValidMoves }),
  outputSchema: GameStateSchema
});

export const makeMoveToolDefinition = mcpWeb.addTool({
  name: 'make_move',
  description: 'Make a move for the current player in the game',
  handler: (move) => {
    const currentPlayer = state.gameState.currentTurn;

    // Validate the move is legal
    const isValid = state.allValidMoves.some(m =>
      m.from.row === move.from.row &&
      m.from.col === move.from.col &&
      m.to.row === move.to.row &&
      m.to.col === move.to.col
    );

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
