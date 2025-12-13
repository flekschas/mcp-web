import { state } from '../state.svelte';
import { createNewGameState } from '../utils.js';

export function resetGame() {
  Object.assign(state.gameState, createNewGameState());
  state.aiThinking = false;
  state.gameMessage = 'New game started. You play as red (bottom).';
}
