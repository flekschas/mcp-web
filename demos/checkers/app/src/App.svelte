<script lang="ts">
  import { onMount } from 'svelte';
  import Board from './components/Board.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import { mcpWeb, state } from './mcp.js';

  let connectionStatus = 'connecting';
  let mcpConnection = false;

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

  $: gameOver = state.gameState.gameStatus !== 'playing';
</script>

<main class="min-h-screen bg-gray-900 text-white">
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold mb-2">Checkers vs AI</h1>
      <p class="text-gray-400">Powered by MCP Frontend-Triggered Queries</p>

      <!-- Connection Status -->
      <div class="mt-4 flex justify-center items-center space-x-2">
        <div class="w-3 h-3 rounded-full"
             class:bg-green-500={connectionStatus === 'connected'}
             class:bg-yellow-500={connectionStatus === 'connecting'}
             class:bg-red-500={connectionStatus === 'error' || connectionStatus === 'disconnected'}></div>
        <span class="text-sm text-gray-400">
          {#if connectionStatus === 'connected'}
            Connected to MCP Bridge
          {:else if connectionStatus === 'connecting'}
            Connecting to MCP Bridge...
          {:else if connectionStatus === 'error'}
            Connection Error
          {:else}
            Disconnected
          {/if}
        </span>
      </div>
    </div>

    <!-- Game Layout -->
    <div class="flex flex-col lg:flex-row justify-center items-start gap-8">
      <!-- Game Board -->
      <div class="flex flex-col items-center space-y-4">
        <div class="text-lg font-semibold">AI (Black)</div>
        <Board />
        <div class="text-lg font-semibold">You (Red)</div>
      </div>

      <!-- Status Sidebar -->
      <div class="w-full lg:w-80">
        <StatusBar />

        {#if !mcpConnection}
          <div class="mt-4 bg-red-900 border border-red-700 p-4 rounded-lg">
            <h3 class="font-bold text-red-200 mb-2">⚠️ MCP Not Connected</h3>
            <p class="text-red-300 text-sm">
              Make sure the MCP bridge is running on localhost:3001 and the agent is running on localhost:8000.
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
    </div>

    <!-- Footer -->
    <div class="text-center mt-12 text-gray-500 text-sm">
      <p>This demo showcases frontend-triggered queries with the MCP web framework.</p>
      <p>The AI agent receives game context and uses tools to analyze and make moves.</p>
    </div>
  </div>
</main>