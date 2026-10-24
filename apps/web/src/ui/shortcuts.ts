import { useEffect } from 'react';
import type { ViewId } from '../core/types';
import { useStore } from './store';
import { toggleTheme } from './theme';

export const VIEW_KEYS: readonly ViewId[] = ['tree', 'list', 'rewrite', 'shrink'];

export const SHORTCUTS: readonly Readonly<[keys: string, what: string]>[] = [
  ['→  Space', 'Next line'],
  ['←', 'Previous line'],
  ['Home / End', 'Start / end of the proof'],
  ['P', 'Autoplay on / off'],
  ['[  ]', 'Slower / faster'],
  ['1 2 3 4', 'Tree, List Lab, Rewrite, Shrink'],
  ['D', '2D / 3D tree'],
  ['F', 'Full screen visualization'],
  ['B', 'Files panel'],
  ['T', 'Light / dark theme'],
  ['?', 'Help'],
  ['Esc', 'Close dialogs, leave full screen'],
];

export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const s = useStore.getState();
      if (s.dialog !== 'none') {
        if (e.key === 'Escape') s.setDialog('none');
        return;
      }
      const act = (f: () => void) => {
        e.preventDefault();
        f();
      };
      // Space on a focused button should press that button, not step the proof.
      const onButton = target?.tagName === 'BUTTON';
      switch (e.key) {
        case 'ArrowRight':
          return act(() => (s.stopPlay(), s.next()));
        case ' ':
          if (onButton) return;
          return act(() => (s.stopPlay(), s.next()));
        case 'ArrowLeft':
          return act(() => (s.stopPlay(), s.prev()));
        case 'Home':
          return act(s.reset);
        case 'End':
          return act(() => (s.stopPlay(), s.end()));
        case 'p':
        case 'P':
          return act(s.togglePlay);
        case '[':
          return act(s.slower);
        case ']':
          return act(s.faster);
        case 'f':
        case 'F':
          return act(s.togglePresentation);
        case 'd':
        case 'D':
        case 'l':
        case 'L':
          return act(s.toggleLite);
        case 'b':
        case 'B':
          return act(s.toggleExplorer);
        case 't':
        case 'T':
          return act(toggleTheme);
        case '?':
          return act(() => s.setDialog('help'));
        case 'Escape':
          if (s.presentation) return act(s.togglePresentation);
          return;
        default: {
          const n = Number(e.key);
          if (n >= 1 && n <= VIEW_KEYS.length) act(() => s.setView(VIEW_KEYS[n - 1]!));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
