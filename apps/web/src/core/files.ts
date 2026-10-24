// The user's own .lean files: naming rules and staleness. Pure; storage lives in ui/files.ts.

import type { Trace } from './types';

export type UserFile = Readonly<{
  id: string;
  name: string;
  source: string;
  /** The last trace Lean produced for this file, so reopening it needs no re-run. */
  trace?: Trace;
  /** The source that trace was produced from. */
  tracedSource?: string;
  updatedAt: number;
}>;

const MAX_NAME = 60;

/** A safe file name ending in .lean: no path separators or control characters, trimmed, bounded. */
export function normalizeName(raw: string): string {
  // Drop path separators, characters Windows forbids in names, and control characters.
  const base = [...raw]
    .filter((c) => c.charCodeAt(0) >= 32 && !'\\/:*?"<>|'.includes(c))
    .join('')
    .trim()
    .replace(/\.lean$/i, '')
    .slice(0, MAX_NAME)
    .trim();
  return `${base || 'Untitled'}.lean`;
}

/** `wanted`, or `wanted-2.lean`, `wanted-3.lean`... whichever is free (case-insensitive). */
export function uniqueName(existing: readonly string[], wanted: string): string {
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  const name = normalizeName(wanted);
  if (!taken.has(name.toLowerCase())) return name;
  const stem = name.slice(0, -'.lean'.length);
  for (let i = 2; ; i++) {
    const candidate = `${stem}-${i}.lean`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

/** The file has been edited since Lean last ran it (or has never been run). */
export const isStale = (f: UserFile): boolean => f.trace === undefined || f.tracedSource !== f.source;

/** Explorer order: alphabetical, case-insensitive, numbers in natural order. */
export const sortFiles = (files: readonly UserFile[]): readonly UserFile[] =>
  [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));

/** The display name of a sample in the explorer: its id as a .lean file. */
export const exampleFileName = (id: string): string => `${id}.lean`;
