import { useAtomValue, useSetAtom } from 'jotai';
import config from '../../mcp-web.config';
import { Help } from '../help/help.tsx';
import { helpModalOpenAtom } from '../help/states.ts';
import { HiGlass } from '../higlass/higlass.tsx';
import { codeMode, setCodeMode } from '../mcp/code-mode.ts';
import { mcp } from '../mcp/mcp.ts';
import { mcpStatusAtom } from '../mcp/states.ts';
import { CodeModeNotice } from './code-mode-notice.tsx';
import { IdleCountdown } from './idle-countdown.tsx';

const STATUS_COLORS = {
  error: 'bg-red-500',
  connecting: 'bg-yellow-500',
  connected: 'bg-green-500',
  disconnected: 'bg-zinc-500',
  idle: 'bg-zinc-500',
} as const;

export function App() {
  const mcpStatus = useAtomValue(mcpStatusAtom);
  const setHelpModalOpen = useSetAtom(helpModalOpenAtom);

  const handleHelpClick = () => {
    setHelpModalOpen((current) => !current);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* In the chat, the app needs no title, and AI is already connected. */}
      {!mcp.isMCPApp && (
        <header className="flex items-center justify-between px-4 py-2 bg-zinc-950 dark:border-b dark:border-zinc-900 text-zinc-300 text-xs">
          <h1 className="text-white text-lg">
            <strong className="font-bold">MCP-Web:</strong> HiGlass
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={codeMode}
              title="Offer the tools through one code tool. Reloads the page."
              className="flex items-center gap-2 p-2 border border-zinc-800 rounded hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-0"
              onClick={() => setCodeMode(!codeMode)}
            >
              <span
                className={`relative w-6 h-3.5 rounded-full transition-colors ${
                  codeMode ? 'bg-green-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${
                    codeMode ? 'left-3' : 'left-0.5'
                  }`}
                />
              </span>
              Code mode
            </button>
            <button
              type="button"
              className="flex items-center gap-2 p-2 border border-zinc-800 rounded hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-0"
              onClick={handleHelpClick}
            >
              <span
                className={`w-2 h-2 rounded-full ${STATUS_COLORS[mcpStatus]}`}
              />
              MCP
              {config.idleTimeoutMs !== undefined && (
                <IdleCountdown
                  mcpWeb={mcp}
                  idle={mcpStatus === 'idle'}
                  className="tabular-nums text-zinc-400"
                />
              )}
            </button>
          </div>
        </header>
      )}

      <main className="relative flex-grow">
        <div className="absolute inset-0 z-0">
          <HiGlass />
        </div>
        <Help />
        <CodeModeNotice />
      </main>
    </div>
  );
}
