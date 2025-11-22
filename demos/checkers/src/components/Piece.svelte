<script lang="ts">
  import {
    WHITE_PIECE,
    WHITE_QUEEN,
    BLACK_PIECE,
    BLACK_QUEEN,
  } from '../constants.js';
  import type { PieceType } from '../types.js';

  const { piece, isSelected } = $props<{
    piece: PieceType;
    isSelected?: boolean;
  }>();

  const isWhite = $derived(piece === WHITE_PIECE || piece === WHITE_QUEEN);
  const isBlack = $derived(piece === BLACK_PIECE || piece === BLACK_QUEEN);
  const isQueen = $derived(piece === WHITE_QUEEN || piece === BLACK_QUEEN);
</script>

{#if piece !== 0}
  <div
    class="w-10 h-10 rounded-full border-b-2 border-x flex items-center justify-center font-bold text-sm shadow-sm"
    class:bg-white={isWhite}
    class:text-yellow-500={isWhite}
    class:border-zinc-300={isWhite}
    class:bg-zinc-800={isBlack}
    class:text-yellow-700={isBlack}
    class:border-black={isBlack}
    class:ring-2={isSelected}
    class:ring-blue-400={isSelected}
  >
    {#if isQueen}
      ♕
    {/if}
  </div>
{/if}
