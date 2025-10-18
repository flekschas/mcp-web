// Re-export all types
export type { GameState, Move, PieceType, Position } from './types.js';
export {
  BLACK_PIECE,
  BLACK_QUEEN,
  BOARD_SIZE,
  EMPTY,
  RED_PIECE,
  RED_QUEEN,
} from './types.js';

// Re-export all game logic functions
export {
  boardToAscii,
  canPieceMoveTo,
  checkGameStatus,
  createInitialBoard,
  createInitialState,
  getLegalMoves,
  isBlack,
  isCaptureMove,
  isDarkSquare,
  isOpponentPiece,
  isQueen,
  isRed,
  isValidPosition,
  makeMove,
} from './game-logic.js';

// Re-export MCP configuration
export { MCP_WEB_CONFIG, PORTS } from './mcp-config.js';
