import { useEffect, useRef } from 'react';
import { codeMode, codeModeSwitched } from '../mcp/code-mode.ts';

/**
 * After a switch of code mode, reminds the user that the agent's tool list
 * changed, since some MCP clients only pick that up after a refresh.
 */
export function CodeModeNotice() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (codeModeSwitched && dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="code-mode-notice-title"
      className="m-auto w-[calc(100%-4rem)] max-w-md rounded bg-white p-0 text-sm backdrop:bg-black/50 backdrop:backdrop-blur-xs"
    >
      <form method="dialog" className="p-4 space-y-3">
        <h2
          id="code-mode-notice-title"
          className="text-lg font-bold text-zinc-900"
        >
          Code mode is {codeMode ? 'on' : 'off'}
        </h2>
        <p className="text-zinc-700">
          {codeMode ? (
            <>
              The agent now changes the spec with <code>code_spec</code> instead
              of <code>set_spec</code>.
            </>
          ) : (
            <>
              The agent now changes the spec with <code>set_spec</code> instead
              of <code>code_spec</code>.
            </>
          )}
        </p>
        <p className="text-zinc-700">
          If your agent still lists the old tools, refresh its tool list, e.g.,
          in the connector's settings, or start a new chat.
        </p>
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 cursor-pointer bg-zinc-900 text-white rounded-lg hover:bg-black transition-colors"
          >
            Got it
          </button>
        </div>
      </form>
    </dialog>
  );
}
