<script lang="ts">
  import { onMount } from 'svelte';
  import Game from './components/Game.svelte';
  import { mcpWeb } from './mcp.js';
  import { state as gameState } from './state.svelte.js';

  let connectionStatus = $state('connecting');
  let mcpConnection = $state(false);
  let showConfigModal = $state(false);
  let copySuccess = $state(false);

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

  function toggleConfigModal() {
    showConfigModal = !showConfigModal;
    copySuccess = false;
  }

  async function copyToClipboard() {
    try {
      const configJson = JSON.stringify(
        { mcpServers: mcpWeb.mcpConfig },
        null,
        2
      );
      await navigator.clipboard.writeText(configJson);
      copySuccess = true;
      setTimeout(() => {
        copySuccess = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }
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
        <button
          onclick={toggleConfigModal}
          class="w-5 h-5 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-xs text-gray-300 transition-colors cursor-pointer"
          title="Show MCP configuration"
          aria-label="Show MCP configuration"
        >
          ?
        </button>
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

  <!-- MCP Configuration Modal -->
  {#if showConfigModal}
    <div
      class="fixed inset-0 bg-yellow-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="button"
      tabindex="0"
      onclick={toggleConfigModal}
      onkeydown={(e) => e.key === 'Escape' && toggleConfigModal()}
    >
      <div
        class="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabindex="-1"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
      >
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <h2 id="modal-title" class="text-2xl font-bold text-white">MCP Client Configuration</h2>
            <button
              onclick={toggleConfigModal}
              class="text-gray-400 hover:text-white text-2xl leading-none"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          <div class="space-y-4">
            <p class="text-gray-300">
              To interact this game via an AI host app like Claude Desktop, use the following configuration:
            </p>

            <div class="bg-gray-900 rounded p-4 relative">
              <button
                onclick={copyToClipboard}
                class="absolute top-2 right-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                {copySuccess ? '✓ Copied!' : 'Copy'}
              </button>
              <pre class="text-sm text-gray-300 overflow-x-auto pr-20"><code>{JSON.stringify({ mcpServers: mcpWeb.mcpConfig }, null, 2)}</code></pre>
            </div>

            <div class="pt-4">
              <p class="text-sm text-gray-400">
                Once configured, your AI host app will be able to interact with this checkers game through the MCP protocol.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</main>
