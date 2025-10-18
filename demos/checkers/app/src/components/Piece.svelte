<script lang="ts">
  import type { PieceType } from 'checkers-shared';
  import { RED_PIECE, RED_QUEEN, BLACK_PIECE, BLACK_QUEEN } from 'checkers-shared';

  export let piece: PieceType;

  $: isRed = piece === RED_PIECE || piece === RED_QUEEN;
  $: isBlack = piece === BLACK_PIECE || piece === BLACK_QUEEN;
  $: isQueen = piece === RED_QUEEN || piece === BLACK_QUEEN;
</script>

{#if piece !== 0}
  <div class="piece" class:red={isRed} class:black={isBlack} class:queen={isQueen}>
    {#if isQueen}
      ♕
    {/if}
  </div>
{/if}