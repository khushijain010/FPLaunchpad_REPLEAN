// Every error Lean reported for a file, tied to the proof step it belongs to when there is one.

import type { Trace } from './types';

export type FileError = Readonly<{
  line: number;
  col: number;
  text: string;
  /** Index of the step this error is attached to, if it happened inside a proof line. */
  step: number | undefined;
}>;

export function fileErrors(trace: Trace): readonly FileError[] {
  return trace.messages
    .filter((m) => m.severity === 'error')
    .map((m): FileError => {
      const step = trace.steps.find((s) => s.error?.message === m.text && m.line >= s.range.line);
      return { line: m.line, col: m.col, text: m.text, step: step?.index };
    })
    .sort((a, b) => a.line - b.line || a.col - b.col);
}

/** Lines with an error that no step owns (a broken `def`, a parse error): marked in the editor from the start. */
export const unownedErrorLines = (trace: Trace): readonly number[] => [
  ...new Set(fileErrors(trace).filter((e) => e.step === undefined).map((e) => e.line)),
];
