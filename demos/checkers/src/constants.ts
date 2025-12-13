export const BOARD_SIZE = 8;
export const EMPTY = 0;
export const WHITE_PIECE = 1;
export const WHITE_QUEEN = 2;
export const BLACK_PIECE = 3;
export const BLACK_QUEEN = 4;

export const ROWS = Array.from({ length: BOARD_SIZE }, (_, i) => i);
export const COLS = Array.from({ length: BOARD_SIZE }, (_, i) => i);
