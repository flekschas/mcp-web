import { MCPWeb } from '@mcp-web/web';
import {
  boardToAscii,
  createInitialState,
  getLegalMoves,
  MCP_WEB_CONFIG,
  type Move,
  makeMove,
} from 'checkers-shared';
import { z } from 'zod';

// Create MCPWeb instance for the app
export const mcpWeb = new MCPWeb(MCP_WEB_CONFIG);

// Import state after mcpWeb is created
import { state } from './state.svelte.js';
export { state };

// Position schema
const positionSchema = z.object({
  row: z.number().min(0).max(7),
  col: z.number().min(0).max(7)
});

// Move schema
const moveSchema = z.object({
  from: positionSchema,
  to: positionSchema
});

// Tool: Get legal moves for current player
mcpWeb.addTool({
  name: 'getLegalMoves',
  description: 'Get all legal moves for the current player. Returns an array of available moves.',
  handler: () => getLegalMoves(state.gameState),
  // outputSchema: z.array(moveSchema) // TODO: Support array and string output schemas
});

// Tool: Get ASCII board representation
mcpWeb.addTool({
  name: 'getBoardAscii',
  description: 'Get ASCII representation of the current board for visualization. Useful for understanding the board position.',
  handler: () => boardToAscii(state.gameState.board),
  // outputSchema: z.string() // TODO: Support array and string output schemas
});

// Tool: Make move (for AI)
const makeMoveOutputSchema = z.object({
  success: z.boolean(),
  move: moveSchema.optional(),
  gameStatus: z.enum(['playing', 'red_wins', 'black_wins', 'draw']).optional(),
  error: z.string().optional()
});

const makeMoveToolDef = {
  name: 'makeMove',
  description: 'Make a move in the game. Used by AI to execute its chosen move. Only valid during AI turn (black pieces).',
  handler: (args: { move: Move }) => {
    console.log('AI making move:', args.move);

    // Validate it's AI's turn
    if (state.gameState.currentTurn !== 'black') {
      return { success: false, error: 'Not AI turn' };
    }

    // Validate the move is legal
    const legalMoves = getLegalMoves(state.gameState);
    const isLegal = legalMoves.some(m =>
      m.from.row === args.move.from.row &&
      m.from.col === args.move.from.col &&
      m.to.row === args.move.to.row &&
      m.to.col === args.move.to.col
    );

    if (!isLegal) {
      return { success: false, error: 'Illegal move' };
    }

    // Make the move
    const newState = makeMove(state.gameState, args.move);
    Object.assign(state.gameState, newState);  // Update state in place

    return {
      success: true,
      move: args.move,
      gameStatus: newState.gameStatus
    };
  },
  inputSchema: z.object({
    move: moveSchema.describe('The move to make')
  }),
  outputSchema: makeMoveOutputSchema
};

// Register the tool
const makeMoveTool = mcpWeb.addTool(makeMoveToolDef);

// Query function for AI to make a move
export async function queryAIForMove() {
  try {
    state.aiThinking = true;
    state.gameMessage = 'AI is thinking...';

    if (state.gameState.currentTurn !== 'black') {
      throw new Error('Not AI turn');
    }

    const legalMoves = getLegalMoves(state.gameState);
    if (legalMoves.length === 0) {
      state.gameMessage = 'AI has no legal moves - you win!';
      return;
    }

    // If only one move, execute it immediately
    if (legalMoves.length === 1) {
      const move = legalMoves[0];
      const newState = makeMove(state.gameState, move);
      Object.assign(state.gameState, newState);
      state.gameMessage = `AI made move: ${move.from.row},${move.from.col} → ${move.to.row},${move.to.col}`;
      return;
    }

    // Query the AI agent
    const lastMove = state.gameState.moveHistory[state.gameState.moveHistory.length - 1];
    const prompt = `Make your move as black. Analyze the position and choose the best move. ${lastMove ? `The human just moved from (${lastMove.from.row},${lastMove.from.col}) to (${lastMove.to.row},${lastMove.to.col}).` : 'This is the start of the game.'}`;

    const queryStream = mcpWeb.query({
      prompt,
      context: [
        { name: 'lastMove', value: lastMove, description: 'The last move made by the human player' },
        { name: 'gameMode', value: 'standard', description: 'Standard checkers rules' }
      ],
      responseTool: makeMoveTool  // AI should call this tool to make its move
    });

    for await (const event of queryStream) {
      switch (event.type) {
        case 'query_accepted':
          console.log('AI query accepted:', event.uuid);
          break;
        case 'query_progress':
          state.gameMessage = event.message;
          break;
        case 'query_complete':
          console.log('AI query complete. Tool calls:', event.toolCalls);
          state.gameMessage = 'AI move completed';
          break;
        case 'query_failure':
          console.error('AI query failed:', event.error);
          state.gameMessage = `AI error: ${event.error}`;
          break;
      }
    }

  } catch (error) {
    console.error('AI query failed:', error);
    state.gameMessage = `AI error: ${error instanceof Error ? error.message : String(error)}`;

    // Fallback: make random legal move
    const legalMoves = getLegalMoves(state.gameState);
    if (legalMoves.length > 0) {
      const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      const newState = makeMove(state.gameState, randomMove);
      Object.assign(state.gameState, newState);
      state.gameMessage = `AI made random move: ${randomMove.from.row},${randomMove.from.col} → ${randomMove.to.row},${randomMove.to.col}`;
    }
  } finally {
    state.aiThinking = false;
  }
}

