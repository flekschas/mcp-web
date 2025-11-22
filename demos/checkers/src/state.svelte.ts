
import { INITIAL_GAME_STATE } from './constants';
import { getLegalMoves } from './game-logic';
import type { GameState } from './types';

let gameState = $state<GameState>(INITIAL_GAME_STATE);
let aiThinking = $state(false);
let gameMessage = $state('');
const allValidMoves = $derived(getLegalMoves(gameState));

// Export as object to allow mutation when imported by other files
export const state = {
  get gameState() { return gameState; },
  set gameState(value) { gameState = value; },
  get aiThinking() { return aiThinking; },
  set aiThinking(value) { aiThinking = value; },
  get gameMessage() { return gameMessage; },
  set gameMessage(value) { gameMessage = value; },
  get allValidMoves() { return allValidMoves; },
};
