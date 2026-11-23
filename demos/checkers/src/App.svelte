<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Game from './components/Game.svelte';
  import ConfigModal from './components/ConfigModal.svelte';
  import { mcpWeb, gameName, releaseGameName } from './mcp-tools.js';
  import { state as gameState } from './state.svelte.js';
  import H1 from './components/H1.svelte';
  import config from '../mcp-web.config.js';

  let connectionStatus = $state('connecting');
  let mcpConnection = $state(false);
  let showConfigModal = $state(false);

  // Only the last 10 minutes before an idle disconnect are counted down.
  const COUNTDOWN_WINDOW_MS = 10 * 60 * 1000;
  let now = $state(Date.now());

  onMount(() => {
    const unsubscribe = mcpWeb.onConnectionStateChange(() => {
      mcpConnection = mcpWeb.connected;
      if (mcpWeb.connected) connectionStatus = 'connected';
      else if (mcpWeb.idle) connectionStatus = 'idle';
      else connectionStatus = mcpWeb.connecting ? 'connecting' : 'disconnected';
    });
    // The countdown only ticks when a timeout is configured.
    const interval =
      config.idleTimeoutMs !== undefined
        ? setInterval(() => (now = Date.now()), 1000)
        : undefined;

    mcpWeb.connect().then(
      () => console.log(`${gameName} initialized`),
      (error) => {
        console.error('Failed to connect to MCP:', error);
        connectionStatus = 'error';
      },
    );

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  });

  onDestroy(() => {
    releaseGameName();
  });

  // Time left until the page disconnects for lack of use.
  const idleLabel = $derived.by(() => {
    if (connectionStatus === 'idle') return 'Idle';
    const disconnectAt = mcpWeb.idleDisconnectAt;
    if (disconnectAt === undefined) return '';
    const remainingMs = Math.max(0, disconnectAt - now);
    if (remainingMs > COUNTDOWN_WINDOW_MS) return '';
    const seconds = Math.ceil(remainingMs / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
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
        <p>{gameName} &mdash; Play against AI via</p>

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
            class:bg-zinc-500={connectionStatus === 'idle'}
          ></div>
          MCP-Web
          {#if idleLabel}
            <span class="tabular-nums opacity-60">{idleLabel}</span>
          {/if}
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
