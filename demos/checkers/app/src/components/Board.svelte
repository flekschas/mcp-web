<script lang="ts">
  import { getLegalMoves, isRed } from 'checkers-shared';
  import type { Move, Position } from 'checkers-shared';
  import { makeHumanMove, state } from '../mcp.js';
  import Piece from './Piece.svelte';

  let selectedPiece: Position | null = null;
  let validMoves: Move[] = [];

  $: board = state.gameState.board;
  $: currentTurn = state.gameState.currentTurn;

  function handleSquareClick(row: number, col: number) {
    const position = { row, col };

    // If clicking on a valid move destination
    if (selectedPiece && validMoves.some(m => m.to.row === row && m.to.col === col)) {
      const move = { from: selectedPiece, to: position };
      if (makeHumanMove(move)) {
        selectedPiece = null;
        validMoves = [];
      }
      return;
    }

    // If clicking on own piece when it's human's turn
    if (currentTurn === 'red' && board[row][col] && isRed(board[row][col])) {
      selectedPiece = position;
      // Calculate valid moves for this piece
      const allLegalMoves = getLegalMoves(state.gameState);
      validMoves = allLegalMoves.filter(m => m.from.row === row && m.from.col === col);
    } else {
      selectedPiece = null;
      validMoves = [];
    }
  }

  function isSelected(row: number, col: number): boolean {
    return selectedPiece?.row === row && selectedPiece?.col === col;
  }

  function isValidMove(row: number, col: number): boolean {
    return validMoves.some(m => m.to.row === row && m.to.col === col);
  }

  function isLightSquare(row: number, col: number): boolean {
    return (row + col) % 2 === 0;
  }
</script>

<div class="grid grid-cols-8 gap-0 border-4 border-amber-900 w-96 h-96">
  {#each Array(8) as _, row}
    {#each Array(8) as _, col}
      <div
        class="board-square"
        class:light={isLightSquare(row, col)}
        class:dark={!isLightSquare(row, col)}
        class:selected={isSelected(row, col)}
        class:valid-move={isValidMove(row, col)}
        on:click={() => handleSquareClick(row, col)}
        role="button"
        tabindex="0"
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleSquareClick(row, col);
          }
        }}
      >
        <Piece piece={board[row][col]} />
      </div>
    {/each}
  {/each}
</div>

<style>
  .board-square:focus {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
  }
</style>
