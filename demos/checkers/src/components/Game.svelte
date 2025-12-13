<script lang="ts">
  import { queryAIForMove } from '../queries/ai-next-move.js';
  import { state } from '../state.svelte.js';
  import Board from './Board.svelte';
  import StatusBar from './StatusBar.svelte';

  const currentTurn = $derived(state.gameState.currentTurn);
  const gameStatus = $derived(state.gameState.gameStatus);
  const lastMove = $derived(state.gameState.moveHistory.at(-1));
  const gameMessage = $derived.by(() => {
    if (lastMove) {
      const player =
        lastMove.numCapturedPieces > 0
          ? `${currentTurn === 'white' ? 'AI' : 'You'} captured a piece!`
          : `${currentTurn === 'white' ? 'AI' : 'You'} moved`;
      return `${player}: (${lastMove.from.row},${lastMove.from.col}) → (${lastMove.to.row},${lastMove.to.col})`;
    }
    return '';
  });

  // Update state.gameMessage when it changes
  $effect(() => {
    state.gameMessage = gameMessage;
  });

  // Trigger AI move when it's black's turn
  $effect(() => {
    if (
      currentTurn === 'black' &&
      gameStatus === 'playing' &&
      !state.aiThinking
    ) {
      // Small delay to allow UI to update
      setTimeout(() => queryAIForMove(), 500);
    }
  });
</script>

<div class="flex flex-col items-center space-y-1">
  <div class="text-lg font-semibold bg-[#C99DA3] shadow-[inset_0_-6px_4px_-4px_rgba(0,0,0,0.33)] text-black px-2 py-1 rounded-t">
    Black: AI
  </div>
  <Board />
  <div class="text-lg font-semibold bg-[#C99DA3] shadow-[inset_0_6px_4px_-4px_rgba(0,0,0,0.33)] text-white px-2 py-1 rounded-b">
    White: You
  </div>
</div>

<div class="w-full lg:w-80">
  <StatusBar />
</div>
