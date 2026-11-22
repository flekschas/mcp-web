import { type EmbedResult, embed } from '@genome-spy/core/browser';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import {
  renderResultAtom,
  renderStatusAtom,
  specAtom,
} from '../spec/states.ts';

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export function Chart() {
  const spec = useAtomValue(specAtom);
  const status = useAtomValue(renderStatusAtom);
  const setRenderResult = useSetAtom(renderResultAtom);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Each embed gets its own element, so one that finishes after the spec
    // changed again can't touch the newer chart.
    const element = document.createElement('div');
    element.className = 'absolute inset-0';
    container.append(element);

    let cancelled = false;
    let failed = false;
    let result: EmbedResult | null = null;

    const fail = (error: unknown) => {
      failed = true;
      if (!cancelled) {
        setRenderResult({ spec, status: 'error', error: message(error) });
      }
    };

    // GenomeSpy may add to the spec it renders, so it gets a copy. A failed
    // launch still resolves, and reports its error through `onError`.
    embed(element, structuredClone(spec), {
      // Errors are shown by the app instead of GenomeSpy's message box.
      onError: (error) => {
        fail(error);
        return true;
      },
    })
      .then(async (embedded) => {
        if (cancelled) {
          embedded.finalize();
          return;
        }
        result = embedded;
        await embedded.awaitVisibleLazyData();
        if (!cancelled && !failed) {
          setRenderResult({ spec, status: 'rendered', error: null });
        }
      })
      .catch(fail);

    return () => {
      cancelled = true;
      result?.finalize();
      element.remove();
    };
  }, [spec, setRenderResult]);

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="absolute inset-4" />
      {status.status === 'error' && (
        <div className="absolute left-4 right-4 bottom-4 max-h-1/2 overflow-auto rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-mono whitespace-pre-wrap">
          {status.error}
        </div>
      )}
    </div>
  );
}
