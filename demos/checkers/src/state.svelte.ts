
import { INITIAL_GAME_STATE } from './constants';
import { getLegalMoves } from './game-logic';
import type { GameState } from './types';

let gameState = $state<GameState>(INITIAL_GAME_STATE);
let aiThinking = $state(false);
let gameMessage = $state('');
let activeQueryUuid = $state<string | undefined>(undefined);
const allValidMoves = $derived(getLegalMoves(gameState));

// Export as object to allow mutation when imported by other files
export const state = {
  get gameState() { return gameState; },
  set gameState(value) {
    if (aiThinking) {
      console.error('Cannot set game state while AI is thinking');
      return;
    }
    gameState = value;
  },
  get aiThinking() { return aiThinking; },
  set aiThinking(value) { aiThinking = value; },
  get gameMessage() { return gameMessage; },
  set gameMessage(value) { gameMessage = value; },
  get allValidMoves() { return allValidMoves; },
  get activeQueryUuid() { return activeQueryUuid; },
  set activeQueryUuid(value) { activeQueryUuid = value; },
};
