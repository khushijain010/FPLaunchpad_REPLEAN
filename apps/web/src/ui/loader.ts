// Side effects at the edge: fetching traces, syncing the URL hash, autoplay.

import { useEffect } from 'react';
import { validateTrace } from '../core/validate';
import type { SampleInfo } from '../core/types';
import { checkLive } from './live';
import { useNav } from './nav';
import { fileIdOf, useStore } from './store';

const base = import.meta.env.BASE_URL;

/** `#sample=and_comm&step=3` <-> store. */
export function readHash(): Readonly<{ sample?: string; step?: number }> {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const step = Number(params.get('step'));
  return {
    sample: params.get('sample') ?? undefined,
    step: Number.isFinite(step) && params.has('step') ? step : undefined,
  };
}

export async function loadSample(id: string, step = 0): Promise<void> {
  const { startLoading, loaded, failed, samples } = useStore.getState();
  const info = samples.find((s) => s.id === id);
  if (!info) return failed('error', `There is no sample called "${id}".`);
  startLoading(id);
  try {
    const res = await fetch(`${base}traces/${info.file}`);
    if (!res.ok) throw new Error(`Could not fetch ${info.file} (HTTP ${res.status}).`);
    loaded(validateTrace(await res.json()), step);
  } catch (e) {
    failed('error', e instanceof Error ? e.message : String(e));
  }
}

export function useBoot(): void {
  useEffect(() => {
    // Ping the live backend early: a sleeping free-tier host starts waking while you read.
    void checkLive();
    void (async () => {
      const { setSamples, failed } = useStore.getState();
      try {
        const res = await fetch(`${base}traces/index.json`);
        if (res.status === 404) return failed('empty');
        if (!res.ok) throw new Error(`Could not fetch the sample list (HTTP ${res.status}).`);
        const text = await res.text();
        // Vite's dev server answers unknown paths with index.html, not a 404.
        if (text.trimStart().startsWith('<')) return failed('empty');
        const samples = JSON.parse(text) as SampleInfo[];
        if (samples.length === 0) return failed('empty');
        setSamples(samples);
        const hash = readHash();
        const first = samples.find((s) => s.id === hash.sample) ?? samples[0]!;
        // The first sample opens as the first editor tab.
        const tab = { kind: 'example', id: first.id } as const;
        useNav.setState({ tabs: [tab], active: tab });
        await loadSample(first.id, hash.sample === first.id ? hash.step : 0);
      } catch (e) {
        failed('error', e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);
}

export function useHashSync(): void {
  const sampleId = useStore((s) => s.sampleId);
  const step = useStore((s) => s.step);
  const status = useStore((s) => s.status);
  useEffect(() => {
    // A live trace can't be reloaded from a link, so it gets no permalink.
    if (status !== 'ready' || !sampleId || fileIdOf(sampleId)) return;
    const next = `#sample=${sampleId}&step=${step}`;
    if (window.location.hash !== next) history.replaceState(null, '', next);
  }, [sampleId, step, status]);
}

/** Base delay between autoplay steps at 1x. */
export const AUTOPLAY_MS = 1500;

export function useAutoplay(): void {
  const playing = useStore((s) => s.playing);
  const speed = useStore((s) => s.speed);
  const step = useStore((s) => s.step);
  const total = useStore((s) => s.trace?.steps.length ?? 0);
  useEffect(() => {
    if (!playing) return;
    if (step >= total) {
      useStore.getState().stopPlay();
      return;
    }
    const t = window.setTimeout(() => useStore.getState().next(), AUTOPLAY_MS / speed);
    return () => window.clearTimeout(t);
  }, [playing, speed, step, total]);
}
