// The files panel: examples grouped by topic, and "My Proofs", the user's own files.

import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { exampleFileName, isStale, sortFiles, type UserFile } from '../core/files';
import { renameFile, STARTER, useFiles } from './files';
import { ChevronIcon, FileIcon, FolderIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon, UploadIcon } from './icons';
import { newFile, openExample, openFile, removeFile, sameTab, useNav } from './nav';
import { useStore } from './store';

const MAX_BYTES = 64 * 1024;
const CATEGORY_ORDER = ['Logic', 'Numbers', 'Lists', 'Programs'];

function Folder({ name, depth, children, defaultOpen = true }: { name: string; depth: number; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <li className="tree-folder">
      <button className="tree-row folder-row" style={{ paddingLeft: 8 + depth * 14 }} onClick={() => setOpen(!open)} aria-expanded={open}>
        <ChevronIcon open={open} />
        <FolderIcon open={open} />
        <span className="tree-name">{name}</span>
      </button>
      {open && <ul className="tree-list">{children}</ul>}
    </li>
  );
}

function FileRow({ file, depth, active }: { file: UserFile; depth: number; active: boolean }) {
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const stale = file.trace !== undefined && isStale(file);

  const commit = () => {
    const value = input.current?.value ?? '';
    if (value.trim()) renameFile(file.id, value);
    setRenaming(false);
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'F2') {
      e.preventDefault();
      setRenaming(true);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      setConfirming(true);
    }
  };

  if (renaming) {
    return (
      <li className="tree-file">
        <div className="tree-row is-editing" style={{ paddingLeft: 8 + depth * 14 + 14 }}>
          <FileIcon />
          <input
            ref={input}
            className="rename-input"
            defaultValue={file.name}
            autoFocus
            aria-label={`Rename ${file.name}`}
            onFocus={(e) => e.target.setSelectionRange(0, Math.max(0, file.name.length - '.lean'.length))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setRenaming(false);
            }}
            onBlur={commit}
          />
        </div>
      </li>
    );
  }

  return (
    <li className={`tree-file${active ? ' is-active' : ''}`}>
      <button
        className="tree-row file-row"
        style={{ paddingLeft: 8 + depth * 14 + 14 }}
        onClick={() => openFile(file.id)}
        onDoubleClick={() => setRenaming(true)}
        onKeyDown={onKey}
        aria-current={active ? 'page' : undefined}
        title={stale ? `${file.name}: edited since the last run` : file.trace ? file.name : `${file.name}: not run yet`}
      >
        <FileIcon />
        <span className="tree-name">{file.name}</span>
        {stale && <span className="stale-dot" aria-label="edited since the last run" />}
      </button>
      {confirming ? (
        <span className="row-confirm">
          Delete?
          <button className="link-btn danger" onClick={() => removeFile(file.id)}>
            Yes
          </button>
          <button className="link-btn" onClick={() => setConfirming(false)} autoFocus>
            No
          </button>
        </span>
      ) : (
        <span className="row-actions">
          <button className="row-action" onClick={() => setRenaming(true)} aria-label={`Rename ${file.name}`} title="Rename (F2)">
            <PencilIcon />
          </button>
          <button className="row-action" onClick={() => setConfirming(true)} aria-label={`Delete ${file.name}`} title="Delete">
            <TrashIcon />
          </button>
        </span>
      )}
    </li>
  );
}

export function Sidebar() {
  const samples = useStore((s) => s.samples);
  const files = useFiles((s) => s.files);
  const storageProblem = useFiles((s) => s.storageProblem);
  const active = useNav((s) => s.active);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const upload = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const matches = (name: string, extra = '') => !q || name.toLowerCase().includes(q) || extra.toLowerCase().includes(q);
  const groups = useMemo(() => {
    const by = new Map<string, typeof samples>();
    for (const s of samples) {
      const c = s.category ?? 'Examples';
      by.set(c, [...(by.get(c) ?? []), s]);
    }
    const rank = (c: string) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length);
    return [...by.entries()].sort(([a], [b]) => rank(a) - rank(b));
  }, [samples]);
  const myFiles = sortFiles(files).filter((f) => matches(f.name));

  const addFiles = async (list: FileList | null) => {
    setUploadError(undefined);
    const picked = [...(list ?? [])];
    let lastId: string | undefined;
    for (const f of picked) {
      if (!/\.lean$/i.test(f.name)) {
        setUploadError(`${f.name} isn't a .lean file.`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        setUploadError(`${f.name} is over 64 KB.`);
        continue;
      }
      lastId = newFile(f.name, (await f.text()).replace(/\r\n/g, '\n'));
    }
    if (lastId) openFile(lastId);
  };

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragging(false);
    void addFiles(e.dataTransfer.files);
  };

  return (
    <nav
      className={`sidebar${dragging ? ' is-dragging' : ''}`}
      aria-label="Files"
      onDragOver={(e) => (e.preventDefault(), setDragging(true))}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDragging(false)}
      onDrop={onDrop}
    >
      <div className="sidebar-head">
        <h2>Files</h2>
        <div className="sidebar-tools">
          <button className="icon-btn small" onClick={() => newFile('proof.lean', STARTER)} aria-label="New file" title="New file">
            <PlusIcon />
          </button>
          <button className="icon-btn small" onClick={() => upload.current?.click()} aria-label="Upload .lean files" title="Upload .lean files">
            <UploadIcon />
          </button>
          <button className="icon-btn small" onClick={() => setSearching(!searching)} aria-pressed={searching} aria-label="Search files" title="Search files">
            <SearchIcon />
          </button>
        </div>
        <input
          ref={upload}
          type="file"
          accept=".lean"
          multiple
          hidden
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {searching && (
        <input className="sidebar-search" placeholder="Search files" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus aria-label="Search files" />
      )}

      <ul className="tree">
        <Folder name="Examples" depth={0}>
          {groups.map(([category, items]) => {
            const shown = items.filter((s) => matches(exampleFileName(s.id), s.title));
            if (shown.length === 0) return null;
            return (
              <Folder key={category} name={category} depth={1}>
                {shown.map((s) => {
                  const isActive = sameTab(active, { kind: 'example', id: s.id });
                  return (
                    <li key={s.id} className={`tree-file${isActive ? ' is-active' : ''}`}>
                      <button className="tree-row file-row" style={{ paddingLeft: 8 + 2 * 14 + 14 }} onClick={() => openExample(s.id)} aria-current={isActive ? 'page' : undefined} title={s.title}>
                        <FileIcon />
                        <span className="tree-name">{exampleFileName(s.id)}</span>
                      </button>
                    </li>
                  );
                })}
              </Folder>
            );
          })}
        </Folder>
        <Folder name="My Proofs" depth={0}>
          {myFiles.map((f) => (
            <FileRow key={f.id} file={f} depth={1} active={sameTab(active, { kind: 'file', id: f.id })} />
          ))}
          {files.length === 0 && (
            <li className="tree-empty">
              <p>No files yet.</p>
              <button className="link-btn" onClick={() => newFile('proof.lean', STARTER)}>
                New file
              </button>
              <span aria-hidden> · </span>
              <button className="link-btn" onClick={() => upload.current?.click()}>
                Upload
              </button>
            </li>
          )}
        </Folder>
      </ul>

      {(uploadError || storageProblem) && (
        <div className="sidebar-foot">
          {uploadError && (
            <p className="sidebar-error" role="alert">
              {uploadError}
            </p>
          )}
          {storageProblem && <p>This browser is not saving files right now (private mode or full storage).</p>}
        </div>
      )}
    </nav>
  );
}
