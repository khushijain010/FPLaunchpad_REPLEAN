// Light / dark theme. The choice is remembered; a first visit follows the system setting.
// The theme is a `data-theme` attribute on <html>; every color in the CSS is a variable that
// switches with it, and the 3D scene reads the same choice from this store.

import { create } from 'zustand';

export type Theme = 'dark' | 'light';
const KEY = 'replean.theme';

const initial = (): Theme => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Fall through to the system preference.
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const apply = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f3f0' : '#0b0b0c');
};

export const useTheme = create<{ theme: Theme }>()(() => ({ theme: initial() }));
apply(useTheme.getState().theme);

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Still applies for this visit.
  }
  apply(theme);
  useTheme.setState({ theme });
}

export const toggleTheme = () => setTheme(useTheme.getState().theme === 'dark' ? 'light' : 'dark');
