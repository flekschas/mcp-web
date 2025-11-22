import {
  BLACK_PIECE,
  BLACK_QUEEN,
  BOARD_SIZE,
  EMPTY,
  WHITE_PIECE,
  WHITE_QUEEN,
} from './constants.js';
import type { GameState, Move, PieceType, Position } from './types.js';

export function createInitialBoard(): PieceType[][] {
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

export function isValidPosition(pos: Position): boolean {
  return (
    pos.row >= 0 &&
    pos.row < BOARD_SIZE &&
    pos.col >= 0 &&
    pos.col < BOARD_SIZE
  );
}

export function isDarkSquare(pos: Position): boolean {
  return (pos.row + pos.col) % 2 === 1;
}

export function isWhite(piece: PieceType): boolean {
  return piece === WHITE_PIECE || piece === WHITE_QUEEN;
}

export function isBlack(piece: PieceType): boolean {
  return piece === BLACK_PIECE || piece === BLACK_QUEEN;
}

export function isQueen(piece: PieceType): boolean {
  return piece === WHITE_QUEEN || piece === BLACK_QUEEN;
}

export function isOpponentPiece(
  piece: PieceType,
  player: 'white' | 'black'
): boolean {
  if (player === 'white') {
    return isBlack(piece);
  }
  return isWhite(piece);
}

export function canPieceMoveTo(
  board: PieceType[][],
  from: Position,
  to: Position,
  player: 'white' | 'black'
): boolean {
  if (!isValidPosition(from) || !isValidPosition(to)) return false;
  if (!isDarkSquare(from) || !isDarkSquare(to)) return false;
  if (board[to.row][to.col] !== EMPTY) return false;

  const piece = board[from.row][from.col];
  if (piece === EMPTY) return false;

  // Check if piece belongs to current player
  if (
    (player === 'white' && !isWhite(piece)) ||
    (player === 'black' && !isBlack(piece))
  ) {
    return false;
  }

  const rowDiff = to.row - from.row;
  const colDiff = to.col - from.col;
  const isPieceQueen = isQueen(piece);

  // Regular move (one diagonal step)
  if (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 1) {
    // Regular pieces can only move forward
    if (!isPieceQueen) {
      if (player === 'white' && rowDiff > 0) return false; // white moves up (decreasing row)
      if (player === 'black' && rowDiff < 0) return false; // Black moves down (increasing row)
    }
    return true;
  }

  // Jump move (two diagonal steps with capture)
  if (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 2) {
    const middleRow = from.row + rowDiff / 2;
    const middleCol = from.col + colDiff / 2;
    const middlePiece = board[middleRow][middleCol];

    // Must jump over opponent piece
    if (!isOpponentPiece(middlePiece, player)) return false;

    // Regular pieces can only jump forward
    if (!isPieceQueen) {
      if (player === 'white' && rowDiff > 0) return false;
      if (player === 'black' && rowDiff < 0) return false;
    }

    return true;
  }

  // Queens can move/jump multiple squares diagonally
  if (isPieceQueen && Math.abs(rowDiff) === Math.abs(colDiff)) {
    const stepRow = rowDiff > 0 ? 1 : -1;
    const stepCol = colDiff > 0 ? 1 : -1;
    let opponentCount = 0;

    // Check diagonal path
    for (let i = 1; i < Math.abs(rowDiff); i++) {
      const checkRow = from.row + i * stepRow;
      const checkCol = from.col + i * stepCol;
      const checkPiece = board[checkRow][checkCol];

      if (checkPiece !== EMPTY) {
        if (isOpponentPiece(checkPiece, player)) {
          opponentCount++;
          if (opponentCount > 1) return false; // Can't jump over multiple pieces
        } else {
          return false; // Can't jump over own piece
        }
      }
    }

    // Valid queen move: either no captures (regular move) or exactly one capture (jump)
    return opponentCount <= 1;
  }

  return false;
}

export function getLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const { board, currentTurn } = state;

  // First, check for mandatory captures
  const captureMoves: Move[] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece === EMPTY) continue;

      if (
        (currentTurn === 'white' && isWhite(piece)) ||
        (currentTurn === 'black' && isBlack(piece))
      ) {
        const from = { row, col };

        // Check all possible moves for this piece
        for (let toRow = 0; toRow < BOARD_SIZE; toRow++) {
          for (let toCol = 0; toCol < BOARD_SIZE; toCol++) {
            const to = { row: toRow, col: toCol };

            if (canPieceMoveTo(board, from, to, currentTurn)) {
              const move = { from, to };

              // Check if this is a capture move
              if (isCaptureMove(board, move)) {
                captureMoves.push(move);
              } else if (captureMoves.length === 0) {
                // Only add non-capture moves if no captures available
                moves.push(move);
              }
            }
          }
        }
      }
    }
  }

  // If captures are available, only return captures (mandatory)
  return captureMoves.length > 0 ? captureMoves : moves;
}

