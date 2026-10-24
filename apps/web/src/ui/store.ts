// The one store. It holds which trace, which step, and a few UI toggles.
// Everything visual is derived from (trace, step) by the pure core.

import { create } from 'zustand';
import { clampStep } from '../core/frames';
import type { SampleInfo, Trace, ViewId } from '../core/types';

/** A trace that came from one of the user's files is filed under `file:<id>` instead of a sample id. */
export const FILE_PREFIX = 'file:';
export const fileIdOf = (sampleId: string | undefined): string | undefined =>
  sampleId?.startsWith(FILE_PREFIX) ? sampleId.slice(FILE_PREFIX.length) : undefined;

export type Speed = 0.5 | 1 | 2;
export const SPEEDS: readonly Speed[] = [0.5, 1, 2];
export type Dialog = 'none' | 'help';
export type LoadStatus = 'loading' | 'ready' | 'empty' | 'error';

type State = Readonly<{
  samples: readonly SampleInfo[];
  sampleId: string | undefined;
  trace: Trace | undefined;
  status: LoadStatus;
  error: string | undefined;
  step: number;
  /** A view the user picked. Wins over the automatic choice until the next sample loads. */
  manualView: ViewId | undefined;
  playing: boolean;
  speed: Speed;
  lite: boolean;
  presentation: boolean;
  dialog: Dialog;
  whyOpen: boolean;
  /** The file explorer on the left. */
  explorerOpen: boolean;
}>;

type Actions = Readonly<{
  setSamples: (samples: readonly SampleInfo[]) => void;
  startLoading: (sampleId: string) => void;
  loaded: (trace: Trace, step?: number) => void;
  /** A trace Lean produced for one of the user's files. */
  loadedFile: (trace: Trace, fileId: string) => void;
  failed: (status: 'empty' | 'error', message?: string) => void;
  goto: (k: number) => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  end: () => void;
  togglePlay: () => void;
  stopPlay: () => void;
  setSpeed: (s: Speed) => void;
  faster: () => void;
  slower: () => void;
  /** `undefined` hands the choice back to the automatic picker. */
  setView: (v: ViewId | undefined) => void;
  toggleLite: () => void;
  /** true = 2D tree, false = 3D tree. */
  setLite: (lite: boolean) => void;
  togglePresentation: () => void;
  setDialog: (d: Dialog) => void;
  toggleWhy: () => void;
  toggleExplorer: () => void;
}>;

const initialLite = (() => {
  try {
    return localStorage.getItem('replean.lite') === '1';
  } catch {
    return false;
  }
})();

/** Open by default on wide screens, closed on phones; then whatever the user chose last. */
const initialExplorer = (() => {
  try {
    const saved = localStorage.getItem('replean.explorer');
    if (saved !== null) return saved === '1';
  } catch {
    // Fall through to the default.
  }
  return typeof window === 'undefined' || window.innerWidth >= 900;
})();

export const useStore = create<State & Actions>()((set, get) => {
  const move = (k: number) => {
    const { trace } = get();
    if (trace) set({ step: clampStep(trace, k) });
  };
  const shiftSpeed = (d: number) => {
    const i = SPEEDS.indexOf(get().speed);
    set({ speed: SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, i + d))]! });
  };
  return {
    samples: [],
    sampleId: undefined,
    trace: undefined,
    status: 'loading',
    error: undefined,
    step: 0,
    manualView: undefined,
    playing: false,
    speed: 1,
    lite: initialLite,
    presentation: false,
    dialog: 'none',
    whyOpen: true,
    explorerOpen: initialExplorer,

    setSamples: (samples) => set({ samples }),
    startLoading: (sampleId) => set({ sampleId, status: 'loading', playing: false, manualView: undefined }),
    loaded: (trace, step = 0) => set({ trace, status: 'ready', error: undefined, step: clampStep(trace, step) }),
    loadedFile: (trace, fileId) =>
      set({ trace, sampleId: FILE_PREFIX + fileId, status: 'ready', error: undefined, step: 0, playing: false, manualView: undefined }),
    failed: (status, message) => set({ status, error: message, trace: undefined, playing: false }),
    goto: move,
    next: () => move(get().step + 1),
    prev: () => move(get().step - 1),
    reset: () => {
      set({ playing: false });
      move(0);
    },
    end: () => move(Number.MAX_SAFE_INTEGER),
    togglePlay: () => {
      const { trace, step, playing } = get();
      if (!trace) return;
      // Pressing play at the end starts over, which is what people mean.
      if (!playing && step >= trace.steps.length) set({ step: 0 });
      set({ playing: !playing });
    },
    stopPlay: () => set({ playing: false }),
    setSpeed: (speed) => set({ speed }),
    faster: () => shiftSpeed(1),
    slower: () => shiftSpeed(-1),
    setView: (manualView) => set({ manualView }),
    setLite: (lite) => {
      try {
        localStorage.setItem('replean.lite', lite ? '1' : '0');
      } catch {
        // Remembered for this visit only.
      }
      set({ lite });
    },
    toggleLite: () => {
      const lite = !get().lite;
      try {
        localStorage.setItem('replean.lite', lite ? '1' : '0');
      } catch {
        // Storage can be unavailable (private mode). Lite mode still works for this visit.
      }
      set({ lite });
    },
    togglePresentation: () => set({ presentation: !get().presentation }),
    setDialog: (dialog) => set({ dialog }),
    toggleWhy: () => set({ whyOpen: !get().whyOpen }),
    toggleExplorer: () => {
      const explorerOpen = !get().explorerOpen;
      try {
        localStorage.setItem('replean.explorer', explorerOpen ? '1' : '0');
      } catch {
        // Not remembered across visits; still works now.
      }
      set({ explorerOpen });
    },
  };
});
