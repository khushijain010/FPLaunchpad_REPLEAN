import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkPublicSource } from './policy.ts';

describe('checkPublicSource', () => {
  it('lets every shipped sample through', async () => {
    for (const f of ['AndComm', 'OrComm', 'ZeroAdd', 'Rev', 'Compiler']) {
      const src = await readFile(path.join(import.meta.dirname, `../../../lean/Samples/${f}.lean`), 'utf8');
      expect(checkPublicSource(src), f).toEqual({ ok: true });
    }
  });

  it.each([
    ['#eval IO.Process.run { cmd := "ls" }', '#eval'],
    ['example : 2 + 2 = 4 := by native_decide', 'native_decide'],
    ['def f := unsafeBaseIO (pure 1)', 'unsafe'],
    ['macro "go" : command => `(#check 1)', 'custom syntax'],
    ['import Lean', 'import'],
    ['@[implemented_by g] def f := 1', 'implemented_by'],
    ['#exit', '#exit'],
    ['def x : IO Unit := IO.println "hi"', 'IO'],
  ])('refuses %s', (src, why) => {
    const r = checkPublicSource(src);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons.join(' ')).toContain(why);
  });

  it('allows inspection commands', () => {
    expect(checkPublicSource('#check Nat.add\n#print Nat\n#reduce 2 + 2')).toEqual({ ok: true });
  });
});
