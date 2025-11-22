import type { z } from 'zod';
import type { BLACK_PIECE, BLACK_QUEEN, EMPTY, WHITE_PIECE, WHITE_QUEEN } from './constants.js';
import type { GameStateSchema, MoveSchema, PositionSchema } from './schemas.js';

export type PieceType = typeof EMPTY | typeof WHITE_PIECE | typeof WHITE_QUEEN | typeof BLACK_PIECE | typeof BLACK_QUEEN;

export type GameState = Omit<z.infer<typeof GameStateSchema>, 'board'> & { board: PieceType[][] };

export type Move = z.infer<typeof MoveSchema>;

export type Position = z.infer<typeof PositionSchema>;
