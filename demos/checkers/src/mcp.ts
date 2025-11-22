import { MCPWeb } from '@mcp-web/web';
import { z } from 'zod';
import { MCP_WEB_CONFIG } from '../mcp-web.config.js';
import { makeMove } from './game-logic.js';
import { GameStateSchema, MoveSchema, } from './schemas';
import { state } from './state.svelte';

export const mcpWeb = new MCPWeb(MCP_WEB_CONFIG);

export const getGameStateToolDefinition = mcpWeb.addTool({
  name: 'get_game_state',
  description: 'Get the current game state including board, turn, and move history. As wel as all valid moves for the current player',
  handler: () => ({ ...state.gameState, valid_moves: state.allValidMoves }),
  outputSchema: GameStateSchema
});

export const makeMoveToolDefinition = mcpWeb.addTool({
  name: 'make_move',
  description: 'Make a move for the current player in the game',
  handler: ({ player, moveIndex, move }) => {
    console.log('AI making move:', move);

    if (moveIndex < state.gameState.moveHistory.length) {
      return { error: `This move has already been made. See \`moveHistory[${moveIndex}]\` of the \`get_game_state\` tool.` };
    }

    if (moveIndex > state.gameState.moveHistory.length) {
      return { error: `Cannot make future moves. The current move index is ${state.gameState.moveHistory.length}.` };
    }

    if (player !== state.gameState.currentTurn) {
      return { error: `It's not your turn. The current player is ${state.gameState.currentTurn}` };
    }

    // Validate the move is legal
    const isValid = state.allValidMoves.some(m =>
      m.from.row === move.from.row &&
      m.from.col === move.from.col &&
      m.to.row === move.to.row &&
      m.to.col === move.to.col
    );

    if (!isValid) {
      return { error: 'Invalid move' };
    }

    const currentCapturedPieces = state.gameState.capturedPieces[player];

    state.gameState = makeMove(state.gameState, move);

    const newCapturedPieces = state.gameState.capturedPieces[player];

    return {
      numCapturedPieces: newCapturedPieces - currentCapturedPieces,
      gameStatus: state.gameState.gameStatus
    };
  },
  inputSchema: z.object({
    player: GameStateSchema.shape.currentTurn,
    moveIndex: z.number().describe('The index of the move to make. The first move is at index 0.'),
    move: MoveSchema,
  }).describe('The move to make'),
  outputSchema: z.union([
    z.object({
      numCapturedPieces: z.number(),
      gameStatus: GameStateSchema.shape.gameStatus,
    }),
    z.object({ error: z.string() })
  ]),
});
