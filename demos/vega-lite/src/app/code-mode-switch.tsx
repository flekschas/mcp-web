import { useStore } from 'jotai';
import { codeMode, setCodeMode } from '../mcp/code-mode.ts';
import { editorTextAtom, specAtom } from '../spec/states.ts';

/** Shows and toggles code mode. Toggling reloads the page. */
export function CodeModeSwitch() {
  const store = useStore();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={codeMode}
      onClick={() =>
        setCodeMode(!codeMode, {
          spec: store.get(specAtom),
          text: store.get(editorTextAtom),
        })
      }
      title="Offer the spec to AI through a code tool. Reloads the page."
      className="flex items-center gap-2 p-2 border border-zinc-800 rounded hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-0"
    >
      <span
        className={`relative inline-block w-7 h-4 rounded-full transition-colors ${
          codeMode ? 'bg-green-500' : 'bg-zinc-600'
        }`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
            codeMode ? 'left-3.5' : 'left-0.5'
          }`}
        />
      </span>
      Code mode
    </button>
  );
}
