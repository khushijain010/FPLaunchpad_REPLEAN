import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { fileErrors, unownedErrorLines } from './errors';
import { andCommRaw, andCommSource } from './fixtures.test-data';
import type { Trace } from './types';

const traceWith = (messages: { line: number; col: number; text: string; severity?: 'error' | 'warning' }[]): Trace => {
  const raw = {
    ...andCommRaw,
    messages: messages.map((m) => ({ severity: m.severity ?? 'error', start: { line: m.line, col: m.col }, text: m.text })),
  };
  const built = buildSteps(raw, andCommSource);
  return {
    schema: 1,
    meta: { id: 'x', title: 'x', blurb: '', watch: '', theorem: '', leanVersion: 'test' },
    source: andCommSource,
    steps: built.steps,
    messages: built.messages,
  };
};

describe('fileErrors', () => {
  it('ties an error inside a proof line to its step', () => {
    const errs = fileErrors(traceWith([{ line: 6, col: 4, text: 'type mismatch' }]));
    expect(errs).toEqual([{ line: 6, col: 4, text: 'type mismatch', step: 2 }]);
  });
  it('keeps errors outside any proof, with no step', () => {
    const t = traceWith([{ line: 1, col: 0, text: 'unknown namespace' }]);
    expect(fileErrors(t)).toEqual([{ line: 1, col: 0, text: 'unknown namespace', step: undefined }]);
    expect(unownedErrorLines(t)).toEqual([1]);
  });
  it('ignores warnings and sorts by position', () => {
    const t = traceWith([
      { line: 7, col: 4, text: 'b' },
      { line: 3, col: 0, text: 'declaration uses sorry', severity: 'warning' },
      { line: 1, col: 2, text: 'a' },
    ]);
    expect(fileErrors(t).map((e) => e.line)).toEqual([1, 7]);
  });
});
