// Editor for the active file in "My files". Edits are saved to the file as you type; Run sends
// it to Lean and shows the visualization. Mounted with key={file.id}, so switching files gives a
// fresh editor with that file's text and its own undo history.

import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { isStale, type UserFile } from '../core/files';
import { updateSource } from './files';
import { lean4, leanHighlight } from './leanLanguage';
import { HOSTED, runFile, useLive } from './live';
import { showActiveFileTrace } from './nav';

const MAX_BYTES = 64 * 1024;

const theme = EditorView.theme(
  {
    '&': { height: '100%', backgroundColor: 'var(--panel)', fontSize: '14px' },
    '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.65' },
    '.cm-content': { padding: '12px 0', caretColor: 'var(--brand)' },
    '.cm-cursor': { borderLeftColor: 'var(--brand)' },
    '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: 'var(--faint)' },
    '.cm-activeLine': { backgroundColor: 'var(--active-line)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--muted)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--selection) !important' },
  },
  { dark: true },
);

export function LiveEditor({ file }: { file: UserFile }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const [dragging, setDragging] = useState(false);
  const { running, slow, error, availability, isPublic } = useLive();

  useEffect(() => {
    if (!host.current) return;
    const id = file.id;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: file.source,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([
            { key: 'Mod-Enter', run: () => (void runFile(id), true) },
            { key: 'Mod-s', run: () => true }, // Files save as you type; don't open the browser's save dialog.
            indentWithTab,
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          lean4,
          syntaxHighlighting(leanHighlight),
          theme,
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': `Editing ${file.name}` }),
          EditorView.updateListener.of((u) => u.docChanged && updateSource(id, u.state.doc.toString())),
        ],
      }),
    });
    view.current = v;
    v.focus();
    return () => v.destroy();
    // A new editor per file (the parent keys this component by file id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    if (dropped.size > MAX_BYTES) return useLive.setState({ error: `${dropped.name} exceeds 64 KB.` });
    const text = (await dropped.text()).replace(/\r\n/g, '\n');
    const v = view.current;
    v?.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text } });
  };

  const status = running
    ? slow && HOSTED
      ? 'Starting the Lean server (the free host sleeps when idle). This can take up to a minute.'
      : 'Running Lean…'
    : availability === 'checking'
      ? HOSTED
        ? 'Connecting to the Lean server…'
        : 'Connecting to the local Lean server…'
      : availability === 'no'
        ? HOSTED
          ? 'The Lean server is unavailable right now. Your file is saved; run it later.'
          : 'No local Lean server found. Start it with pnpm live from the repo root. Your file is saved.'
        : null;

  return (
    <div
      className={`live${dragging ? ' is-dragging' : ''}`}
      onDragOver={(e) => (e.preventDefault(), setDragging(true))}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => void onDrop(e)}
    >
      <p className="live-note">
        Saved in this browser as you type · core Lean only, no imports{isPublic ? ' · #eval, native_decide, macros and IO are refused' : ''}
      </p>
      <div className="live-editor" ref={host} />
      <div className="live-bar">
        <button className="btn primary" onClick={() => void runFile(file.id)} disabled={running || availability === 'no'} title="Run (Ctrl+Enter)">
          {running ? 'Running…' : 'Run'}
          <kbd className="live-kbd">Ctrl ↵</kbd>
        </button>
        {file.trace && (
          <button className="btn ghost" onClick={showActiveFileTrace} disabled={running} title={isStale(file) ? 'Shows the result from before your latest edits' : undefined}>
            {isStale(file) ? 'Show last result' : 'Show visualization'}
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
