// Running the user's files: send a file's Lean source to the backend, get a trace back, play it.
//
// Where the backend is: `VITE_LIVE_API` at build time (the deployed site points it at the hosted
// server), otherwise same origin `/api`, which the Vite dev and preview servers proxy to
// 127.0.0.1:8791 (`pnpm live`).

import { create } from 'zustand';
import { importProblem } from '../core/imports';
import { validateTrace } from '../core/validate';
import type { Trace } from '../core/types';
import { getFile, saveTrace, useFiles } from './files';
import { useStore } from './store';

const API = (import.meta.env.VITE_LIVE_API as string | undefined)?.replace(/\/+$/, '') ?? '';
/** A hosted backend is configured; free hosts sleep, so the first call may be slow. */
export const HOSTED = API !== '';

export type Availability = 'checking' | 'yes' | 'no';

type LiveState = Readonly<{
  availability: Availability;
  isPublic: boolean;
  /** The active file is open in the editor (as opposed to its visualization in the player). */
  editing: boolean;
  running: boolean;
  slow: boolean;
  error: string | undefined;
}>;

export const useLive = create<LiveState>()(() => ({
  availability: 'checking',
  isPublic: false,
  editing: false,
  running: false,
  slow: false,
  error: undefined,
}));

const activeFileId = (): string | undefined => useFiles.getState().activeId;

async function fetchJson(path: string, init: RequestInit, timeoutMs: number): Promise<{ status: number; body: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API}${path}`, { ...init, signal: ctrl.signal });
    const text = await res.text();
    // The dev proxy answers with HTML (or another server's JSON) when the backend isn't running.
    const body: unknown = text.trimStart().startsWith('{') ? JSON.parse(text) : null;
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

/** Ask whether a backend exists. A sleeping free-tier host can take ~a minute to answer. */
export async function checkLive(): Promise<void> {
  useLive.setState({ availability: 'checking' });
  try {
    const { body } = await fetchJson('/api/health', {}, HOSTED ? 90_000 : 5_000);
    const h = body as { ok?: boolean; public?: boolean } | null;
    useLive.setState({ availability: h?.ok ? 'yes' : 'no', isPublic: Boolean(h?.public) });
  } catch {
    useLive.setState({ availability: 'no' });
  }
}

/** Run a file (the active one by default) through Lean and show the result. */
export async function runFile(id = activeFileId()): Promise<void> {
  const file = getFile(id);
  if (!file || useLive.getState().running) return;
  const source = file.source;
  // Library imports can't run here; explain that instead of sending the file to fail.
  const imports = importProblem(source);
  if (imports) {
    useLive.setState({ error: imports.message });
    return;
  }
  useLive.setState({ running: true, slow: false, error: undefined });
  const slowTimer = setTimeout(() => useLive.setState({ slow: true }), 6000);
  try {
    const { status, body } = await fetchJson(
      '/api/trace',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source, title: file.name }) },
      150_000,
    );
    const b = body as { trace?: unknown; error?: string } | null;
    if (status !== 200 || !b?.trace) {
      throw new Error(b?.error ?? (status === 0 ? 'No answer from the Lean server.' : `The Lean server answered ${status}.`));
    }
    const trace: Trace = validateTrace(b.trace);
    const hasErrors = trace.messages.some((m) => m.severity === 'error');
    // A file Lean rejected still opens in the player, so its errors show in the visualization panel.
    if (trace.steps.length === 0 && !hasErrors) {
      throw new Error('No tactic proof found. Write a proof with `by` to step through it.');
    }
    saveTrace(file.id, trace, source);
    // The user may have switched files while Lean was running; only show it if this file is still open.
    if (activeFileId() === file.id) {
      useStore.getState().loadedFile(trace, file.id);
      useLive.setState({ editing: false });
    }
  } catch (e) {
    const msg = e instanceof Error ? (e.name === 'AbortError' ? 'The Lean server did not respond in time.' : e.message) : String(e);
    useLive.setState({ error: msg });
  } finally {
    clearTimeout(slowTimer);
    useLive.setState({ running: false, slow: false });
  }
}
