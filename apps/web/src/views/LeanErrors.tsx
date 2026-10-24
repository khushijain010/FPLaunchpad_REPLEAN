// Lean's own error messages, shown over the visualization.
// The step that just ran failed: a card with Lean's full message for that line.
// Otherwise, if the file has errors anywhere: a bar that expands to the list.

import { useMemo, useState } from 'react';
import { fileErrors } from '../core/errors';
import type { Frame } from '../core/frames';
import type { Trace } from '../core/types';
import { useStore } from '../ui/store';

export function LeanErrors({ trace, frame }: { trace: Trace; frame: Frame }) {
  const errors = useMemo(() => fileErrors(trace), [trace]);
  /** null = not touched yet, so the default below applies. */
  const [open, setOpen] = useState<boolean | null>(null);
  const goto = useStore((s) => s.goto);
  const stopPlay = useStore((s) => s.stopPlay);
  if (errors.length === 0) return null;

  const current = frame.step?.error ? frame.step : undefined;
  // Errors that no step owns can't be reached by stepping, so they start expanded.
  const expanded = open ?? (trace.steps.length === 0 || errors.some((e) => e.step === undefined));

  return (
    <div className="lean-errors" role="alert" aria-live="assertive">
      {current && (
        <section className="le-card">
          <header className="le-head">
            <span className="le-dot" aria-hidden />
            Lean error on line {current.range.line}
          </header>
          <code className="le-line">{current.text}</code>
          <pre className="le-msg">{current.error!.message}</pre>
        </section>
      )}
      {(!current || errors.length > 1) && (
        <section className="le-bar">
          <button className="le-toggle" onClick={() => setOpen(!expanded)} aria-expanded={expanded}>
            <span className="le-dot" aria-hidden />
            {errors.length === 1 ? 'Lean reported 1 error in this file' : `Lean reported ${errors.length} errors in this file`}
            {trace.steps.length > 0 && <span className="le-chevron">{expanded ? '−' : '+'}</span>}
          </button>
          {expanded && (
            <ul className="le-list">
              {errors.map((e, i) => (
                <li key={i}>
                  <button
                    className="le-item"
                    disabled={e.step === undefined}
                    title={e.step === undefined ? 'Outside any proof step' : 'Jump to this line'}
                    onClick={() => {
                      if (e.step === undefined) return;
                      stopPlay();
                      goto(e.step + 1);
                    }}
                  >
                    <span className="le-where tnum">
                      line {e.line}:{e.col + 1}
                    </span>
                    <pre className="le-msg">{e.text}</pre>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
