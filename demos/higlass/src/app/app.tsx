import { useAtomValue, useSetAtom } from 'jotai';
import { Help } from '../help/help.tsx';
import { helpModalOpenAtom } from '../help/states.ts';
import { HiGlass } from '../higlass/higlass.tsx';
import { mcpStatusAtom } from '../mcp/states.ts';

export function App() {
  const mcpStatus = useAtomValue(mcpStatusAtom);
  const setHelpModalOpen = useSetAtom(helpModalOpenAtom);

  const handleHelpClick = () => {
    setHelpModalOpen((current) => !current);
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-4 py-2 bg-zinc-950 dark:border-b dark:border-zinc-900 text-zinc-300 text-xs">
        <h1 className="text-white text-lg">
          <strong className="font-bold">MCP-App:</strong> HiGlass (with React +
          Jotai)
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-2 p-2 border border-zinc-800 rounded hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
            onClick={handleHelpClick}
          >
            {mcpStatus === 'error' && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
            {mcpStatus === 'connecting' && (
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
            )}
            {mcpStatus === 'connected' && (
              <span className="w-2 h-2 rounded-full bg-green-500" />
            )}
            {mcpStatus === 'disconnected' && (
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
            )}
            MCP
          </button>
        </div>
      </header>

      <main className="relative flex-grow">
        <div className="absolute inset-0 z-0">
          <HiGlass />
        </div>
        <Help />
      </main>
    </div>
  );
}