// Query function for human to get move suggestions
export async function querySuggestMoves() {
  try {
    state.aiThinking = true;
    state.gameMessage = 'AI is analyzing your position...';

    if (state.gameState.currentTurn !== 'red') {
      state.gameMessage = "It's not your turn!";
      return [];
    }

    const legalMoves = getLegalMoves(state.gameState);
    if (legalMoves.length === 0) {
      state.gameMessage = 'You have no legal moves - AI wins!';
      return [];
    }

    const prompt = `Analyze the current position and suggest 1-3 of the best moves for the red player (human). For each suggested move, explain why it's a good choice. Consider: capturing pieces, advancing toward promotion, protecting pieces, and controlling the center.`;

    const suggestions: Array<{move: Move; explanation: string}> = [];

    const queryStream = mcpWeb.query({
      prompt,
      context: [
        { name: 'playerColor', value: 'red', description: 'The player asking for suggestions' }
      ],
      timeout: 30000
    });

    for await (const event of queryStream) {
      switch (event.type) {
        case 'query_progress':
          state.gameMessage = event.message;
          break;
        case 'query_complete':
          state.gameMessage = 'Suggestions ready!';
          // Parse suggestions from message or toolCalls
          if (event.message) {
            console.log('Suggestions:', event.message);
          }
          // TODO: Implement proper structured output for suggestions
          break;
        case 'query_failure':
          console.error('Suggestion query failed:', event.error);
          state.gameMessage = `Error: ${event.error}`;
          break;
      }
    }

    return suggestions;

  } catch (error) {
    console.error('Suggestion query failed:', error);
    state.gameMessage = `Error getting suggestions: ${error instanceof Error ? error.message : String(error)}`;
    return [];
  } finally {
    state.aiThinking = false;
  }
}

// Query function to explain AI's last move
export async function queryExplainAIMove() {
  try {
    state.aiThinking = true;
    state.gameMessage = 'AI is explaining its move...';

    const lastMove = state.gameState.moveHistory[state.gameState.moveHistory.length - 1];
    if (!lastMove) {
      state.gameMessage = 'No moves have been made yet.';
      return '';
    }

    const prompt = `Explain the last move made by the black player (AI): from (${lastMove.from.row},${lastMove.from.col}) to (${lastMove.to.row},${lastMove.to.col}). Explain the strategic reasoning behind this move and what it means for the game.`;

    let explanation = '';

    const queryStream = mcpWeb.query({
      prompt,
      timeout: 30000
    });

    for await (const event of queryStream) {
      switch (event.type) {
        case 'query_progress':
          state.gameMessage = event.message;
          break;
        case 'query_complete':
          explanation = event.message || '';
          state.gameMessage = 'Explanation ready!';
          break;
        case 'query_failure':
          console.error('Explanation query failed:', event.error);
          state.gameMessage = `Error: ${event.error}`;
          break;
      }
    }

    return explanation;

  } catch (error) {
    console.error('Explanation query failed:', error);
    state.gameMessage = `Error getting explanation: ${error instanceof Error ? error.message : String(error)}`;
    return '';
  } finally {
    state.aiThinking = false;
  }
}

// Function to make human move
export function makeHumanMove(move: Move): boolean {
  if (state.gameState.currentTurn !== 'red') {
    state.gameMessage = "It's not your turn!";
    return false;
  }

  // Validate the move
  const legalMoves = getLegalMoves(state.gameState);
  const isLegal = legalMoves.some(m =>
    m.from.row === move.from.row &&
    m.from.col === move.from.col &&
    m.to.row === move.to.row &&
    m.to.col === move.to.col
  );

  if (!isLegal) {
    state.gameMessage = 'Illegal move!';
    return false;
  }

  // Make the move
  const newState = makeMove(state.gameState, move);
  Object.assign(state.gameState, newState);

  // Check game status
  if (newState.gameStatus !== 'playing') {
    if (newState.gameStatus === 'red_wins') {
      state.gameMessage = 'You win!';
    } else if (newState.gameStatus === 'black_wins') {
      state.gameMessage = 'AI wins!';
    } else {
      state.gameMessage = "It's a draw!";
    }
    return true;
  }

  state.gameMessage = `Your move: ${move.from.row},${move.from.col} → ${move.to.row},${move.to.col}`;

  // Trigger AI move after human move
  setTimeout(() => queryAIForMove(), 500);

  return true;
}

// Reset game
export function resetGame() {
  Object.assign(state.gameState, createInitialState());
  state.aiThinking = false;
  state.gameMessage = 'New game started. You play as red (bottom).';
}

// Initialize
resetGame();
