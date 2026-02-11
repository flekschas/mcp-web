import { makeMove as applyMove } from "../game-logic.js";
import { state } from "../state.svelte";
import type { Move } from "../types.js";

/**
 * Pure action to make a move in the game.
 * Validates and applies the move if legal.
 * Returns true if the move was successfully applied, false otherwise.
 */
export function makeMove(move: Move): boolean {
  // Validate the move using reactively computed legal moves
  const isLegal = state.allValidMoves.some((m) => {
    const [mFromRow, mFromCol] = m.from;
    const [mToRow, mToCol] = m.to;
    const [moveFromRow, moveFromCol] = move.from;
    const [moveToRow, moveToCol] = move.to;
    return (
      mFromRow === moveFromRow &&
      mFromCol === moveFromCol &&
      mToRow === moveToRow &&
      mToCol === moveToCol
    );
  });

  if (!isLegal) {
    return false;
  }

  // Apply the move
  const newState = applyMove(state.gameState, move);
  Object.assign(state.gameState, newState);

  return true;
}
