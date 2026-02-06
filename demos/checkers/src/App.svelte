<script lang="ts">
  import { onMount } from 'svelte';
  import Game from './components/Game.svelte';
  import ConfigModal from './components/ConfigModal.svelte';
  import { mcpWeb } from './mcp.js';
  import { state as gameState } from './state.svelte.js';
  import H1 from './components/H1.svelte';

  let connectionStatus = $state('connecting');
  let mcpConnection = $state(false);
  let showConfigModal = $state(false);

  onMount(async () => {
    try {
      // Connect to MCP bridge
      await mcpWeb.connect();
      mcpConnection = mcpWeb.connected;
      connectionStatus = mcpConnection ? 'connected' : 'disconnected';

      console.log('MCP connected:', mcpConnection);
      console.log('Game initialized');
    } catch (error) {
      console.error('Failed to connect to MCP:', error);
      connectionStatus = 'error';
    }
  });

  const gameOver = $derived(gameState.gameState.gameStatus !== 'playing');

  function toggleConfigModal() {
    showConfigModal = !showConfigModal;
  }
</script>

<main class="w-full min-h-screen">
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <header class="text-center mb-8">
      <H1 />

      <div class="flex justify-center items-center gap-2">
        <p>Play against AI via</p>

        <button
          class="flex justify-center items-center gap-1 rounded outline outline-[#C99DA3]/20 hover:outline-[#C99DA3]/60 hover:bg-[#C99DA3]/10 px-1.5 cursor-pointer"
          onclick={toggleConfigModal}
        >
          <div
            class="w-2 h-2 rounded-full"
            class:bg-green-500={connectionStatus === 'connected'}
            class:bg-yellow-500={connectionStatus === 'connecting'}
            class:bg-red-500={connectionStatus === 'error' ||
              connectionStatus === 'disconnected'}
          ></div>
          MCP-Web
        </button>
      </div>
    </header>

    <!-- Game Layout -->
    <div class="flex flex-col lg:flex-row justify-center items-center gap-8">
      <Game />

      {#if gameOver}
        <div class="mt-4 bg-blue-900 border border-blue-700 p-4 rounded-lg">
          <h3 class="font-bold text-blue-200 mb-2">🎮 Game Over</h3>
          <p class="text-blue-300 text-sm">
            Click "New Game" to start another round!
          </p>
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <footer class="text-center mt-12 opacity-70 text-sm">
      <p>
        This demo showcases <a href="https://github.com/flekschas/mcp-web" class="wavy" target="_blank">MCP-Web</a> with frontend-triggered LLM queries.
      </p>
    </footer>
  </div>

  <ConfigModal
    isOpen={showConfigModal}
    onClose={toggleConfigModal}
    mcpConnection={mcpConnection}
  />
</main>
