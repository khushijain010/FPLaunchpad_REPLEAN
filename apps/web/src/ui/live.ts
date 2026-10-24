// Live mode: send Lean source to the backend, get a trace back, play it like a sample.
//
// Where the backend is: `VITE_LIVE_API` at build time (the deployed site points it at the hosted
// server), otherwise same origin `/api`, which the Vite dev and preview servers proxy to
// 127.0.0.1:8787 (`pnpm live`).

import { create } from 'zustand';
import { validateTrace } from '../core/validate';
import type { Trace } from '../core/types';
import { useStore } from './store';

const API = (import.meta.env.VITE_LIVE_API as string | undefined)?.replace(/\/+$/, '') ?? '';
/** A hosted backend is configured; free hosts sleep, so the first call may be slow. */
export const HOSTED = API !== '';

export const STARTER = `-- Paste a Lean 4 proof here, or upload a .lean file. Core Lean only (no imports).
theorem imp_chain (p q r : Prop) (hpq : p → q) (hqr : q → r) : p → r := by
  intro hp
  apply hqr
  apply hpq
  exact hp
`;

const DRAFT_KEY = 'replean.liveDraft';

export type Availability = 'checking' | 'yes' | 'no';

type LiveState = Readonly<{
  availability: Availability;
  isPublic: boolean;
  editing: boolean;
  source: string;
  running: boolean;
  slow: boolean;
  error: string | undefined;
}>;

const loadDraft = (): string => {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? STARTER;
  } catch {
    return STARTER;
  }
};

export const useLive = create<LiveState>()(() => ({
  availability: 'checking',
  isPublic: false,
  editing: false,
  source: loadDraft(),
  running: false,
  slow: false,
  error: undefined,
}));

export function setSource(source: string): void {
  useLive.setState({ source, error: undefined });
  try {
    localStorage.setItem(DRAFT_KEY, source);
  } catch {
    // A draft that isn't saved is only an inconvenience.
  }
}

export const openEditor = () => useLive.setState({ editing: true });
export const closeEditor = () => useLive.setState({ editing: false, error: undefined });

async function fetchJson(path: string, init: RequestInit, timeoutMs: number): Promise<{ status: number; body: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API}${path}`, { ...init, signal: ctrl.signal });
    const text = await res.text();
    // The dev proxy answers with HTML when nothing listens on 8787.
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

export async function runLive(): Promise<void> {
  const { source, running } = useLive.getState();
  if (running) return;
  // Named after the first theorem in the file, so the picker always matches the code.
  const title = /\b(?:theorem|lemma)\s+([^\s:({[]+)/.exec(source)?.[1] ?? (/\bexample\b/.test(source) ? 'example' : 'Your proof');
  useLive.setState({ running: true, slow: false, error: undefined });
  const slowTimer = setTimeout(() => useLive.setState({ slow: true }), 6000);
  try {
    const { status, body } = await fetchJson(
      '/api/trace',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source, title }) },
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
      throw new Error('No tactic proof found. Live mode steps through proofs written with `by`.');
    }
    useStore.getState().loadedLive(trace);
    useLive.setState({ editing: false });
  } catch (e) {
    const msg = e instanceof Error ? (e.name === 'AbortError' ? 'The Lean server did not respond in time.' : e.message) : String(e);
    useLive.setState({ error: msg });
  } finally {
    clearTimeout(slowTimer);
    useLive.setState({ running: false, slow: false });
  }
}
