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

<div class="flex flex-col items-center space-y-4">
  <div class="text-lg font-semibold">AI (Black)</div>
  <Board />
  <div class="text-lg font-semibold">You (white)</div>
</div>

<div class="w-full lg:w-80">
  <StatusBar />
</div>
