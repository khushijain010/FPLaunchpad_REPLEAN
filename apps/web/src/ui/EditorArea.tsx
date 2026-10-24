// The editor column's top half: tabs, a breadcrumb toolbar, and the code itself, either the
// read-only player view (with the current line lit) or the editable editor for a user file.

import type { Frame } from '../core/frames';
import { exampleFileName, isStale } from '../core/files';
import type { Trace } from '../core/types';
import { CodePane } from './CodePane';
import { STARTER, useFiles } from './files';
import { CloseIcon, CopyIcon, FileIcon, PencilIcon, PlusIcon } from './icons';
import { useLive } from './live';
import { LiveEditor } from './LiveEditor';
import { closeTab, editActiveFile, newFile, openTab, sameTab, useNav, type Tab } from './nav';
import { useStore } from './store';

function useTabName(): (tab: Tab) => string {
  const files = useFiles((s) => s.files);
  return (tab) => (tab.kind === 'example' ? exampleFileName(tab.id) : (files.find((f) => f.id === tab.id)?.name ?? 'missing.lean'));
}

function TabBar() {
  const tabs = useNav((s) => s.tabs);
  const active = useNav((s) => s.active);
  const nameOf = useTabName();
  return (
    <div className="tabbar" role="tablist" aria-label="Open files">
      {tabs.map((t) => {
        const on = sameTab(t, active);
        return (
          <div key={`${t.kind}:${t.id}`} className={`file-tab${on ? ' is-on' : ''}`}>
            <button className="file-tab-main" role="tab" aria-selected={on} onClick={() => openTab(t)} title={nameOf(t)}>
              <FileIcon />
              <span>{nameOf(t)}</span>
            </button>
            {tabs.length > 1 && (
              <button className="file-tab-close" onClick={() => closeTab(t)} aria-label={`Close ${nameOf(t)}`} title="Close">
                <CloseIcon />
              </button>
            )}
          </div>
        );
      })}
      <button className="icon-btn small tab-new" onClick={() => newFile('proof.lean', STARTER)} aria-label="New file" title="New file">
        <PlusIcon />
      </button>
    </div>
  );
}

export function EditorArea({ trace, frame, onLine }: { trace: Trace | undefined; frame: Frame | undefined; onLine: (line: number) => void }) {
  const active = useNav((s) => s.active);
  const editing = useLive((s) => s.editing);
  const samples = useStore((s) => s.samples);
  const file = useFiles((s) => (active?.kind === 'file' ? s.files.find((f) => f.id === active.id) : undefined));
  const example = active?.kind === 'example' ? samples.find((s) => s.id === active.id) : undefined;

  const crumbs =
    active?.kind === 'example' ? ['Examples', example?.category ?? '', exampleFileName(active.id)].filter(Boolean) : file ? ['My Proofs', file.name] : [];

  return (
    <section className="panel editor-panel" aria-label="Editor">
      <TabBar />
      <div className="editor-toolbar">
        <nav className="crumbs" aria-label="Location">
          {crumbs.map((c, i) => (
            <span key={i} className={i === crumbs.length - 1 ? 'crumb is-last' : 'crumb'}>
              {c}
            </span>
          ))}
        </nav>
        <div className="editor-actions">
          {example && trace && (
            <button className="btn ghost small" onClick={() => newFile(exampleFileName(example.id), trace.source)} title="Make an editable copy in My Proofs">
              <CopyIcon /> Copy to My Proofs
            </button>
          )}
          {file && !editing && (
            <>
              {isStale(file) && <span className="stale-note">Edited since the last run</span>}
              <button className="btn ghost small" onClick={editActiveFile}>
                <PencilIcon /> Edit
              </button>
            </>
          )}
        </div>
      </div>
      <div className="editor-body">
        {file && editing ? (
          <LiveEditor key={file.id} file={file} />
        ) : trace && frame ? (
          <CodePane trace={trace} frame={frame} onLine={onLine} />
        ) : (
          <p className="view-empty">Open a file from the Files panel.</p>
        )}
      </div>
    </section>
  );
}
