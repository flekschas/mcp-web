<script lang="ts">
  import { makeMove } from '../actions/make-move.js';
  import { isWhite } from '../game-logic.js';
  import { state as gameState } from '../state.svelte.js';
  import type { Position } from '../types.js';
  import Piece from './Piece.svelte';
  import { ROWS, COLS } from '../constants.js';
  import { cn } from '../utils.js';

  let selectedPiece: Position | null = $state(null);

  const board = $derived(gameState.gameState.board);
  const currentTurn = $derived(gameState.gameState.currentTurn);
  const isHumanTurn = $derived(currentTurn === 'white');
  const validMovesForSelectedPiece = $derived.by(() => {
    if (!selectedPiece) return [];
    return gameState.allValidMoves.filter(
      (move) =>
        move.from.row === selectedPiece!.row &&
        move.from.col === selectedPiece!.col,
    );
  });

  function isSelectable(row: number, col: number): boolean {
    return isHumanTurn && isWhite(board[row][col]);
  }

  function isValidMove(row: number, col: number): boolean {
    return validMovesForSelectedPiece.some(
      (m) => m.to.row === row && m.to.col === col,
    );
  }

  function handleSquareClick(row: number, col: number) {
    if (!isHumanTurn) {
      return;
    }

    const position = { row, col };

    // Piece selection
    if (isWhite(board[row][col])) {
      selectedPiece = position;
      return;
    }

    if (!selectedPiece) return;

    // If clicking on a valid move destination
    if (isValidMove(row, col)) {
      const move = { from: selectedPiece, to: position };
      if (makeMove(move)) {
        selectedPiece = null;
      }
    }
  }

  function isSelected(row: number, col: number): boolean {
    return selectedPiece?.row === row && selectedPiece?.col === col;
  }

  function isLightSquare(row: number, col: number): boolean {
    return (row + col) % 2 === 0;
  }
</script>

<div class="grid grid-cols-8 gap-0 ring-4 ring-neutral-400 bg-neutral-400 w-96 h-96">
  {#each ROWS as row (row)}
    {#each COLS as col (col)}
      <button
        class={cn(
          'w-12 h-12 flex items-center justify-center transition-all',
          isLightSquare(row, col) ? 'bg-yellow-900/40' : 'bg-yellow-800/60',
          isValidMove(row, col) && !isSelected(row, col) ? 'ring-2 ring-green-400' : '',
          isValidMove(row, col) && !isSelected(row, col) ? 'hover:bg-green-200' : '',
          isSelectable(row, col) || isValidMove(row, col) ? 'cursor-pointer' : '',
        )}
        class:bg-yellow-100={isLightSquare(row, col)}
        class:bg-yellow-900={!isLightSquare(row, col)}
        class:ring-2={isValidMove(row, col) && !isSelected(row, col)}
        class:ring-green-400={isValidMove(row, col) && !isSelected(row, col)}
        class:hover:bg-green-200={isValidMove(row, col)}
        onclick={() => handleSquareClick(row, col)}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleSquareClick(row, col);
          }
        }}
        disabled={currentTurn !== 'white' && !isValidMove(row, col)}
      >
        <Piece piece={board[row][col]} isSelected={isSelected(row, col)} />
      </button>
    {/each}
  {/each}
</div>
