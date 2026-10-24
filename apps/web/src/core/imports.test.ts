import { describe, expect, it } from 'vitest';
import { importProblem } from './imports';

describe('importProblem', () => {
  it('lets core Lean through', () => {
    expect(importProblem('theorem t : True := by\n  trivial\n')).toBeUndefined();
  });

  it('explains Mathlib and suggests core tactics for what the file uses', () => {
    const src = 'import Mathlib\n\ntheorem sq (n : ℕ) (h : Even n) : Even (n ^ 2) := by\n  rcases h with ⟨k, rfl⟩\n  ring_nf\n  use 2 * k ^ 2\n  ring\n';
    const p = importProblem(src)!;
    expect(p.libraries).toEqual(['Mathlib']);
    expect(p.message).toMatch(/imports Mathlib/);
    expect(p.message).toMatch(/ring_nf → omega or simp/);
    expect(p.message).toMatch(/use → exact/);
    expect(p.message).toMatch(/ring → omega/);
  });

  it('names other libraries', () => {
    expect(importProblem('import Std.Data.List\nimport Lean\n')!.libraries).toEqual(['Std', 'Lean']);
  });

  it('does not mistake words inside names for tactics', () => {
    expect(importProblem('import Mathlib\ntheorem using_ring_lemma : True := trivial\n')!.message).not.toMatch(/→/);
  });
});
