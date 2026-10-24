// "Why": what the tactic that just ran did, in plain English. Offline, no model involved.

import type { ReactNode } from 'react';
import type { Frame } from '../core/frames';
import { useStore } from '../ui/store';

/** Render `backticked` spans as code. */
function rich(text: string): ReactNode[] {
  return text.split(/(`[^`]*`)/g).map((part, i) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 1 ? <code key={i}>{part.slice(1, -1)}</code> : part,
  );
}

export function WhyPanel({ frame }: { frame: Frame }) {
  const open = useStore((s) => s.whyOpen);
  const toggle = useStore((s) => s.toggleWhy);
  const e = frame.explanation;

  return (
    <section className={`why${open ? ' is-open' : ''}${frame.step?.error ? ' is-error' : ''}`} aria-label="Why this step">
      <button className="why-toggle" onClick={toggle} aria-expanded={open}>
        <span className="why-title">Why</span>
        <span className="why-tactic">{frame.step ? frame.step.tactic : 'not started'}</span>
        <span className="why-chevron" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div className="why-body">
          {!e ? (
            <p className="muted">
              Press <kbd>→</kbd> to run the first line.
            </p>
          ) : (
            <>
              <p className="why-headline">{rich(e.headline)}</p>
              <ul className="why-facts">
                {e.facts.map((f, i) => (
                  <li key={i}>{rich(f)}</li>
                ))}
              </ul>
              <p className="why-about">{rich(e.about)}</p>
              {frame.diff && frame.diff.usedHyps.length > 0 && (
                <p className="why-note">"Used" means the line mentions the hypothesis by name.</p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
