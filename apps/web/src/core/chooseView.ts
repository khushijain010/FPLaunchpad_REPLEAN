// Which visualization fits a step best. Pure: the same step always picks the same view.

import type { StepDiff } from './diff';
import { hasConcreteList } from './lists';
import type { Step, ViewId } from './types';

const STRUCTURAL = new Set([
  'intro', 'intros', 'constructor', 'cases', 'rcases', 'obtain', 'induction', 'apply',
  'by_cases', 'case', 'next', 'bullet', 'have', 'left', 'right', 'exfalso',
]);
const REWRITING = new Set(['rw', 'rewrite', 'simp', 'simp_all', 'dsimp', 'unfold', 'omega', 'show', 'change', 'norm_num']);

export type ViewContext = Readonly<{
  step: Step | undefined;
  diff: StepDiff | undefined;
  /** True when every step has run and nothing is left: the Q.E.D. frame. */
  done: boolean;
}>;

export function chooseView({ step, diff, done }: ViewContext): ViewId {
  if (!step || !diff || done) return 'tree';
  const closedOnly = diff.opened.length === 0 && (diff.acted !== undefined || diff.proved.length > 0);
  if (closedOnly && !REWRITING.has(step.tactic)) return 'shrink';
  if (REWRITING.has(step.tactic)) {
    const goalText = [diff.acted?.target, diff.opened[0]?.target].filter(Boolean).join(' ');
    if (hasConcreteList(goalText)) return 'list';
    return closedOnly ? 'shrink' : 'rewrite';
  }
  if (STRUCTURAL.has(step.tactic)) return 'tree';
  return 'tree';
}
