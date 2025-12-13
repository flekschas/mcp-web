<script lang="ts">
  import { state } from '../state.svelte.js';
  import { resetGame } from '../actions/reset-game.js';
  import DotDotDot from './DotDotDot.svelte';

  const capturedWhite = $derived(state.gameState.capturedPieces.white);
  const capturedBlack = $derived(state.gameState.capturedPieces.black);
  const currentTurn = $derived(state.gameState.currentTurn);
  const gameStatus = $derived(state.gameState.gameStatus);
  const moveCount = $derived(state.gameState.moveHistory.length);
</script>

<div class="bg-[#240115] p-4 rounded-lg space-y-4 lg:h-96">
  <!-- Game Status -->
  <div class="text-center">
    <h2 class="text-xl font-bold mb-2">Status</h2>
    {#if gameStatus === 'playing'}
      <p class="text-lg">
        {#if state.aiThinking}
          <span class="text-white">🤖 AI is thinking<DotDotDot /></span>
        {:else if currentTurn === 'white'}
          <span class="text-white">It's Your Turn!</span>
        {:else}
          <span class="opacity-50">AI's Turn</span>
        {/if}
      </p>
    {:else if gameStatus === 'white_wins'}
      <p class="text-green-500 text-xl font-bold">🎉 You Win!</p>
    {:else if gameStatus === 'black_wins'}
      <p class="text-green-500 text-xl font-bold">🤖 AI Wins!</p>
    {:else if gameStatus === 'draw'}
      <p class="text-green-500 text-xl font-bold">🤝 Draw!</p>
    {/if}
  </div>

  <!-- Game Info -->
  <div class="grid grid-cols-2 gap-4 text-sm">
    <div class="text-center">
      <div>Moves Made:</div>
      <div class="mt-1 py-1 font-semibold">{moveCount}</div>
    </div>
    <div class="text-center">
      <div>Captured:</div>
      <div class="mt-1 flex items-center justify-center font-semibold">
        <span class="flex items-center gap-x-1 text-[#240115] bg-[#C99DA3] border-t border-b border-l border-[#C99DA3] px-2 py-1 rounded-l">{capturedWhite} <span class="text-xs opacity-50">(White)</span></span>
        <span class="flex items-center gap-x-1 border-t border-b border-r border-[#C99DA3] px-2 py-1 rounded-r">{capturedBlack} <span class="text-xs opacity-50">(Black)</span></span>
      </div>
    </div>
  </div>

  <!-- Message Area -->
  {#if state.gameMessage}
    <div class="bg-[#C99DA3]/20 p-3 rounded text-center text-sm">
      {state.gameMessage}
    </div>
  {/if}

  <!-- Controls -->
  <div class="text-center">
    <button
      class="border border-[#C99DA3]/20 hover:bg-green-500 hover:border-green-500 hover:text-[#240115] px-4 py-2 rounded font-semibold transition-colors cursor-pointer"
      onclick={resetGame}
    >
      New Game
    </button>
  </div>

  <!-- Game Rules -->
  <div class="text-xs opacity-50 space-y-1">
    <div class="font-semibold">Rules:</div>
    <div>• You play as white (bottom), AI plays as black (top)</div>
    <div>• Click piece to select, then click destination</div>
    <div>• Captures are mandatory</div>
    <div>• Reach opposite end to become a queen</div>
  </div>
</div>
