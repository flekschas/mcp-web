import { useMCPWeb } from '@mcp-web/react';
import { MCP_WEB_CONFIG } from '../../mcp-web.config';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  mcpConnection: boolean;
  copyConfigToClipboard: () => void;
  copyConfigSuccess: boolean;
}

export function ConfigModal({
  isOpen,
  onClose,
  mcpConnection,
  copyConfigToClipboard,
  copyConfigSuccess,
}: ConfigModalProps) {
  const { mcpWeb } = useMCPWeb();

  if (!isOpen) return null;

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
                Make sure the MCP-Web bridge is running on {MCP_WEB_CONFIG.bridgeUrl}.
              </p>
              <p className="text-red-300 text-sm mt-2">
                You can use the app locally, but AI queries will not work.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <p className="opacity-70">
              To interact with this app via an AI host app, like Claude Desktop, use the following configuration:
            </p>

            <div className="border-2 border-(--color-border) rounded p-4 relative">
              <pre className="text-sm text-(--color-text) opacity-80 overflow-x-hidden pr-20">
                <code>{JSON.stringify({ mcpServers: mcpWeb.mcpConfig }, null, 2)}</code>
              </pre>
              <button
                type="button"
                onClick={copyConfigToClipboard}
                className="absolute top-2 right-2 px-2 py-1 bg-(--color-accent-subtle) hover:bg-(--color-accent-subtle-hover) text-sm rounded transition-colors cursor-pointer"
              >
                {copyConfigSuccess ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
