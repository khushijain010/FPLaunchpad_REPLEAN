// Full screen hides the editor and the side panels, so the view would be alone on a big empty
// stage. This rail brings back what a presenter talks over: the line that just ran (with a little
// context), what it did, and the goal it left.

import type { Film, Frame } from '../core/frames';
import { Explanation } from './Panels';

/** Lines around the one that just ran, so the audience sees where in the proof we are. */
function CodeExcerpt({
  source,
  line,
  next,
}: {
  source: string;
  line: number;
  next: number | undefined;
}) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const from = Math.max(1, line - 2);
  const to = Math.min(lines.length, line + 2);
  return (
    <pre className="rail-code" aria-label={`Line ${line} of the proof`}>
      {lines.slice(from - 1, to).map((text, i) => {
        const n = from + i;
        return (
          <span
            key={n}
            className={`rail-line${n === line ? ' is-current' : ''}${n === next ? ' is-next' : ''}`}
          >
            <span className="rail-ln tnum">{n}</span>
            {text || ' '}
          </span>
        );
      })}
    </pre>
  );
}

export function StageRail({ film, frame }: { film: Film; frame: Frame }) {
  const step = frame.step;
  const line = step?.range.line ?? frame.nextStep?.range.line;
  const goal = frame.state.goals[0] ?? frame.upcoming?.goals[0];
  const added = new Set(
    frame.diff?.goals
      .find((g) => g.goal.id === goal?.id)
      ?.hyps.filter((h) => h.kind === 'added' || h.kind === 'changed')
      .map((h) => h.hyp.id) ?? [],
  );

  return (
    <aside className="stage-rail" aria-label="This step">
      <section className="rail-section">
        <h3 className="rail-label">{step ? `Line ${step.range.line}` : 'Up next'}</h3>
        {line !== undefined && (
          <CodeExcerpt
            source={film.trace.source}
            line={line}
            next={step ? frame.nextStep?.range.line : undefined}
          />
        )}
      </section>

      <section className="rail-section">
        <h3 className="rail-label">What it did</h3>
        {step ? (
          <Explanation frame={frame} />
        ) : (
          <p className="muted">Press → to run the first line.</p>
        )}
      </section>

      <section className="rail-section rail-goal">
        <h3 className="rail-label">
          {frame.done
            ? 'Proved'
            : goal
              ? `Goal${frame.remaining > 1 ? ` · ${frame.remaining} open` : ''}`
              : 'Goal'}
        </h3>
        {frame.done ? (
          <p className="rail-qed">Q.E.D. All goals closed.</p>
        ) : goal ? (
          <>
            {/* The goal first: with many hypotheses it would otherwise fall below the fold. */}
            <p className="rail-target">
              <span className="turnstile">⊢</span> {goal.target}
            </p>
            {goal.hyps.length > 0 && (
              <>
                <h4 className="rail-sublabel">Hypotheses</h4>
                <ul className="rail-hyps">
                  {goal.hyps.map((h) => (
                    <li key={h.id} className={added.has(h.id) ? 'is-new' : undefined}>
                      <b>{h.name}</b> : {h.type}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <p className="muted">No goal open.</p>
        )}
      </section>
    </aside>
  );
}
