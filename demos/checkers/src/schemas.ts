import { z } from 'zod';
import { BOARD_SIZE } from './constants.js';

export const PlayerSchema = z.enum(['white', 'black']).describe('The players');

export const PositionSchema = z.object({
  row: z.number().describe('Row number (0=top/AI side, 7=bottom/human side)').refine(n => n >= 0 && n <= BOARD_SIZE - 1, { message: `Row must be between 0 and ${BOARD_SIZE - 1}` }),
  col: z.number().describe('Column number').refine(n => n >= 0 && n <= BOARD_SIZE - 1, { message: `Column must be between 0 and ${BOARD_SIZE - 1}` })
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
  id: z.string().describe('Unique game identifier'),
  board: z.array(z.array(z.enum([' ', 'w', 'W', 'b', 'B'])).length(BOARD_SIZE)).length(BOARD_SIZE).describe('8x8 board: " "=empty, w=white, W=white queen, b=black, B=black queen'),
  currentTurn: PlayerSchema.describe('The player whose turn it is'),
  moveHistory: z.array(MoveWithStatsSchema).describe('All moves made in the game'),
  capturedPieces: z.object({
    white: z.number().describe('Number of white pieces captured'),
    black: z.number().describe('Number of black pieces captured')
  }),
  gameStatus: z.enum(['playing', 'white_wins', 'black_wins', 'draw']).describe('Current game status')
});
