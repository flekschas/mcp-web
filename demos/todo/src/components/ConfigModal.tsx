import { useMCPWeb } from '@mcp-web/react';
import { useState } from 'react';
import config from '../../mcp-web.config';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  mcpConnection: boolean;
}

type ConfigTab = 'remote' | 'stdio';

export function ConfigModal({
  isOpen,
  onClose,
  mcpConnection,
}: ConfigModalProps) {
  const { mcpWeb } = useMCPWeb();
  const [activeTab, setActiveTab] = useState<ConfigTab>('remote');
  const [copySuccess, setCopySuccess] = useState<'name' | 'url' | 'json' | 'example' | null>(null);

  if (!isOpen) return null;

  const remoteConfig = mcpWeb.remoteMcpConfig;
  const serverName = Object.keys(remoteConfig)[0];
  const serverUrl = remoteConfig[serverName]?.url;
  const stdioConfig = { mcpServers: mcpWeb.mcpConfig };

  const copyToClipboard = async (text: string, type: 'name' | 'url' | 'json' | 'example') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop
    <div
      className="fixed inset-0 bg-(--color-bg)/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="presentation"
    >
      <div
        className="bg-(--color-bg-alt) rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto text-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 id="modal-title" className="text-2xl font-display font-bold text-(--color-text)">
              MCP Client Configuration
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-(--color-text) hover:opacity-80 bg-(--color-accent-subtle) hover:bg-(--color-accent-subtle-hover) rounded transition-opacity text-2xl leading-none cursor-pointer"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-5 h-5 inline-block m-1" />
            </button>
          </div>

          {!mcpConnection && (
            <div className="mb-4 bg-red-800 dark:bg-red-900 p-4 rounded">
              <h3 className="flex items-center font-display font-bold text-red-200 mb-2">
                <ExclamationCircleIcon className="w-5 h-5 inline-block mr-2" />
                Not Connected
              </h3>
              <p className="text-red-300 text-sm">
                Make sure the MCP-Web bridge is running on {config.bridgeUrl}.
              </p>
              <p className="text-red-300 text-sm mt-2">
                You can use the app locally, but AI queries will not work.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <p className="opacity-70">
              To interact with this app via an AI host app, like Claude Desktop, add one of the following configurations:
            </p>

            {/* Tabs */}
            <div className="flex border-b border-(--color-border)">
              <button
                type="button"
                onClick={() => setActiveTab('remote')}
                className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'remote'
                    ? 'border-b-2 border-(--color-accent) text-(--color-accent)'
                    : 'text-(--color-text) opacity-60 hover:opacity-100'
                }`}
              >
                Remote MCP
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-(--color-accent-subtle) text-(--color-accent) rounded">
                  Recommended
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('stdio')}
                className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'stdio'
                    ? 'border-b-2 border-(--color-accent) text-(--color-accent)'
                    : 'text-(--color-text) opacity-60 hover:opacity-100'
                }`}
              >
                Stdio
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'remote' ? (
              <div className="space-y-4">
                <p className="text-sm opacity-60">
                  In Claude Desktop, go to <strong>Settings → Connectors → Add custom connector</strong> and enter:
                </p>

                {/* Name field */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium opacity-80">Name</label>
                  <div className="flex gap-2">
                    <code className="flex-1 border-2 border-(--color-border) rounded px-3 py-2 text-sm font-mono">
                      {serverName}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(serverName, 'name')}
                      className="px-3 py-2 bg-(--color-accent-subtle) hover:bg-(--color-accent-subtle-hover) text-sm rounded transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {copySuccess === 'name' ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* URL field */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium opacity-80">URL</label>
                  <div className="flex gap-2">
                    <code className="flex-1 border-2 border-(--color-border) rounded px-3 py-2 text-sm font-mono overflow-x-auto whitespace-nowrap">
                      {serverUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(serverUrl, 'url')}
                      className="px-3 py-2 bg-(--color-accent-subtle) hover:bg-(--color-accent-subtle-hover) text-sm rounded transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {copySuccess === 'url' ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <p className="text-sm opacity-60 pt-2">
                  Once configured, you can ask Claude to manage your todos. For example:
                </p>

                <div className="flex gap-2">
                  <code className="flex-1 border-2 border-(--color-border) rounded px-3 py-2 text-sm font-mono overflow-x-auto whitespace-nowrap">
                    add a todo to read up on MCP-Web. seems like a cool library
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('remind me to water my mass cane plant every two weeks', 'example')}
                    className="px-3 py-2 bg-(--color-accent-subtle) hover:bg-(--color-accent-subtle-hover) text-sm rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {copySuccess === 'example' ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm opacity-60">
                  Uses @mcp-web/client as a stdio wrapper. Add this to your Claude Desktop config file:
                </p>

                {/* JSON config display */}
                <div className="border-2 border-(--color-border) rounded p-4 relative">
                  <pre className="text-sm text-(--color-text) overflow-x-auto pr-20">
                    <code>{JSON.stringify(stdioConfig, null, 2)}</code>
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(JSON.stringify(stdioConfig, null, 2), 'json')}
                    className="absolute top-2 right-2 px-2 py-1 bg-(--color-accent-subtle) hover:bg-(--color-accent-subtle-hover) text-sm rounded transition-colors cursor-pointer"
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
  );
}