export function isCaptureMove(board: PieceType[][], move: Move): boolean {
  const { from, to } = move;
  const rowDiff = Math.abs(to.row - from.row);
  const colDiff = Math.abs(to.col - from.col);

  if (rowDiff !== colDiff) return false; // Not diagonal
  if (rowDiff < 2) return false; // Single step, not a jump

  const stepRow = to.row > from.row ? 1 : -1;
  const stepCol = to.col > from.col ? 1 : -1;

  // Check if there are opponent pieces to capture along the path
  for (let i = 1; i < rowDiff; i++) {
    const checkRow = from.row + i * stepRow;
    const checkCol = from.col + i * stepCol;
    const piece = board[checkRow][checkCol];

    if (piece !== EMPTY) {
      return true; // Found a piece to capture
    }
  }

  return false;
}

export function makeMove(state: GameState, move: Move): GameState {
  const newBoard = state.board.map((row) => [...row]);
  const { from, to } = move;

  const piece = newBoard[from.row][from.col];
  newBoard[from.row][from.col] = EMPTY;

  // Promote to queen if reaching opposite end
  let finalPiece = piece;
  if (piece === WHITE_PIECE && to.row === 0) finalPiece = WHITE_QUEEN;
  if (piece === BLACK_PIECE && to.row === 7) finalPiece = BLACK_QUEEN;

  newBoard[to.row][to.col] = finalPiece;

  // Handle captures
  const newCapturedPieces = { ...state.capturedPieces };
  if (isCaptureMove(state.board, move)) {
    const stepRow = to.row > from.row ? 1 : -1;
    const stepCol = to.col > from.col ? 1 : -1;
    const distance = Math.abs(to.row - from.row);

    for (let i = 1; i < distance; i++) {
      const captureRow = from.row + i * stepRow;
      const captureCol = from.col + i * stepCol;
      const capturedPiece = newBoard[captureRow][captureCol];

      if (capturedPiece !== EMPTY) {
        newBoard[captureRow][captureCol] = EMPTY;

        if (isWhite(capturedPiece)) {
          newCapturedPieces.white++;
        } else if (isBlack(capturedPiece)) {
          newCapturedPieces.black++;
        }
      }
    }
  }

  const moveWithStats = {
    ...move,
    player: state.currentTurn,
    numCapturedPieces: newCapturedPieces[state.currentTurn] - state.capturedPieces[state.currentTurn]
  };

  const newState: GameState = {
    board: newBoard,
    currentTurn: state.currentTurn === 'white' ? 'black' : 'white',
    moveHistory: [...state.moveHistory, moveWithStats],
    capturedPieces: newCapturedPieces,
    gameStatus: 'playing',
  };

  // Check for game end
  newState.gameStatus = checkGameStatus(newState);

  return newState;
}

export function checkGameStatus(
  state: GameState
): 'playing' | 'white_wins' | 'black_wins' | 'draw' {
  const legalMoves = getLegalMoves(state);

  if (legalMoves.length === 0) {
    // Current player has no moves - they lose
    return state.currentTurn === 'white' ? 'black_wins' : 'white_wins';
  }

  // Count remaining pieces
  let whitePieces = 0;
  let blackPieces = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = state.board[row][col];
      if (isWhite(piece)) whitePieces++;
      if (isBlack(piece)) blackPieces++;
    }
  }

  if (whitePieces === 0) return 'black_wins';
  if (blackPieces === 0) return 'white_wins';

  // Check for draw (simplified - could add more draw conditions)
  if (state.moveHistory.length > 200) return 'draw';

  return 'playing';
}

export function boardToAscii(board: PieceType[][]): string {
  const pieces: Record<number, string> = {
    [EMPTY]: ' ',
    [WHITE_PIECE]: 'r',
    [WHITE_QUEEN]: 'R',
    [BLACK_PIECE]: 'b',
    [BLACK_QUEEN]: 'B',
  };

  let result = '  a b c d e f g h\n';

  for (let row = 0; row < BOARD_SIZE; row++) {
    result += `${8 - row} `;
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      const char = pieces[piece];

      if ((row + col) % 2 === 0) {
        result += '■ '; // Light square
      } else {
        result += `${char} `;
      }
    }
    result += `${8 - row}\n`;
  }

  result += '  a b c d e f g h\n';
  return result;
}
