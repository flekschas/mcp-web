import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { logger, Warn } from 'vega';
import vegaEmbed, { type Result, type VisualizationSpec } from 'vega-embed';
import {
  renderResultAtom,
  renderStatusAtom,
  specAtom,
} from '../spec/states.ts';

/** Warnings Vega logs when a chart's data fails to load or parse. */
const DATA_FAILURES = ['Loading failed', 'Data ingestion failed'];

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
    element.className = 'w-full';
    container.append(element);

    let cancelled = false;
    let result: Result | null = null;
    const errors: string[] = [];

    const report = () => {
      if (cancelled) return;
      if (errors.length > 0) {
        setRenderResult({ spec, status: 'error', error: errors.join('\n') });
      } else {
        setRenderResult({ spec, status: 'rendered', error: null });
      }
    };

    // Vega reports some failures only through its logger, and data that
    // fails to load or parse only as a warning.
    const vegaLogger = logger(Warn, 'warn', (_method, level, args) => {
      if (level !== 'ERROR' && !DATA_FAILURES.includes(String(args[0]))) {
        return;
      }
      errors.push(args.map(String).join(' '));
      report();
    });

    // Vega-Embed may add to the spec it renders, so it gets a copy.
    vegaEmbed(element, structuredClone(spec) as VisualizationSpec, {
      actions: false,
      logger: vegaLogger,
    })
      .then(async (embedded) => {
        if (cancelled) {
          embedded.finalize();
          return;
        }
        result = embedded;
        await embedded.view.runAsync();
        report();
      })
      .catch((error: unknown) => {
        errors.push(error instanceof Error ? error.message : String(error));
        report();
      });

    return () => {
      cancelled = true;
      result?.finalize();
      element.remove();
    };
  }, [spec, setRenderResult]);

  return (
    <div className="relative h-full overflow-auto p-4">
      <div ref={containerRef} className="w-full" />
      {status.status === 'error' && (
        <div className="absolute left-4 right-4 bottom-4 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-mono whitespace-pre-wrap">
          {status.error}
        </div>
      )}
    </div>
  );
}
