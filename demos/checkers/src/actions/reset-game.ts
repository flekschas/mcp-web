import { state } from '../state.svelte';
import { createInitialGameState } from '../utils.js';

export function resetGame() {
  Object.assign(state.gameState, createInitialGameState());
  state.aiThinking = false;
  state.gameMessage = 'New game started. You play as red (bottom).';
}
