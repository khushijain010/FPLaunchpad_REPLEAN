// "A list rearranges": the list items in the goal as a row of boxes. Boxes are keyed by value,
// so when a rewrite moves 1 from the front to the back, that box slides there.

import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import type { Frame } from '../core/frames';
import { chainLinks, listCells, sides, type ListCell } from '../core/lists';
import type { Goal } from '../core/types';

/** The goal to show: the one the last step produced or touched, else the next one up. */
function focusGoal(frame: Frame): Readonly<{ goal: Goal | undefined; was: Goal | undefined; closed: boolean }> {
  const d = frame.diff;
  if (d?.opened[0]) return { goal: d.opened[0], was: d.acted, closed: false };
  if (d?.acted && d.opened.length === 0) return { goal: d.acted, was: undefined, closed: true };
  return { goal: frame.state.goals[0] ?? frame.upcoming?.goals[0], was: undefined, closed: false };
}

const itemKeys = (target: string | undefined, side: number): ReadonlyMap<string, number> => {
  if (!target) return new Map();
  const cells = listCells(sides(target)[side] ?? '').filter((c) => c.kind === 'item');
  return new Map(cells.map((c, i) => [c.key, i] as const));
};

function Row({ cells, side, previous, label }: { cells: readonly ListCell[]; side: number; previous: ReadonlyMap<string, number>; label: string }) {
  const reduce = useReducedMotion();
  const items = cells.filter((c) => c.kind === 'item');
  return (
    <div className="ll-row" aria-label={label}>
      <span className="ll-side">{label}</span>
      <div className="ll-cells">
        {cells.map((c) => {
          if (c.kind === 'glue') {
            return (
              <motion.span key={c.key} layout={!reduce} className="ll-glue">
                {c.text}
              </motion.span>
            );
          }
          const idx = items.indexOf(c);
          const moved = previous.size > 0 && previous.get(c.key) !== idx;
          return (
            <motion.div
              key={c.key}
              layoutId={reduce ? undefined : `ll-${side}-${c.key}`}
              layout={!reduce}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className={`ll-box${moved ? ' is-moved' : ''}`}
              title={moved ? `${c.text} moved` : c.text}
            >
              {/* One face; the top and side edges are drawn in CSS, so the box grows with its text. */}
              <span className="ll-face">{c.text}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function ListLab({ frame }: { frame: Frame }) {
  const { goal, was, closed } = focusGoal(frame);
  if (!goal) return <p className="view-empty">No goal to show.</p>;

  const parts = sides(goal.target);
  const anyItems = parts.some((p) => listCells(p).some((c) => c.kind === 'item'));

  return (
    <div className={`list-lab${closed ? ' is-closed' : ''}`}>
      <div className="ll-inner">
      <p className="view-caption">
        {closed ? 'Goal closed.' : anyItems ? 'List elements in the goal. Highlighted boxes moved in this step.' : 'No concrete list in this goal. Showing its top-level structure.'}
      </p>
      <LayoutGroup>
        {anyItems ? (
          parts.map((p, side) => (
            <Row key={side} cells={listCells(p)} side={side} previous={itemKeys(was?.target, side)} label={parts.length === 2 ? (side === 0 ? 'left' : 'right') : 'goal'} />
          ))
        ) : (
          <div className="ll-chain">
            {chainLinks(parts[0] ?? goal.target).map((link, i) => (
              <motion.span layout key={`${link}-${i}`} className="ll-link">
                {link}
              </motion.span>
            ))}
            {goal.hyps
              .filter((h) => /^ih/.test(h.name))
              .map((h) => (
                <span key={h.name} className="ll-ih" title={h.type}>
                  {h.name} : {h.type}
                </span>
              ))}
          </div>
        )}
      </LayoutGroup>
        <pre className="ll-source">{goal.target}</pre>
      </div>
    </div>
  );
}
