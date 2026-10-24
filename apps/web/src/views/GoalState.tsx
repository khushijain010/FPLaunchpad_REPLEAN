// "Goal State": the goal Lean works on next, its hypotheses, and every goal with its status.

import type { Frame } from '../core/frames';

export function GoalState({ frame }: { frame: Frame }) {
  const goals = frame.state.goals.length > 0 ? frame.state.goals : (frame.upcoming?.goals ?? []);
  const current = goals[0];
  const view = frame.diff?.goals.find((g) => g.goal.id === current?.id);
  const added = new Set(view?.hyps.filter((h) => h.kind === 'added' || h.kind === 'changed').map((h) => h.hyp.name) ?? []);
  const used = new Set(frame.diff?.usedHyps.map((h) => h.name) ?? []);
  const proved = frame.diff?.proved ?? [];
  const failed = Boolean(frame.step?.error);

  if (frame.done) {
    return (
      <div className="goal-state">
        <div className="gs-card gs-qed">
          <span className="gs-label">Q.E.D.</span>
          <p>All goals closed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="goal-state">
      <div className="gs-grid">
        <section className="gs-card gs-current" aria-label="Current goal">
          <span className="gs-label">
            {frame.state.goals.length === 0 && frame.upcoming ? 'Next theorem' : 'Current goal'}
            {current?.tag && <span className="gs-tag">case {current.tag}</span>}
          </span>
          {current ? <code className="gs-target">{current.target}</code> : <p className="muted">No goals.</p>}
        </section>
        <section className="gs-card" aria-label="Hypotheses">
          <span className="gs-label gs-label-plain">Hypotheses</span>
          {current && current.hyps.length > 0 ? (
            <ul className="gs-hyps">
              {current.hyps.map((h) => (
                <li key={h.id} className={`${added.has(h.name) ? 'is-new' : ''}${used.has(h.name) ? ' is-used' : ''}`}>
                  <span className="hyp-name">{h.name}</span>
                  <span className="hyp-colon"> : </span>
                  <span className="hyp-type">{h.type}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">None.</p>
          )}
        </section>
      </div>

      <section className="gs-card gs-all" aria-label="All goals">
        <span className="gs-label gs-label-plain">All goals ({goals.length})</span>
        <ol className="gs-list">
          {goals.map((g, i) => (
            <li key={g.id} className={i === 0 ? 'is-current' : ''}>
              <span className="gs-n tnum">{i + 1}.</span>
              <span className={`gs-ring${i === 0 ? ' is-current' : ''}`} aria-hidden />
              <code className="gs-goal">{g.target}</code>
              <span className={`chip${i === 0 ? ' chip-current' : ''}`}>{i === 0 ? 'next' : 'open'}</span>
            </li>
          ))}
          {proved.map((g) => (
            <li key={`p-${g.id}`} className={failed ? 'is-failed' : 'is-proved'}>
              <span className="gs-n">{failed ? '✕' : '✓'}</span>
              <span className={`gs-ring ${failed ? 'is-failed' : 'is-proved'}`} aria-hidden />
              <code className="gs-goal">{g.target}</code>
              <span className={`chip ${failed ? 'chip-error' : 'chip-proved'}`}>{failed ? 'failed' : 'proved'}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
