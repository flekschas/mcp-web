import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { Annotation } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SchemaProblem } from '../spec/json-schema-check.ts';

type Spec = Record<string, unknown>;

const PARSE_DELAY_MS = 300;

/** Marks a change that came from the spec state rather than from typing. */
const external = Annotation.define<boolean>();

const format = (spec: unknown) => JSON.stringify(spec, null, 2);

function parseSpec(text: string): { spec: Spec } | { error: string } {
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { error: 'The spec must be a JSON object.' };
    }
    return { spec: value as Spec };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/** Whether the editor text already holds this spec, ignoring formatting. */
function holds(text: string, spec: unknown): boolean {
  const parsed = parseSpec(text);
  return (
    'spec' in parsed && JSON.stringify(parsed.spec) === JSON.stringify(spec)
  );
}

interface SpecEditorProps {
  spec: Spec;
  onChange: (spec: Spec) => void;
  check: (spec: unknown) => SchemaProblem[];
  /** Text to start with instead of the spec, e.g. an unfinished edit. */
  initialText?: string;
  /** Called with the text after every change. */
  onTextChange?: (text: string) => void;
}

/**
 * A JSON editor bound to the spec state. Valid JSON the user types becomes the
 * new spec; invalid JSON is reported and leaves the spec as it was. When the
 * spec changes elsewhere, e.g. through MCP, the editor shows it.
 */
export function SpecEditor({
  spec,
  onChange,
  check,
  initialText,
  onTextChange,
}: SpecEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onTextChangeRef = useRef(onTextChange);
  onTextChangeRef.current = onTextChange;
  // The spec the text was last made to show, so a spec that hasn't changed
  // never replaces what the user typed.
  const shownSpecRef = useRef(spec);
  const [parseError, setParseError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: The editor is created once; later specs arrive through the effect below.
  useEffect(() => {
    if (!containerRef.current) return;

    const apply = (text: string) => {
      const parsed = parseSpec(text);
      if ('error' in parsed) {
        setParseError(parsed.error);
      } else {
        setParseError(null);
        onChangeRef.current(parsed.spec);
      }
    };

    const view = new EditorView({
      parent: containerRef.current,
      doc: initialText ?? format(spec),
      extensions: [
        basicSetup,
        json(),
        linter(jsonParseLinter(), { delay: PARSE_DELAY_MS }),
        lintGutter(),
        EditorView.theme({
          '&': { height: '100%', fontSize: '12px' },
          '.cm-scroller': { overflow: 'auto' },
        }),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          const text = update.state.doc.toString();
          onTextChangeRef.current?.(text);
          if (update.transactions.some((tr) => tr.annotation(external))) {
            return;
          }
          window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(
            () => apply(text),
            PARSE_DELAY_MS,
          );
        }),
      ],
    });
    viewRef.current = view;
    if (initialText !== undefined && !holds(initialText, spec)) {
      apply(initialText);
    }

    return () => {
      window.clearTimeout(timerRef.current);
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || spec === shownSpecRef.current) return;
    shownSpecRef.current = spec;
    const text = view.state.doc.toString();
    if (holds(text, spec)) return;
    window.clearTimeout(timerRef.current);
    setParseError(null);
    view.dispatch({
      changes: { from: 0, to: text.length, insert: format(spec) },
      annotations: external.of(true),
    });
  }, [spec]);

  const problems = useMemo(() => check(spec), [check, spec]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={containerRef} className="flex-grow min-h-0 overflow-hidden" />
      <div className="shrink-0 max-h-40 overflow-y-auto border-t border-zinc-200 px-3 py-2 text-xs font-mono">
        {parseError ? (
          <p className="text-red-700">
            Invalid JSON: {parseError}. The chart still shows the last valid
            spec.
          </p>
        ) : problems.length > 0 ? (
          <div className="text-amber-800">
            <p className="mb-1">
              {problems.length} schema problem(s). The chart may still render:
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              {problems.map((problem) => (
                <li key={`${problem.path.join('.')}:${problem.message}`}>
                  <span className="font-semibold">
                    {problem.path.length > 0 ? problem.path.join('.') : 'spec'}
                  </span>
                  : {problem.message}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-green-700">Valid spec</p>
        )}
      </div>
    </div>
  );
}
