import { useAtom, useSetAtom } from 'jotai';
import { useRef, useState } from 'react';
import { mcp } from '../mcp/mcp.ts';
import { helpModalDismissedAtom, helpModalOpenAtom } from './states.ts';

type ConfigTab = 'remote' | 'stdio';
type CopyType = 'name' | 'url' | 'json' | 'example';

const exampleQuery = "In HiGlass, zoom into a 2 Mb region around the MYC gene and add CTCF and Rad21 ChIP-seq signal as horizontal bar tracks on top"

export function Help() {
  const [isOpen, setIsOpen] = useAtom(helpModalOpenAtom);
  const setDismissed = useSetAtom(helpModalDismissedAtom);
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<ConfigTab>('remote');
  const [copySuccess, setCopySuccess] = useState<CopyType | null>(null);

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

  const stdioConfig = { mcpServers: mcp.mcpConfig };
  const serverName = Object.keys(mcp.remoteMcpConfig)[0];
  const serverUrl = mcp.remoteMcpConfig[serverName]?.url;
  const stdioConfigStr = JSON.stringify(stdioConfig, null, 2);

  const copyToClipboard = async (text: string, type: CopyType) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
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
              Get Started
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
                can be controlled by an AI agent through MCP tools. Follow these steps to get
                started:
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                    1. Add MCP Server Configuration
                  </h3>
                  <p className="text-zinc-700 mb-3">
                    Add one of the following configurations to your AI agent:
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
                      ? 'In Claude Desktop, go to Settings → Connectors → Add custom connector and enter:'
                      : 'Uses @mcp-web/client as a stdio wrapper. Add this to your MCP config file:'}
                  </p>

                  {activeTab === 'remote' ? (
                    <div className="space-y-3">
                      {/* Name field */}
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-zinc-600">Name</label>
                        <div className="flex gap-2">
                          <code className="flex-1 text-zinc-800 bg-zinc-100 border border-zinc-200 rounded px-3 py-2 text-sm font-mono overflow-x-auto whitespace-nowrap">
                            {serverName}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(serverName, 'name')}
                            className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {copySuccess === 'name' ? '✓ Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      {/* URL field */}
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-zinc-600">URL</label>
                        <div className="flex gap-2">
                          <code className="flex-1 text-zinc-800 bg-zinc-100 border border-zinc-200 rounded px-3 py-2 text-sm font-mono whitespace-nowrap overflow-hidden">
                            {serverUrl}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(serverUrl, 'url')}
                            className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {copySuccess === 'url' ? '✓ Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-500 pt-1">
                        Once configured, you can ask your AI agent to control HiGlass. For example:
                      </p>

                      <div className="flex gap-2">
                        <code className="flex-1 text-zinc-800 bg-zinc-100 border border-zinc-200 rounded px-3 py-2 text-sm font-mono whitespace-nowrap overflow-hidden">
                          exampleQuery
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(exampleQuery, 'url')}
                          className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {copySuccess === 'url' ? '✓ Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-zinc-100 rounded-lg p-4 overflow-x-auto relative">
                        <pre className="text-xs text-zinc-800 whitespace-pre-wrap pr-16">
                          {stdioConfigStr}
                        </pre>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(stdioConfigStr, 'json')}
                          className="absolute top-2 right-2 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs rounded transition-colors cursor-pointer"
                        >
                          {copySuccess === 'json' ? '✓ Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-zinc-200 p-4 flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 cursor-pointer bg-zinc-900 text-white rounded-lg hover:bg-black transition-colors"
            >
              Let's Go! 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
