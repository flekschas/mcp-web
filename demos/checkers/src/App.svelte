<script lang="ts">
  import { onMount } from 'svelte';
  import Game from './components/Game.svelte';
  import { mcpWeb } from './mcp.js';
  import { state as gameState } from './state.svelte.js';

  let connectionStatus = $state('connecting');
  let mcpConnection = $state(false);

  onMount(async () => {
    try {
      // Connect to MCP bridge
      await mcpWeb.connect();
      mcpConnection = mcpWeb.isConnected();
      connectionStatus = mcpConnection ? 'connected' : 'disconnected';

      console.log('MCP connected:', mcpConnection);
      console.log('Game initialized');
    } catch (error) {
      console.error('Failed to connect to MCP:', error);
      connectionStatus = 'error';
    }
  });

  const gameOver = $derived(gameState.gameState.gameStatus !== 'playing');
</script>

<main class="w-full min-h-screen">
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <header class="text-center mb-8">
      <h1 class="text-4xl font-bold mb-2">Spanish Checkers</h1>
      <p class="text-gray-400">Play against AI</p>

      <!-- Connection Status -->
      <div class="mt-4 flex justify-center items-center space-x-2">
        <div
          class="w-3 h-3 rounded-full"
          class:bg-green-500={connectionStatus === 'connected'}
          class:bg-yellow-500={connectionStatus === 'connecting'}
          class:bg-red-500={connectionStatus === 'error' ||
            connectionStatus === 'disconnected'}
        ></div>
        <span class="text-sm text-gray-400">
          {#if connectionStatus === 'connected'}
            Connected to MCP-Web Bridge
          {:else if connectionStatus === 'connecting'}
            Connecting to MCP-Web Bridge...
          {:else if connectionStatus === 'error'}
            Connection Error
          {:else}
            Disconnected
          {/if}
        </span>
      </div>
    </header>

    <!-- Game Layout -->
    <div class="flex flex-col lg:flex-row justify-center items-start gap-8">
      <Game />

      {#if !mcpConnection}
        <div class="mt-4 bg-red-900 border border-red-700 p-4 rounded-lg">
          <h3 class="font-bold text-red-200 mb-2">⚠️ Not Connected</h3>
          <p class="text-red-300 text-sm">
            Make sure the MCP-Web bridge is running on localhost:3001 and the agent
            is running on localhost:8000.
          </p>
          <p class="text-red-300 text-sm mt-2">
            You can play locally, but AI queries will not work.
          </p>
        </div>
      {/if}

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
    <footer class="text-center mt-12 text-gray-500 text-sm">
      <p>
        This demo showcases MCP-Web's frontend-triggered LLM queries.
      </p>
    </footer>
  </div>
</main>
