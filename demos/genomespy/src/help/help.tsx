import { useAtom, useSetAtom } from 'jotai';
import { useCallback, useEffect, useRef, useState } from 'react';
import { codeMode } from '../mcp/code-mode.ts';
import { mcp } from '../mcp/mcp.ts';
import { EXAMPLE_PROMPTS } from '../spec/examples.ts';
import { HelpIntro } from './intro.tsx';
import { helpModalDismissedAtom, helpModalOpenAtom } from './states.ts';

type ConfigTab = 'remote' | 'stdio';
type CopyType = 'name' | 'url' | 'json' | `prompt-${number}`;

export function Help() {
  const [isOpen, setIsOpen] = useAtom(helpModalOpenAtom);
  const setDismissed = useSetAtom(helpModalDismissedAtom);
  const [activeTab, setActiveTab] = useState<ConfigTab>('remote');
  const [copySuccess, setCopySuccess] = useState<CopyType | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleClose = useCallback(() => {
    setDismissed(true);
    setIsOpen(false);
  }, [setDismissed, setIsOpen]);

  // A modal dialog keeps focus inside, closes on Escape and returns focus to
  // where it was when it closes.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // The content fills the dialog, so only a click on the backdrop targets
  // the dialog itself.
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) dialogRef.current?.close();
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
    // biome-ignore lint/a11y/useKeyWithClickEvents: The dialog closes on Escape by itself.
    <dialog
      ref={dialogRef}
      aria-labelledby="help-title"
      onClose={handleClose}
      onClick={handleBackdropClick}
      className="m-auto w-[calc(100%-4rem)] max-w-2xl max-h-[calc(100%-4rem)] overflow-hidden rounded bg-white p-0 text-sm backdrop:bg-black/50 backdrop:backdrop-blur-xs"
    >
      <div className="flex max-h-[calc(100vh-4rem)] flex-col">
        <div className="p-4 flex-1 overflow-y-auto">
          <h2 id="help-title" className="text-xl font-bold text-zinc-900 mb-4">
            Get Started
          </h2>

          <div className="prose max-w-none">
            <HelpIntro />

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
                      <span className="block text-xs font-medium text-zinc-600">
                        Name
                      </span>
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
                      <span className="block text-xs font-medium text-zinc-600">
                        URL
                      </span>
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

              <div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                  2. Ask Your AI Agent
                </h3>
                <p className="text-zinc-700 mb-3">
                  Once connected, ask your agent to create or change the chart.
                  For example:
                </p>
                <ul className="space-y-2">
                  {EXAMPLE_PROMPTS.map((prompt, index) => (
                    <li key={prompt} className="flex gap-2">
                      <span className="flex-1 text-zinc-800 bg-zinc-100 border border-zinc-200 rounded px-3 py-2 text-sm">
                        {prompt}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(prompt, `prompt-${index}`)
                        }
                        className="self-start px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {copySuccess === `prompt-${index}`
                          ? '✓ Copied!'
                          : 'Copy'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                  Code Mode
                </h3>
                <p className="text-zinc-700 mb-3">
                  Code mode is {codeMode ? 'on' : 'off'}. With code mode on, the
                  agent gets one <code>code_spec</code> tool instead of{' '}
                  <code>set_spec</code>: it changes the spec with a short
                  program, so it only writes the change. Turn it on or off with
                  the <strong>Code mode</strong> switch in the header, or open
                  the page with <code>?codeMode=1</code>.
                </p>
                <p className="text-zinc-700">
                  Switching reloads the page and keeps your spec, including an
                  unfinished edit. The connector URL, including its token, stays
                  the same, so you don't need to change your configuration.
                  Remote MCP clients get the new tool list automatically. With
                  the stdio client, the list refreshes if your version of{' '}
                  <code>@mcp-web/client</code> forwards tool list changes;
                  otherwise, start a new conversation or reconnect.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-zinc-200 p-4 flex justify-end">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="px-6 py-2 cursor-pointer bg-zinc-900 text-white rounded-lg hover:bg-black transition-colors"
          >
            Let's Go! 🚀
          </button>
        </div>
      </div>
    </dialog>
  );
}
