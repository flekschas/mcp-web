import { mcpWeb } from "../mcp.js";
import { state } from "../state.svelte.js";
import type { Move } from "../types.js";

/**
 * Query the AI agent to suggest the next moves for the human player.
 *
 * @returns The suggestions for the next moves.
 */
export async function querySuggestMoves() {
  try {
    state.aiThinking = true;
    state.gameMessage = 'AI is analyzing your position...';

    if (state.gameState.currentTurn !== 'white') {
      state.gameMessage = "It's not your turn!";
      return [];
    }

    if (state.allValidMoves.length === 0) {
      state.gameMessage = 'You have no legal moves - AI wins!';
      return [];
    }

    const prompt = `Analyze the current position and suggest 1-3 of the best moves for the white player (human). For each suggested move, explain why it's pros and cons, and what it could means for the game. Consider: capturing pieces, advancing toward promotion, protecting pieces, and controlling the center.`;

    const suggestions: Array<{move: Move; explanation: string}> = [];

    const queryStream = mcpWeb.query({
      prompt,
      context: [
        { name: 'game_state', value: state.gameState, description: 'The current game state' }
      ]
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
