import {
  GoslingComponent,
  type GoslingSpec as GoslingJsSpec,
} from 'gosling.js';
import { useAtomValue, useSetAtom } from 'jotai';
import { Component, type ReactNode, useEffect, useMemo } from 'react';
import {
  renderResultAtom,
  renderStatusAtom,
  specAtom,
} from '../spec/states.ts';

/** How long to wait for Gosling to compile a spec before reporting no view. */
const NO_VIEW_DELAY_MS = 2000;

let renderCount = 0;

/** Shows nothing after an error. */
class RenderErrorBoundary extends Component<
  { onError: (error: unknown) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function Chart() {
  const spec = useAtomValue(specAtom);
  const status = useAtomValue(renderStatusAtom);
  const setRenderResult = useSetAtom(renderResultAtom);
  // Each spec gets a new Gosling component: Gosling skips a spec it considers
  // equal to the last one, and keeps the last view for a spec that has none.
  // Its compiler adds to the spec it renders, so it gets a copy.
  const rendered = useMemo(
    () => ({
      spec: structuredClone(spec) as GoslingJsSpec,
      key: ++renderCount,
    }),
    [spec],
  );

  // Gosling reports each spec it compiles through `compiled`; drawing and
  // loading data happen afterwards and report no errors. It gives up without
  // an error on a spec with no view, e.g. one without tracks.
  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderResult((current) =>
        current.spec === spec
          ? current
          : {
              spec,
              status: 'error',
              error: 'Gosling drew no view for this spec. Does it have tracks?',
            },
      );
    }, NO_VIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [spec, setRenderResult]);

  return (
    <div className="relative h-full overflow-auto p-4">
      <div className={status.status === 'error' ? 'invisible' : undefined}>
        <RenderErrorBoundary
          key={rendered.key}
          onError={(error) =>
            setRenderResult({
              spec,
              status: 'error',
              error: error instanceof Error ? error.message : String(error),
            })
          }
        >
          <GoslingComponent
            spec={rendered.spec}
            compiled={(compiledSpec) => {
              // Gosling also compiles a placeholder spec when it mounts.
              if (compiledSpec !== rendered.spec) return;
              setRenderResult({ spec, status: 'rendered', error: null });
            }}
            padding={0}
            margin={0}
          />
        </RenderErrorBoundary>
      </div>
      {status.status === 'error' && (
        <div className="absolute left-4 right-4 bottom-4 max-h-1/2 overflow-auto rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-mono whitespace-pre-wrap">
          {status.error}
        </div>
      )}
    </div>
  );
}
