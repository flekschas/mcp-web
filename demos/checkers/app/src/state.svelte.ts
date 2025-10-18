import { addStateTool } from '@mcp-web/svelte';
import type { GameState } from 'checkers-shared';
import { createInitialState } from 'checkers-shared';
import { z } from 'zod';
import { mcpWeb } from './mcp.js';

// Position schema
const positionSchema = z.object({
  row: z.number().min(0).max(7).describe('Row number (0=top/AI side, 7=bottom/human side)'),
  col: z.number().min(0).max(7).describe('Column number')
});

// Move schema
const moveSchema = z.object({
  from: positionSchema.describe('Starting position'),
  to: positionSchema.describe('Destination position')
});

// Game state schema
const gameStateSchema = z.object({
  board: z.array(z.array(z.number())).describe('8x8 board: 0=empty, 1=red, 2=red queen, 3=black, 4=black queen'),
  currentTurn: z.enum(['red', 'black']).describe('Whose turn it is'),
  moveHistory: z.array(moveSchema).describe('All moves made in the game'),
  capturedPieces: z.object({
    red: z.number().describe('Number of red pieces captured'),
    black: z.number().describe('Number of black pieces captured')
  }),
  gameStatus: z.enum(['playing', 'red_wins', 'black_wins', 'draw']).describe('Current game status')
});

// Reactive state using Svelte 5 runes
let gameState = $state<GameState>(createInitialState());
let aiThinking = $state(false);
let gameMessage = $state('');

// Export as object to allow mutation
export const state = {
  get gameState() { return gameState; },
  set gameState(value) { gameState = value; },
  get aiThinking() { return aiThinking; },
  set aiThinking(value) { aiThinking = value; },
  get gameMessage() { return gameMessage; },
  set gameMessage(value) { gameMessage = value; }
};

// Expose game state to AI using Svelte integration
// Use a getter function to avoid capturing initial value
addStateTool({
  mcp: mcpWeb,
  name: 'gameState',
  description: 'Current game state including board, turn, and move history',
  get state() { return gameState; },
  readOnly: true,  // AI should not directly modify game state
  stateSchema: gameStateSchema
});
