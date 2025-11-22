import { mcpWeb } from "../mcp";
import { state } from "../state.svelte.js";

/**
 * Query the AI agent to explain the last move made by the player.
 *
 * @returns The explanation of the last move.
 */
export async function queryAiToExplainLastMove() {
  try {
    state.aiThinking = true;
    state.gameMessage = 'AI is explaining the last move...';

    const lastMove = state.gameState.moveHistory[state.gameState.moveHistory.length - 1];
    if (!lastMove) {
      state.gameMessage = 'No moves have been made yet.';
      return '';
    }

    const lastPlayer = state.gameState.currentTurn === 'black' ? 'red' : 'black';
    const lastPlayerName = lastPlayer === 'red' ? 'human' : 'AI';

    const prompt = `Explain the last move made by the ${lastPlayer} player (${lastPlayerName}): from (${lastMove.from.row},${lastMove.from.col}) to (${lastMove.to.row},${lastMove.to.col}). Explain the presumable strategic reasoning behind this move and what it means for the game.`;

    let explanation = '';

    const queryStream = mcpWeb.query({ prompt });

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
