import { z } from 'zod';
import { BOARD_SIZE } from './constants.js';


export const PlayerSchema = z.enum(['white', 'black']).describe('The players');

export const PositionSchema = z.object({
  row: z.number().min(0).max(BOARD_SIZE - 1).describe('Row number (0=top/AI side, 7=bottom/human side)'),
  col: z.number().min(0).max(BOARD_SIZE - 1).describe('Column number')
});

export const MoveSchema = z.object({
  from: PositionSchema.describe('Starting position'),
  to: PositionSchema.describe('Destination position')
}).describe('A move from one position to another');

export const MoveWithStatsSchema = MoveSchema.extend({
  player: PlayerSchema.describe('Player who made the move'),
  numCapturedPieces: z.number().describe('Number of pieces captured by the player'),
}).describe('A move from one position to another with the number of pieces captured by the player');

export const GameStateSchema = z.object({
  board: z.array(z.array(z.number().min(0).max(4)).length(BOARD_SIZE)).length(BOARD_SIZE).describe('8x8 board: 0=empty, 1=white, 2=white queen, 3=black, 4=black queen'),
  currentTurn: PlayerSchema.describe('The player whose turn it is'),
  moveHistory: z.array(MoveWithStatsSchema).describe('All moves made in the game'),
  capturedPieces: z.object({
    white: z.number().describe('Number of white pieces captured'),
    black: z.number().describe('Number of black pieces captured')
  }),
  gameStatus: z.enum(['playing', 'white_wins', 'black_wins', 'draw']).describe('Current game status')
});
