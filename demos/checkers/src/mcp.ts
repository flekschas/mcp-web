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
  handler: (move) => {
    console.log('make_move: player', player);
    console.log('make_move: moveIndex', moveIndex);
    console.log('make_move: move', move);

    if (moveIndex < state.gameState.moveHistory.length) {
      console.error('This move has already been made. See \`moveHistory[${moveIndex}]\` of the \`get_game_state\` tool.');
      return { error: `This move has already been made. See \`moveHistory[${moveIndex}]\` of the \`get_game_state\` tool.` };
    }

    if (moveIndex > state.gameState.moveHistory.length) {
      console.error('Cannot make future moves. The current move index is ${state.gameState.moveHistory.length}.');
      return { error: `Cannot make future moves. The current move index is ${state.gameState.moveHistory.length}.` };
    }

    if (player !== state.gameState.currentTurn) {
      console.error('It\'s not your turn. The current player is ${state.gameState.currentTurn}');
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
      console.error('Invalid move. The move is not legal. See \`allValidMoves\` of the \`get_game_state\` tool.');
      return { error: 'Invalid move' };
    }

    const currentCapturedPieces = state.gameState.capturedPieces[player];

    console.log('Making move:', move);

    const newState = makeMove(state.gameState, move);
    Object.assign(state.gameState, newState);

    const newCapturedPieces = state.gameState.capturedPieces[player];

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
