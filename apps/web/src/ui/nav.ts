// What's open: editor tabs over examples and the user's files, and what opening each one does.

import { create } from 'zustand';
import { isStale } from '../core/files';
import { createFile, deleteFile, getFile, setActiveFile } from './files';
import { useLive } from './live';
import { loadSample } from './loader';
import { useStore } from './store';

export type Tab = Readonly<{ kind: 'example' | 'file'; id: string }>;

type NavState = Readonly<{ tabs: readonly Tab[]; active: Tab | undefined }>;

export const useNav = create<NavState>()(() => ({ tabs: [], active: undefined }));

export const sameTab = (a: Tab | undefined, b: Tab | undefined): boolean => !!a && !!b && a.kind === b.kind && a.id === b.id;

function focusTab(tab: Tab): void {
  useNav.setState((s) => ({ tabs: s.tabs.some((t) => sameTab(t, tab)) ? s.tabs : [...s.tabs, tab], active: tab }));
}

export function openExample(id: string, step = 0): void {
  focusTab({ kind: 'example', id });
  setActiveFile(undefined);
  useLive.setState({ editing: false, error: undefined });
  void loadSample(id, step);
}

/** Open one of the user's files: its visualization if Lean already ran this exact source, else the editor. */
export function openFile(id: string): void {
  const file = getFile(id);
  if (!file) return;
  focusTab({ kind: 'file', id });
  setActiveFile(id);
  useLive.setState({ error: undefined });
  if (file.trace && !isStale(file)) {
    useStore.getState().loadedFile(file.trace, id);
    useLive.setState({ editing: false });
  } else {
    useLive.setState({ editing: true });
  }
}

export function newFile(name?: string, source?: string): string {
  const id = createFile(name, source);
  focusTab({ kind: 'file', id });
  setActiveFile(id);
  useLive.setState({ editing: true, error: undefined });
  return id;
}

export const openTab = (tab: Tab) => (tab.kind === 'example' ? openExample(tab.id) : openFile(tab.id));

/** Close a tab. The last tab can't be closed: there's always something open. */
export function closeTab(tab: Tab): void {
  const { tabs, active } = useNav.getState();
  if (tabs.length <= 1) return;
  const i = tabs.findIndex((t) => sameTab(t, tab));
  if (i < 0) return;
  const rest = tabs.filter((_, j) => j !== i);
  useNav.setState({ tabs: rest });
  if (sameTab(active, tab)) openTab(rest[Math.min(i, rest.length - 1)]!);
}

/** Delete a file and its tab; if it was what's on screen, show something else. */
export function removeFile(id: string): void {
  const tab: Tab = { kind: 'file', id };
  const { tabs, active } = useNav.getState();
  const rest = tabs.filter((t) => !sameTab(t, tab));
  deleteFile(id);
  useNav.setState({ tabs: rest });
  if (sameTab(active, tab)) {
    const next = rest[rest.length - 1];
    if (next) openTab(next);
    else {
      const first = useStore.getState().samples[0];
      if (first) openExample(first.id);
    }
  }
}

/** Show the active file's editor. */
export const editActiveFile = () => useLive.setState({ editing: true, error: undefined });

/** Back from the editor to the active file's last result (even if it was edited since). */
export function showActiveFileTrace(): void {
  const active = useNav.getState().active;
  const file = active?.kind === 'file' ? getFile(active.id) : undefined;
  if (!file?.trace) return;
  useStore.getState().loadedFile(file.trace, file.id);
  useLive.setState({ editing: false, error: undefined });
}
