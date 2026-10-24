// Infoview-style list of open goals. Diff colours: cyan = new, orange = changed, struck = gone.

import type { GoalView, HypChange } from '../core/diff';
import type { Frame } from '../core/frames';
import { tokenDiff } from '../core/tokens';
import type { Goal } from '../core/types';

function Hyps({ changes }: { changes: readonly HypChange[] }) {
  if (changes.length === 0) return null;
  return (
    <ul className="hyps">
      {changes.map((c) => (
        <li key={`${c.kind}:${c.hyp.id}:${c.hyp.name}`} className={`hyp hyp-${c.kind}`}>
          <span className="hyp-name">{c.hyp.name}</span>
          <span className="hyp-colon"> : </span>
          <span className="hyp-type">{c.hyp.type}</span>
          {c.kind === 'changed' && <span className="hyp-was"> was {c.was.type}</span>}
          {c.kind !== 'same' && <span className="sr-only"> ({c.kind})</span>}
        </li>
      ))}
    </ul>
  );
}

function Target({ view }: { view: GoalView }) {
  const { goal, from, targetChanged } = view;
  if (!targetChanged || !from) return <span className="target-text">{goal.target}</span>;
  return (
    <span className="target-text">
      {tokenDiff(from.target, goal.target).map((op, i) =>
        op.kind === 'del' ? null : (
          <span key={i} className={op.kind === 'add' ? 'tok-add' : undefined}>
            {op.text}
          </span>
        ),
      )}
    </span>
  );
}

const plain = (goal: Goal): GoalView => ({
  goal,
  from: undefined,
  status: 'kept',
  hyps: goal.hyps.map((hyp) => ({ kind: 'same', hyp })),
  targetChanged: false,
});

function GoalCard({ view, n, total, active }: { view: GoalView; n: number; total: number; active: boolean }) {
  return (
    <section className={`goal-card${active ? ' is-active' : ''}${view.status === 'new' ? ' is-new' : ''}`} aria-label={`Goal ${n} of ${total}`}>
      <header className="goal-head">
        <span className="goal-index tnum">
          {n}/{total}
        </span>
        {view.goal.tag && <span className="goal-tag">case {view.goal.tag}</span>}
        {view.status === 'new' && <span className="goal-badge">new</span>}
      </header>
      <Hyps changes={view.hyps} />
      <div className="turnstile-row">
        <span className="turnstile" aria-label="goal">
          ⊢
        </span>
        <Target view={view} />
      </div>
    </section>
  );
}

export function GoalPanel({ frame }: { frame: Frame }) {
  const goals = frame.diff ? frame.diff.goals : frame.state.goals.map(plain);
  // `proved` already includes the acted-on goal when the step closed it.
  const justProved = frame.diff?.proved ?? [];

  return (
    <div className="goal-panel" aria-live="polite">
      {justProved.map((g) => (
        <div key={g.id} className={`proved-row${frame.step?.error ? ' is-error' : ''}`}>
          <span className="proved-mark">{frame.step?.error ? '✕' : '✓'}</span>
          <span>{frame.step?.error ? 'abandoned' : 'proved'}</span>
          <code>{g.target}</code>
        </div>
      ))}
      {goals.length === 0 ? (
        frame.done ? (
          <p className="qed-line">Q.E.D. Nothing left to prove.</p>
        ) : frame.upcoming ? (
          <div className="upcoming">
            <p className="muted">That proof is done. Next up:</p>
            {frame.upcoming.goals.map((g, i) => (
              <GoalCard key={g.id} view={plain(g)} n={i + 1} total={frame.upcoming!.goals.length} active={false} />
            ))}
          </div>
        ) : (
          <p className="muted">No goals here.</p>
        )
      ) : (
        goals.map((v, i) => <GoalCard key={v.goal.id} view={v} n={i + 1} total={goals.length} active={i === 0} />)
      )}
    </div>
  );
}
