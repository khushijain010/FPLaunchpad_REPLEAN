// Before and after the step, diffed token by token, with what got replaced by what.

import { motion } from 'framer-motion';
import type { Frame } from '../core/frames';
import { rewriteSummary, tokenDiff } from '../core/tokens';

export function RewriteLens({ frame }: { frame: Frame }) {
  const d = frame.diff;
  const step = frame.step;
  if (!d || !step) {
    return <p className="view-empty">No rewrite yet. Step forward to see each rewrite.</p>;
  }
  const before = d.acted ?? step.before.goals[0];
  const after = d.opened[0];
  if (!before) return <p className="view-empty">This step did not change a goal.</p>;

  const ops = tokenDiff(before.target, after?.target ?? '');
  const { from, to } = rewriteSummary(ops);

  return (
    <motion.div className="rewrite" key={step.index} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <p className="view-caption">
        <code>{step.text.replace(/^·\s*/, '')}</code>
      </p>
      <div className="rw-block">
        <span className="rw-label">before</span>
        <p className="rw-goal">
          <span className="turnstile">⊢</span>{' '}
          {ops.map((o, i) => (o.kind === 'add' ? null : <span key={i} className={o.kind === 'del' ? 'tok-del' : undefined}>{o.text}</span>))}
        </p>
      </div>
      {after && (from || to) && (
        <div className="rw-arrow" aria-label={`${from || 'nothing'} became ${to || 'nothing'}`}>
          <code className="rw-from">{from || '·'}</code>
          <svg width="56" height="16" viewBox="0 0 56 16" aria-hidden>
            <path d="M2 8h48M44 3l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <code className="rw-to">{to || '·'}</code>
        </div>
      )}
      <div className="rw-block">
        <span className="rw-label">after</span>
        {after ? (
          <p className="rw-goal">
            <span className="turnstile">⊢</span>{' '}
            {ops.map((o, i) => (o.kind === 'del' ? null : <span key={i} className={o.kind === 'add' ? 'tok-add' : undefined}>{o.text}</span>))}
          </p>
        ) : (
          <p className={`rw-goal ${step.error ? 'rw-error' : 'rw-closed'}`}>{step.error ? 'Lean rejected this line.' : 'Goal closed.'}</p>
        )}
      </div>
      {d.opened.length > 1 && <p className="muted small">…and {d.opened.length - 1} more goal{d.opened.length > 2 ? 's' : ''}. The tree view shows the split.</p>}
    </motion.div>
  );
}
