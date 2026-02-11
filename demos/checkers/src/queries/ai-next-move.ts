import { makeMove } from "../game-logic";
import { getGameStateToolDefinition, makeMoveToolDefinition, mcpWeb } from "../mcp-tools";
import { state } from "../state.svelte";
import type { Move } from "../types";

function makeRandomMove() {
  if (state.allValidMoves.length === 0) return;

  const randomMove = state.allValidMoves[Math.floor(Math.random() * state.allValidMoves.length)];
  const newState = makeMove(state.gameState, randomMove);
  Object.assign(state.gameState, newState);
  state.gameMessage = `AI made random move: ${randomMove.from.row},${randomMove.from.col} → ${randomMove.to.row},${randomMove.to.col}`;
}

export async function queryAIForMove() {
  try {
    state.aiThinking = true;
    state.gameMessage = 'AI is thinking...';

    if (state.gameState.currentTurn !== 'black') {
      throw new Error('Not AI turn');
    }

    if (state.allValidMoves.length === 0) {
      state.gameMessage = 'AI has no legal moves - you win!';
      return;
    }

    // If only one move, execute it immediately
    if (state.allValidMoves.length === 1) {
      const move = state.allValidMoves[0];
      const newState = makeMove(state.gameState, move);
      Object.assign(state.gameState, newState);
      state.gameMessage = `AI made move: ${move.from.row},${move.from.col} → ${move.to.row},${move.to.col}`;
      return;
    }

    // Query the AI agent
    const lastMove = state.gameState.moveHistory.at(-1);
    const prompt = `Make your move as black. Analyze the position and choose the best move. ${lastMove ? `The human just moved from (${lastMove.from.row},${lastMove.from.col}) to (${lastMove.to.row},${lastMove.to.col}).` : 'This is the start of the game.'}`;

    const query = mcpWeb.query({
      prompt,
      context: [getGameStateToolDefinition],
      responseTool: makeMoveToolDefinition
    });

    // Access UUID synchronously - now we can map make_move calls to this query!
    state.activeQueryUuid = query.uuid;

    // Use query.stream for fine-grained event handling
    for await (const event of query.stream) {
      switch (event.type) {
        case 'query_accepted':
          state.gameMessage = 'AI is getting ready to make a move...';
          break;
        case 'query_progress':
          state.gameMessage = event.message;
          break;
        case 'query_complete': {
          const responseTool = event.toolCalls?.at(-1);
          if (responseTool?.tool === 'make_move') {
            const move = responseTool.arguments as Move;
            state.gameMessage = `AI moved a piece from (${move.from.row + 1},${move.from.col + 1}) to (${move.to.row + 1},${move.to.col + 1})`;
          }
          break;
        }
        case 'query_failure':
          console.error('AI query failed:', event.error);
          state.gameMessage = `AI failed to make a move: ${event.error}`;
          makeRandomMove();
          break;
      }
    }

  } catch (error) {
    console.error('AI query failed:', error);
    state.gameMessage = `AI error: ${error instanceof Error ? error.message : String(error)}`;
    // Only fall back to random move if it's still the AI's turn (move wasn't already made)
    if (state.gameState.currentTurn === 'black') {
      makeRandomMove();
    }
  } finally {
    state.aiThinking = false;
    state.activeQueryUuid = undefined;
  }
}
