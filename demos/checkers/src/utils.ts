import { BLACK_PIECE, BOARD_SIZE, EMPTY, WHITE_PIECE } from './constants.js';
import type { GameState, PieceType } from './types.js';

export const createInitialBoard = (): PieceType[][] => {
  const board = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(EMPTY)) as PieceType[][];

  // Place white pieces (human) on bottom rows (5, 6, 7)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        // Only on dark squares
        board[row][col] = WHITE_PIECE;
      }
    }
  }

  // Place black pieces (AI) on top rows (0, 1, 2)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        // Only on dark squares
        board[row][col] = BLACK_PIECE;
      }
    }
  }

  return board;
}

export const createInitialGameState = (): GameState => ({
  board: createInitialBoard(),
  currentTurn: 'white',
  moveHistory: [],
  capturedPieces: { white: 0, black: 0 },
  gameStatus: 'playing',
});

export const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};
