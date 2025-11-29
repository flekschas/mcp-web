import { makeMove } from "../game-logic";
import { mcpWeb, getGameStateToolDefinition, makeMoveToolDefinition } from "../mcp";
import { state } from "../state.svelte";

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

    const queryStream = mcpWeb.query({
      prompt,
      context: [getGameStateToolDefinition],
      responseTool: makeMoveToolDefinition
    });

    for await (const event of queryStream) {
      switch (event.type) {
        case 'query_accepted':
          console.log('AI query accepted:', event.uuid);
          state.gameMessage = 'AI is getting ready to make a move...';
          break;
        case 'query_progress':
          state.gameMessage = event.message;
          break;
        case 'query_complete':
          console.log('AI query complete. Tool calls:', event.toolCalls);
          state.gameMessage = 'AI made its move';
          break;
        case 'query_failure':
          console.error('AI query failed:', event.error);
          state.gameMessage = `AI error: ${event.error}`;
          makeRandomMove();
          break;
      }
    }

  } catch (error) {
    console.error('AI query failed:', error);
    state.gameMessage = `AI error: ${error instanceof Error ? error.message : String(error)}`;
    makeRandomMove();
  } finally {
    state.aiThinking = false;
  }
}
