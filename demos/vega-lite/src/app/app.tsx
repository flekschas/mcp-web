import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import config from '../../mcp-web.config';
import { Chart } from '../chart/chart.tsx';
import { SpecEditor } from '../editor/spec-editor.tsx';
import { Help } from '../help/help.tsx';
import { helpModalOpenAtom } from '../help/states.ts';
import { mcp } from '../mcp/mcp.ts';
import { mcpStatusAtom } from '../mcp/states.ts';
import { EXAMPLES } from '../spec/examples.ts';
import { checkVegaLiteSpec, type VegaLiteSpec } from '../spec/schema.ts';
import { editorTextAtom, keptEditorText, specAtom } from '../spec/states.ts';
import { CodeModeNotice } from './code-mode-notice.tsx';
import { CodeModeSwitch } from './code-mode-switch.tsx';
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
  const [spec, setSpec] = useAtom(specAtom);
  const setEditorText = useSetAtom(editorTextAtom);

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between gap-4 px-4 py-2 bg-zinc-950 text-zinc-300 text-xs">
        <h1 className="text-white text-lg whitespace-nowrap">
          <strong className="font-bold">MCP-Web:</strong> Vega-Lite
        </h1>
        <div className="flex items-center gap-2">
          <select
            aria-label="Load an example"
            className="p-2 bg-zinc-950 border border-zinc-800 rounded cursor-pointer hover:bg-zinc-800"
            value=""
            onChange={(event) => {
              const example = EXAMPLES[Number(event.target.value)];
              if (example) setSpec(structuredClone(example.spec));
            }}
          >
            <option value="" disabled>
              Load example…
            </option>
            {EXAMPLES.map((example, index) => (
              <option key={example.name} value={index}>
                {example.name}
              </option>
            ))}
          </select>
          <CodeModeSwitch />
          <button
            type="button"
            className="flex items-center gap-2 p-2 border border-zinc-800 rounded hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-0"
            onClick={() => setHelpModalOpen((current) => !current)}
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

      <main className="relative flex-grow min-h-0 grid grid-rows-2 md:grid-rows-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section
          aria-label="Spec editor"
          className="min-h-0 border-b md:border-b-0 md:border-r border-zinc-200"
        >
          <SpecEditor
            spec={spec}
            onChange={(value) => setSpec(value as VegaLiteSpec)}
            check={checkVegaLiteSpec}
            initialText={keptEditorText}
            onTextChange={setEditorText}
          />
        </section>
        <section aria-label="Chart" className="min-h-0">
          <Chart />
        </section>
        <Help />
        <CodeModeNotice />
      </main>
    </div>
  );
}
