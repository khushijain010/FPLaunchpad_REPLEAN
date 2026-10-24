import { describe, expect, it } from 'vitest';
import { exampleFileName, isStale, normalizeName, sortFiles, uniqueName, type UserFile } from './files';
import type { Trace } from './types';

const file = (name: string, extra: Partial<UserFile> = {}): UserFile => ({ id: name, name, source: 'x', updatedAt: 0, ...extra });
const trace = {} as Trace;

describe('normalizeName', () => {
  it('adds .lean once and strips unsafe characters', () => {
    expect(normalizeName('proof')).toBe('proof.lean');
    expect(normalizeName('proof.lean')).toBe('proof.lean');
    expect(normalizeName('proof.LEAN')).toBe('proof.lean');
    expect(normalizeName('../a/b\\c:d')).toBe('..abcd.lean');
  });
  it('falls back to Untitled for empty names', () => {
    expect(normalizeName('   ')).toBe('Untitled.lean');
    expect(normalizeName('.lean')).toBe('Untitled.lean');
  });
  it('bounds the length', () => {
    expect(normalizeName('a'.repeat(200))).toBe(`${'a'.repeat(60)}.lean`);
  });
});

describe('uniqueName', () => {
  it('keeps a free name', () => {
    expect(uniqueName(['a.lean'], 'b')).toBe('b.lean');
  });
  it('numbers a taken name, ignoring case', () => {
    expect(uniqueName(['Proof.lean'], 'proof.lean')).toBe('proof-2.lean');
    expect(uniqueName(['proof.lean', 'proof-2.lean'], 'proof')).toBe('proof-3.lean');
  });
});

describe('isStale', () => {
  it('is stale until run, fresh after, stale again after an edit', () => {
    expect(isStale(file('a'))).toBe(true);
    expect(isStale(file('a', { trace, tracedSource: 'x' }))).toBe(false);
    expect(isStale(file('a', { trace, tracedSource: 'old' }))).toBe(true);
  });
});

describe('sortFiles and exampleFileName', () => {
  it('sorts naturally, ignoring case', () => {
    expect(sortFiles([file('b.lean'), file('a10.lean'), file('A2.lean')]).map((f) => f.name)).toEqual(['A2.lean', 'a10.lean', 'b.lean']);
  });
  it('names examples after their id', () => {
    expect(exampleFileName('and_comm')).toBe('and_comm.lean');
  });
});
