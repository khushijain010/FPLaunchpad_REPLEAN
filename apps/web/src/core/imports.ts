// Replean runs core Lean only. A file that imports a library can't run, so say why, plainly,
// before sending it anywhere.

const LIBRARY_TACTICS: Readonly<Record<string, string>> = {
  ring: 'omega (linear arithmetic) or simp',
  ring_nf: 'omega or simp',
  linarith: 'omega',
  nlinarith: 'omega (linear only) or a manual proof',
  norm_num: 'decide, simp or omega',
  positivity: 'omega',
  use: 'exact ⟨witness, proof⟩',
  field_simp: 'simp',
  aesop: 'simp or a manual proof',
  tauto: 'cases and exact',
};

export type ImportProblem = Readonly<{ libraries: readonly string[]; message: string }>;

/** Explain why a file that imports libraries can't run here, or return undefined. */
export function importProblem(source: string): ImportProblem | undefined {
  const libraries = [...new Set([...source.matchAll(/^\s*import\s+([A-Za-z0-9_.]+)/gm)].map((m) => m[1]!.split('.')[0]!))];
  if (libraries.length === 0) return undefined;
  const usesMathlib = libraries.some((l) => l === 'Mathlib');
  const used = Object.keys(LIBRARY_TACTICS).filter((t) => new RegExp(`(^|[^\\w.])${t}(?![\\w'])`, 'm').test(source));
  const hints = used.map((t) => `${t} → ${LIBRARY_TACTICS[t]}`);
  const message = [
    usesMathlib
      ? 'This file imports Mathlib. Replean runs core Lean 4 only: Mathlib is several gigabytes and needs more memory than the Lean server has.'
      : `This file imports ${libraries.join(', ')}. Replean runs core Lean 4 only, with no imports.`,
    'Remove the import lines and use core tactics instead.',
    hints.length > 0 ? `Core replacements: ${hints.join('; ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return { libraries, message };
}
