<script lang="ts">
  import { onMount } from 'svelte';
  import Game from './components/Game.svelte';
  import { mcpWeb } from './mcp.js';
  import { state as gameState } from './state.svelte.js';
  import H1 from './components/H1.svelte';

  let connectionStatus = $state('connecting');
  let mcpConnection = $state(false);
  let showConfigModal = $state(false);
  let copyConfigSuccess = $state(false);
  let copySweetnessSuccess = $state(false);

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
    copyConfigSuccess = false;
    copySweetnessSuccess = false;
  }

  async function copyConfigToClipboard() {
    try {
      const configJson = JSON.stringify(
        { mcpServers: mcpWeb.mcpConfig },
        null,
        2
      );
      await navigator.clipboard.writeText(configJson);
      copyConfigSuccess = true;
      setTimeout(() => {
        copyConfigSuccess = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

async function copySweetnessToClipboard() {
  try {
    await navigator.clipboard.writeText("please make a really sweet move for me in my checkers game");
    copySweetnessSuccess = true;
    setTimeout(() => {
      copySweetnessSuccess = false;
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
    <footer class="text-center mt-12 opacity-70 text-sm">
      <p>
        This demo showcases <a href="https://github.com/flekschas/mcp-web" class="wavy" target="_blank">MCP-Web</a>'s frontend-triggered LLM queries.
      </p>
    </footer>
  </div>

  <!-- MCP Configuration Modal -->
  {#if showConfigModal}
    <div
      class="fixed inset-0 bg-[#C99DA3]/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="button"
      tabindex="0"
      onclick={toggleConfigModal}
      onkeydown={(e) => e.key === 'Escape' && toggleConfigModal()}
    >
      <div
        class="bg-[#240115] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
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
              class="text-yellow-900 hover:text-white transition-colors text-2xl leading-none cursor-pointer"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          <div class="space-y-4">
            <p class="opacity-70">
              To interact this game via an AI host app like Claude Desktop, use the following configuration:
            </p>

            <div class="border border-[#C99DA3]/20 rounded p-4 relative">
              <button
                onclick={copyConfigToClipboard}
                class="absolute top-2 right-2 px-3 py-1 bg-[#C99DA3]/20 hover:bg-[#C99DA3]/30 hover:text-white text-sm rounded transition-colors cursor-pointer"
              >
                {copyConfigSuccess ? '✓ Copied!' : 'Copy'}
              </button>
              <pre class="text-sm text-gray-300 overflow-x-auto pr-20"><code>{JSON.stringify({ mcpServers: mcpWeb.mcpConfig }, null, 2)}</code></pre>
            </div>

            <p class="opacity-70">
              Once configured, your AI host app will be able to interact with this checkers game through the MCP protocol. E.g., when it's your turn, you can ask Claude to:
            </p>

            <div class="border border-[#C99DA3]/20 rounded p-4 relative">
              <button
                onclick={copySweetnessToClipboard}
                class="absolute top-2 right-2 px-3 py-1 bg-[#C99DA3]/20 hover:bg-[#C99DA3]/30 hover:text-white text-sm rounded transition-colors cursor-pointer"
              >
                {copySweetnessSuccess ? '✓ Sweet!' : 'Copy'}
              </button>
              <pre class="text-sm text-gray-300 overflow-x-auto pr-20"><code>please make a really sweet move for me in my checkers game</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</main>
