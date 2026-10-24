// The read-only Lean editor. The current line is lit, lines already run are dimmed,
// failing lines get a red gutter marker. Clicking a proof line jumps to just after it.

import { syntaxHighlighting } from '@codemirror/language';
import { EditorState, RangeSet, StateEffect, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView, GutterMarker, gutter, lineNumbers, type DecorationSet } from '@codemirror/view';
import { useEffect, useRef } from 'react';
import type { Frame } from '../core/frames';
import { unownedErrorLines } from '../core/errors';
import type { Trace } from '../core/types';
import { lean4, leanHighlight } from './leanLanguage';

type Marks = Readonly<{ current: number | undefined; next: number | undefined; ran: readonly number[]; errors: readonly number[] }>;

const setMarks = StateEffect.define<Marks>();

const currentLine = Decoration.line({ class: 'cm-ls-current' });
const nextLine = Decoration.line({ class: 'cm-ls-next' });
const ranLine = Decoration.line({ class: 'cm-ls-ran' });
const errorLine = Decoration.line({ class: 'cm-ls-error' });

class ErrorMarker extends GutterMarker {
  override toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-ls-error-dot';
    el.setAttribute('aria-label', 'Lean error on this line');
    return el;
  }
}
const errorMarker = new ErrorMarker();

const marksField = StateField.define<Marks>({
  create: () => ({ current: undefined, next: undefined, ran: [], errors: [] }),
  update: (marks, tr) => tr.effects.reduce((m, e) => (e.is(setMarks) ? e.value : m), marks),
});

const decorations = EditorView.decorations.compute([marksField], (state): DecorationSet => {
  const { current, next, ran, errors } = state.field(marksField);
  const doc = state.doc;
  const at = (line: number) => (line >= 1 && line <= doc.lines ? doc.line(line).from : undefined);
  const decos = [
    ...ran.filter((l) => l !== current).map((l) => [l, ranLine] as const),
    ...(next !== undefined ? [[next, nextLine] as const] : []),
    ...(current !== undefined ? [[current, currentLine] as const] : []),
    ...errors.map((l) => [l, errorLine] as const),
  ]
    .flatMap(([l, d]) => {
      const from = at(l);
      return from === undefined ? [] : [d.range(from)];
    })
    .sort((a, b) => a.from - b.from);
  return Decoration.set(decos, true);
});

const errorGutter = gutter({
  class: 'cm-ls-gutter',
  markers: (view) => {
    const { errors } = view.state.field(marksField);
    const doc = view.state.doc;
    return RangeSet.of(
      errors.filter((l) => l >= 1 && l <= doc.lines).map((l) => errorMarker.range(doc.line(l).from)),
      true,
    );
  },
});

const theme = EditorView.theme(
  {
    '&': { height: '100%', backgroundColor: 'transparent', fontSize: '14px' },
    '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.65' },
    '.cm-content': { padding: '12px 0' },
    '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: 'var(--faint)' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 6px', fontVariantNumeric: 'tabular-nums' },
    '.cm-line': { padding: '0 16px 0 8px', transition: 'opacity 200ms, background-color 200ms' },
    '.cm-ls-ran': { opacity: '0.5' },
    '.cm-ls-next': { boxShadow: 'inset 2px 0 0 var(--line-2)' },
    '.cm-ls-current': { backgroundColor: 'var(--brand-dim)', boxShadow: 'inset 3px 0 0 var(--brand)', opacity: '1' },
    '.cm-ls-error': { backgroundColor: 'var(--error-dim)', boxShadow: 'inset 3px 0 0 var(--error)', opacity: '1' },
    '.cm-ls-gutter': { width: '14px' },
    '.cm-ls-error-dot': { display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--error)', marginLeft: '4px' },
    '.cm-cursor': { display: 'none' },
    '&.cm-focused': { outline: 'none' },
    '.cm-activeLine': { backgroundColor: 'transparent' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: '#ffffff1a !important' },
  },
  { dark: true },
);

export function CodePane({ trace, frame, onLine }: { trace: Trace; frame: Frame; onLine: (line: number) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onLineRef = useRef(onLine);
  onLineRef.current = onLine;

  useEffect(() => {
    if (!host.current) return;
    const extensions: Extension[] = [
      lineNumbers(),
      errorGutter,
      lean4,
      syntaxHighlighting(leanHighlight),
      marksField,
      decorations,
      theme,
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      EditorView.contentAttributes.of({ 'aria-label': 'Lean source, read only', tabindex: '0' }),
      EditorView.domEventHandlers({
        mousedown: (e, v) => {
          const pos = v.posAtCoords({ x: e.clientX, y: e.clientY });
          if (pos !== null) onLineRef.current(v.state.doc.lineAt(pos).number);
          return false;
        },
      }),
    ];
    const v = new EditorView({ parent: host.current, state: EditorState.create({ doc: trace.source, extensions }) });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
  }, [trace.source]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const focus = frame.currentLine ?? frame.nextStep?.range.line;
    const effects: StateEffect<unknown>[] = [
      setMarks.of({
        current: frame.currentLine,
        next: frame.nextStep?.range.line,
        ran: frame.executedLines,
        // Failed steps already run, plus errors outside any step (visible from the start).
        errors: [...new Set([...frame.errorLines, ...unownedErrorLines(trace)])],
      }),
    ];
    if (focus !== undefined && focus <= v.state.doc.lines) {
      effects.push(EditorView.scrollIntoView(v.state.doc.line(focus).from, { y: 'nearest', yMargin: 48 }));
    }
    v.dispatch({ effects });
  }, [frame, trace]);

  return <div className="code-host" ref={host} />;
}
