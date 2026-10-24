// "A goal shrinks down to what was just proved": theorem on the left, the goals as they get
// smaller in the middle, and everything proved collapsed onto a shelf on the right.

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import type { Film, Frame } from '../core/frames';
import { shortLabel } from '../core/layout';
import { theoremAt } from '../core/tactics';

export function ShrinkRail({ film, frame }: { film: Film; frame: Frame }) {
  const reduce = useReducedMotion();
  const { trace, graph } = film;
  const here = frame.nextStep ?? frame.step;
  const theorem = (here && theoremAt(trace.source, here.range.line)) || trace.meta.theorem;
  const goals = frame.state.goals.length > 0 ? frame.state.goals : (frame.upcoming?.goals ?? []);
  const widest = Math.max(1, ...graph.order.map((id) => graph.nodes.get(id)!.goal.target.length));
  const proved = graph.order
    .filter((id) => frame.statuses.get(id) === 'proved' && graph.nodes.get(id)!.children.length === 0)
    .map((id) => graph.nodes.get(id)!)
    .sort((a, b) => (a.endFrame ?? 0) - (b.endFrame ?? 0));
  const history = trace.steps.slice(Math.max(0, frame.index - 4), frame.index);

  return (
    <div className="shrink">
      <section className="sh-theorem" aria-label="Theorem">
        <span className="sh-label">theorem</span>
        <code>{theorem}</code>
      </section>

      <section className="sh-rail" aria-label="Recent steps">
        {history.map((s, i) => (
          <div key={s.index} className="sh-past" style={{ opacity: 0.35 + (i / Math.max(1, history.length)) * 0.5 }}>
            <span className="sh-past-line tnum">L{s.range.line}</span>
            <span className="sh-past-goals tnum">{s.after.goals.length}</span>
          </div>
        ))}
      </section>

      <LayoutGroup>
        <section className="sh-now" aria-label="Open goals">
          <span className="sh-label">{frame.state.goals.length === 0 && frame.upcoming ? 'next theorem' : 'open'}</span>
          <AnimatePresence mode="popLayout">
            {goals.map((g, i) => {
              const size = g.target.length / widest;
              return (
                <motion.div
                  key={g.id}
                  layoutId={reduce ? undefined : `sh-${g.id}`}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className={`sh-goal${i === 0 ? ' is-active' : ''}`}
                  style={{ fontSize: `${12 + 6 * size}px` }}
                >
                  {g.tag && <span className="sh-tag">{g.tag}</span>}
                  <code>{g.target}</code>
                  <span className="sh-size" style={{ width: `${Math.max(4, size * 100)}%` }} aria-hidden />
                </motion.div>
              );
            })}
          </AnimatePresence>
          {goals.length === 0 && <p className="qed-line">{frame.done ? 'Q.E.D. Nothing left to prove.' : 'No goals open.'}</p>}
        </section>

        <section className="sh-shelf" aria-label="Proved">
          <span className="sh-label tnum">proved · {proved.length}</span>
          <div className="sh-pills">
            {proved.map((n) => (
              <motion.span
                key={n.id}
                layoutId={reduce ? undefined : `sh-${n.id}`}
                layout={!reduce}
                className={`sh-pill${n.endFrame === frame.index ? ' is-new' : ''}`}
                title={n.goal.target}
              >
                {shortLabel(n.goal.target, 18)}
              </motion.span>
            ))}
          </div>
        </section>
      </LayoutGroup>
    </div>
  );
}
