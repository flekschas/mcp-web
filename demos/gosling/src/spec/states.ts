import { atom, getDefaultStore } from 'jotai';
import { takeKeptState } from '../mcp/code-mode.ts';
import { EXAMPLES } from './examples.ts';
import type { GoslingSpec } from './schema.ts';

/** What the code mode switch kept across its reload. */
const kept = takeKeptState() as { spec?: unknown; text?: unknown } | undefined;

const isObject = (value: unknown) =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export const specAtom = atom<GoslingSpec>(
  isObject(kept?.spec) ? (kept?.spec as GoslingSpec) : EXAMPLES[0].spec,
);

/** Editor text the switch kept, e.g. an unfinished edit. */
export const keptEditorText =
  typeof kept?.text === 'string' ? kept.text : undefined;

/** The editor's text, which can be ahead of the spec while the user types. */
export const editorTextAtom = atom<string | undefined>(keptEditorText);

export type RenderStatus =
  | { status: 'rendering'; error: null }
  | { status: 'rendered'; error: null }
  | { status: 'error'; error: string };

/** What the chart reported, and for which spec. */
export const renderResultAtom = atom<
  RenderStatus & { spec: GoslingSpec | null }
>({ spec: null, status: 'rendering', error: null });

/** The status of the current spec: rendering until the chart reports. */
export const renderStatusAtom = atom<RenderStatus>((get) => {
  const { spec, ...status } = get(renderResultAtom);
  return spec === get(specAtom) ? status : { status: 'rendering', error: null };
});

/** The render status once rendering finished, or after `timeoutMs`. */
export function waitForRenderStatus(timeoutMs: number): Promise<RenderStatus> {
  const store = getDefaultStore();
  return new Promise((resolve) => {
    const finish = () => {
      unsubscribe();
      clearTimeout(timer);
      resolve(store.get(renderStatusAtom));
    };
    const unsubscribe = store.sub(renderStatusAtom, () => {
      if (store.get(renderStatusAtom).status !== 'rendering') finish();
    });
    const timer = setTimeout(finish, timeoutMs);
    if (store.get(renderStatusAtom).status !== 'rendering') finish();
  });
}
