<script lang="ts">
  import { state } from '../state.svelte.js';
  import { resetGame } from '../actions/reset-game.js';

  const capturedWhite = $derived(state.gameState.capturedPieces.white);
  const capturedBlack = $derived(state.gameState.capturedPieces.black);
  const currentTurn = $derived(state.gameState.currentTurn);
  const gameStatus = $derived(state.gameState.gameStatus);
  const moveCount = $derived(state.gameState.moveHistory.length);
</script>

<div class="bg-gray-800 text-white p-4 rounded-lg space-y-4">
  <!-- Game Status -->
  <div class="text-center">
    <h2 class="text-xl font-bold mb-2">Checkers Game</h2>
    {#if gameStatus === 'playing'}
      <p class="text-lg">
        {#if state.aiThinking}
          <span class="text-yellow-400">🤖 AI is thinking...</span>
        {:else if currentTurn === 'white'}
          <span class="text-red-400">Your turn (white)</span>
        {:else}
          <span class="text-blue-400">AI's turn (Black)</span>
        {/if}
      </p>
    {:else if gameStatus === 'white_wins'}
      <p class="text-green-400 text-xl font-bold">🎉 You Win!</p>
    {:else if gameStatus === 'black_wins'}
      <p class="text-red-400 text-xl font-bold">🤖 AI Wins!</p>
    {:else if gameStatus === 'draw'}
      <p class="text-yellow-400 text-xl font-bold">🤝 Draw!</p>
    {/if}
  </div>

  <!-- Game Info -->
  <div class="grid grid-cols-2 gap-4 text-sm">
    <div class="text-center">
      <div class="text-gray-400">Moves Made</div>
      <div class="text-white font-semibold">{moveCount}</div>
    </div>
    <div class="text-center">
      <div class="text-gray-400">Captured</div>
      <div class="text-white font-semibold">
        <span class="text-red-400">{capturedBlack}</span> -
        <span class="text-blue-400">{capturedWhite}</span>
      </div>
    </div>
  </div>

  <!-- Message Area -->
  {#if state.gameMessage}
    <div class="bg-gray-700 p-3 rounded text-center text-sm">
      {state.gameMessage}
    </div>
  {/if}

  <!-- Controls -->
  <div class="text-center">
    <button
      class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white font-semibold transition-colors"
      onclick={resetGame}
    >
      New Game
    </button>
  </div>

  <!-- Game Rules -->
  <div class="text-xs text-gray-400 space-y-1">
    <div class="font-semibold">Rules:</div>
    <div>• You play as white (bottom), AI plays as black (top)</div>
    <div>• Click piece to select, then click destination</div>
    <div>• Captures are mandatory</div>
    <div>• Reach opposite end to become a queen</div>
  </div>
</div>
