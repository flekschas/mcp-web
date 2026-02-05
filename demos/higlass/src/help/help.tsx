import { useAtom, useSetAtom } from 'jotai';
import { useRef, useState } from 'react';
import { mcp } from '../mcp/mcp.ts';
import { getCurrentAuthToken } from '../mcp/mcp.ts';
import { helpModalDismissedAtom, helpModalOpenAtom } from './states.ts';

type ConfigTab = 'remote' | 'stdio';

export function Help() {
  const [isOpen, setIsOpen] = useAtom(helpModalOpenAtom);
  const setDismissed = useSetAtom(helpModalDismissedAtom);
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<ConfigTab>('remote');
  const [copySuccess, setCopySuccess] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setDismissed(true);
    setIsOpen(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const remoteConfig = { mcpServers: mcp.remoteMcpConfig };
  const stdioConfig = { mcpServers: mcp.mcpConfig };
  const currentConfig = activeTab === 'remote' ? remoteConfig : stdioConfig;
  const mcpConfigStr = JSON.stringify(currentConfig, null, 2);
  const authToken = getCurrentAuthToken();

  const copyConfigToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(mcpConfigStr);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: will fix it later
    // biome-ignore lint/a11y/useKeyWithClickEvents: will fix it later
    <div
      className="absolute inset-0 bg-black/50 z-10 backdrop-blur-xs"
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-8 flex items-center justify-center pointer-events-none">
        <div
          ref={modalRef}
          className="bg-white rounded max-w-2xl w-full max-h-full overflow-y-auto text-sm flex flex-col pointer-events-auto"
          role="dialog"
        >
          <div className="p-4 flex-1 overflow-y-auto">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">
              🤖 Get Started
            </h2>

            <div className="prose max-w-none">
              <p className="text-zinc-700 mb-6">
                In this demo,{' '}
                <a
                  href="https://higlass.io"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  HiGlass
                </a>{' '}
                can be controlled by{' '}
                <a
                  href="https://anthropic.com/claude"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Claude Desktop
                </a>{' '}
                through MCP (Model Context Protocol). Follow these steps to get
                started:
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                    1. Add MCP Server Configuration
                  </h3>
                  <p className="text-zinc-700 mb-3">
                    Add one of the following configurations to your Claude Desktop config (
                    <code>
                      ~/Library/Application
                      Support/Claude/claude_desktop_config.json
                    </code>
                    ) under <code>mcpServers</code>:
                  </p>

                  {/* Tabs */}
                  <div className="flex border-b border-zinc-200 mb-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('remote')}
                      className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                        activeTab === 'remote'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      Remote MCP
                      <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                        Recommended
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('stdio')}
                      className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                        activeTab === 'stdio'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      Stdio
                    </button>
                  </div>

                  {/* Tab description */}
                  <p className="text-xs text-zinc-500 mb-3">
                    {activeTab === 'remote'
                      ? 'Direct URL connection. Simpler configuration, no intermediate process needed.'
                      : 'Uses @mcp-web/client as a stdio wrapper. Alternative method with the same functionality.'}
                  </p>

                  <div className="bg-zinc-100 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-xs text-zinc-800 whitespace-pre-wrap">
                      {mcpConfigStr}
                    </pre>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={copyConfigToClipboard}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      {copySuccess ? '✓ Copied!' : '📋 Copy Configuration'}
                    </button>
                  </div>
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 mb-1">
                      🔒 Persistent Auth Token
                    </h4>
                    <p className="text-xs text-green-700 mb-2">
                      Your auth token is automatically saved and will persist
                      across browser sessions. Current token:{' '}
                      <code className="bg-green-100 px-1 rounded text-xs">
                        {authToken.slice(0, 8)}...
                      </code>
                    </p>
                    <p className="text-xs text-green-600">
                      ✅ No need to reconfigure Claude Desktop when you reload
                      this page!
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                    2. Restart Claude Desktop
                  </h3>
                  <p className="text-zinc-700">
                    After adding the configuration, restart Claude Desktop to
                    load the new MCP server.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                    3. Start Controlling HiGlass
                  </h3>
                  <p className="text-zinc-700">
                    Once Claude is restarted and this page is connected, you can
                    ask Claude configure and use HiGlass. For example:
                  </p>
                  <ul className="list-disc list-inside text-zinc-700 mt-2 space-y-1">
                    <li>Set the HiGlass theme to dark mode</li>
                    <li>Get the current view configuration</li>
                    <li>Change the mouse tool to select mode</li>
                    <li>Set the renderer to canvas instead of webgl</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-zinc-200 p-4 flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Let's Go! 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
