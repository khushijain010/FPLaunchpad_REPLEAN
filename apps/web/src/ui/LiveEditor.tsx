// Live mode's left pane: paste, type, upload or drop a .lean file, then Run.

import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { lean4, leanHighlight } from './leanLanguage';
import { closeEditor, HOSTED, runLive, setSource, STARTER, useLive } from './live';
import { useStore } from './store';

const MAX_BYTES = 64 * 1024;

const theme = EditorView.theme(
  {
    '&': { height: '100%', backgroundColor: 'var(--panel)', fontSize: '14px' },
    '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.65' },
    '.cm-content': { padding: '12px 0', caretColor: 'var(--brand)' },
    '.cm-cursor': { borderLeftColor: 'var(--brand)' },
    '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: 'var(--faint)' },
    '.cm-activeLine': { backgroundColor: '#ffffff08' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--muted)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: '#ff4f0040 !important' },
  },
  { dark: true },
);

export function LiveEditor() {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { running, slow, error, availability, isPublic } = useLive();
  const hasTrace = useStore((s) => s.trace !== undefined);

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: useLive.getState().source,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([
            { key: 'Mod-Enter', run: () => (void runLive(), true) },
            indentWithTab,
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          lean4,
          syntaxHighlighting(leanHighlight),
          theme,
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': 'Your Lean proof' }),
          EditorView.updateListener.of((u) => u.docChanged && setSource(u.state.doc.toString())),
        ],
      }),
    });
    view.current = v;
    v.focus();
    return () => v.destroy();
  }, []);

  const replaceDoc = (text: string, title?: string) => {
    setSource(text, title);
    const v = view.current;
    v?.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text } });
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) return useLive.setState({ error: `${file.name} is over 64 KB. Live mode is for short proofs.` });
    replaceDoc((await file.text()).replace(/\r\n/g, '\n'), file.name.replace(/\.lean$/, ''));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    void readFile(e.dataTransfer.files[0]);
  };

  const status = running
    ? slow && HOSTED
      ? 'Waking the Lean server. Free hosting naps when nobody visits; this can take a minute.'
      : 'Asking Lean nicely...'
    : availability === 'checking'
      ? HOSTED
        ? 'Checking the Lean server (it may be waking up)...'
        : 'Looking for the local Lean server...'
      : availability === 'no'
        ? HOSTED
          ? 'The Lean server is not answering right now. The samples still work.'
          : 'No Lean server found. Start one with `pnpm live` from the repo root.'
        : null;

  return (
    <div
      className={`live${dragging ? ' is-dragging' : ''}`}
      onDragOver={(e) => (e.preventDefault(), setDragging(true))}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="live-head">
        <h2>Your own proof</h2>
        <p className="muted small">
          Paste a proof, upload a <code>.lean</code> file, or drop one here. Core Lean only, no imports.
          {isPublic && ' The public server runs proofs, not programs: #eval, native_decide, macros and IO are refused.'}
        </p>
      </div>
      <div className="live-editor" ref={host} />
      <div className="live-bar">
        <button className="btn primary" onClick={() => void runLive()} disabled={running || availability === 'no'} title="Run (Ctrl+Enter)">
          {running ? 'Running...' : 'Run'}
          <kbd className="live-kbd">Ctrl ↵</kbd>
        </button>
        <button className="btn" onClick={() => fileInput.current?.click()} disabled={running}>
          Upload .lean
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".lean,text/plain"
          hidden
          onChange={(e) => {
            void readFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button className="btn ghost" onClick={() => replaceDoc(STARTER, 'Your proof')} disabled={running}>
          Example
        </button>
        {hasTrace && (
          <button className="btn ghost" onClick={closeEditor} disabled={running}>
            Back to player
          </button>
        )}
      </div>
      {error ? (
        <p className="live-error" role="alert">
          {error}
        </p>
      ) : (
        status && (
          <p className="live-status" role="status">
            {status}
          </p>
        )
      )}
    </div>
  );
}
