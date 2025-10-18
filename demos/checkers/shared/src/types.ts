export interface Position {
  row: number; // 0-7 (0=top/AI side, 7=bottom/human side)
  col: number; // 0-7
}

export interface Move {
  from: Position;
  to: Position;
  // Captured pieces computed during move execution by checking jump path
  // For multi-jumps, this is the final destination
}

export interface GameState {
  board: PieceType[][]; // 8x8 grid: 0=empty, 1=red, 2=red queen, 3=black, 4=black queen
  currentTurn: 'red' | 'black';
  moveHistory: Move[];
  capturedPieces: { red: number; black: number };
  gameStatus: 'playing' | 'red_wins' | 'black_wins' | 'draw';
}

export const BOARD_SIZE = 8;
export const EMPTY = 0;
export const RED_PIECE = 1;
export const RED_QUEEN = 2;
export const BLACK_PIECE = 3;
export const BLACK_QUEEN = 4;

export type PieceType = typeof EMPTY | typeof RED_PIECE | typeof RED_QUEEN | typeof BLACK_PIECE | typeof BLACK_QUEEN;