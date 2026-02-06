<script lang="ts">
  import { mcpWeb } from '../mcp.js';
  import config from '../../mcp-web.config.js';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    mcpConnection: boolean;
  }

  let { isOpen, onClose, mcpConnection }: Props = $props();

  let copySuccess = $state<'name' | 'url' | 'json' | 'example' | null>(null);
  let activeConfigTab = $state<'remote' | 'stdio'>('remote');

  const serverName = $derived(Object.keys(mcpWeb.remoteMcpConfig)[0]);
  const serverUrl = $derived(mcpWeb.remoteMcpConfig[serverName]?.url);
  const stdioConfig = $derived({ mcpServers: mcpWeb.mcpConfig });
  const stdioConfigStr = $derived(JSON.stringify(stdioConfig, null, 2));

  async function copyToClipboard(text: string, type: 'name' | 'url' | 'json' | 'example') {
    try {
      await navigator.clipboard.writeText(text);
      copySuccess = type;
      setTimeout(() => {
        copySuccess = null;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  function handleClose() {
    copySuccess = null;
    onClose();
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 bg-[#C99DA3]/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    role="button"
    tabindex="0"
    onclick={handleClose}
    onkeydown={(e) => e.key === 'Escape' && handleClose()}
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
        {#if !mcpConnection}
          <div class="mb-4 bg-red-900 border border-red-700 p-4 rounded">
            <h3 class="font-bold text-red-200 mb-2">⚠️ Not Connected</h3>
            <p class="text-red-300 text-sm">
              Make sure the MCP-Web bridge is running on {config.bridgeUrl} and the agent
              is running on {config.agentUrl}.
            </p>
            <p class="text-red-300 text-sm mt-2">
              You can play locally, but AI queries will not work.
            </p>
          </div>
        {/if}
        <div class="flex justify-between items-start mb-4">
          <h2 id="modal-title" class="text-2xl font-bold text-white">MCP Client Configuration</h2>
          <button
            onclick={handleClose}
            class="text-yellow-900 hover:text-white transition-colors text-2xl leading-none cursor-pointer"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div class="space-y-4">
          <p class="opacity-70">
            To interact with this game via an AI host app like Claude Desktop, add one of the following configurations:
          </p>

          <!-- Tabs -->
          <div class="flex border-b border-[#C99DA3]/20">
            <button
              onclick={() => activeConfigTab = 'remote'}
              class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer {activeConfigTab === 'remote' ? 'border-b-2 border-[#C99DA3] text-[#C99DA3]' : 'text-white/60 hover:text-white'}"
            >
              Remote MCP
              <span class="ml-2 px-1.5 py-0.5 text-xs bg-[#C99DA3]/20 text-[#C99DA3] rounded">
                Recommended
              </span>
            </button>
            <button
              onclick={() => activeConfigTab = 'stdio'}
              class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer {activeConfigTab === 'stdio' ? 'border-b-2 border-[#C99DA3] text-[#C99DA3]' : 'text-white/60 hover:text-white'}"
            >
              Stdio
            </button>
          </div>

          <!-- Tab content description -->
          <p class="text-sm opacity-60">
            {#if activeConfigTab === 'remote'}
              In Claude Desktop, go to Settings → Developer → Add MCP Server and enter:
            {:else}
              Uses @mcp-web/client as a stdio wrapper. Add this to your Claude Desktop config file:
            {/if}
          </p>

          {#if activeConfigTab === 'remote'}
            <div class="space-y-3">
              <!-- Name field -->
              <div class="space-y-1">
                <label class="block text-sm font-medium opacity-80">Name</label>
                <div class="flex gap-2">
                  <code class="flex-1 bg-black/30 border border-[#C99DA3]/20 rounded px-3 py-2 text-sm font-mono overflow-x-auto whitespace-nowrap">
                    {serverName}
                  </code>
                  <button
                    onclick={() => copyToClipboard(serverName, 'name')}
                    class="px-3 py-2 bg-[#C99DA3]/20 hover:bg-[#C99DA3]/30 hover:text-white text-sm rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {copySuccess === 'name' ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <!-- URL field -->
              <div class="space-y-1">
                <label class="block text-sm font-medium opacity-80">URL</label>
                <div class="flex gap-2">
                  <code class="flex-1 bg-black/30 border border-[#C99DA3]/20 rounded px-3 py-2 text-sm font-mono overflow-x-auto whitespace-nowrap">
                    {serverUrl}
                  </code>
                  <button
                    onclick={() => copyToClipboard(serverUrl, 'url')}
                    class="px-3 py-2 bg-[#C99DA3]/20 hover:bg-[#C99DA3]/30 hover:text-white text-sm rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {copySuccess === 'url' ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <p class="text-sm opacity-60 pt-1">
                Once configured, you can ask Claude to play checkers. For example:
              </p>

              <div class="border border-[#C99DA3]/20 rounded p-4 relative">
                <button
                  onclick={() => copyToClipboard('please make a really sweet move for me in my checkers game', 'example')}
                  class="absolute top-2 right-2 px-3 py-1 bg-[#C99DA3]/20 hover:bg-[#C99DA3]/30 hover:text-white text-sm rounded transition-colors cursor-pointer"
                >
                  {copySuccess === 'example' ? '✓ Sweet!' : 'Copy'}
                </button>
                <code class="text-sm text-gray-300 pr-16 block">please make a really sweet move for me in my checkers game</code>
              </div>
            </div>
          {:else}
            <div class="border border-[#C99DA3]/20 rounded p-4 relative">
              <button
                onclick={() => copyToClipboard(stdioConfigStr, 'json')}
                class="absolute top-2 right-2 px-3 py-1 bg-[#C99DA3]/20 hover:bg-[#C99DA3]/30 hover:text-white text-sm rounded transition-colors cursor-pointer"
              >
                {copySuccess === 'json' ? '✓ Copied!' : 'Copy'}
              </button>
              <pre class="text-sm text-gray-300 overflow-x-auto pr-20"><code>{stdioConfigStr}</code></pre>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
