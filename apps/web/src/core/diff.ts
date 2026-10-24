// What changed between two proof states. Pure; computed on demand, never stored.

import type { Goal, Hyp, ProofState } from './types';
import { mentionedNames } from './tactics';

export type HypChange = Readonly<
  | { kind: 'same'; hyp: Hyp }
  | { kind: 'added'; hyp: Hyp }
  | { kind: 'changed'; hyp: Hyp; was: Hyp }
  | { kind: 'removed'; hyp: Hyp }
>;

export type GoalView = Readonly<{
  goal: Goal;
  /** The goal this one came from: itself if it was untouched, the acted-on goal if new. */
  from: Goal | undefined;
  status: 'kept' | 'new' | 'changed';
  hyps: readonly HypChange[];
  targetChanged: boolean;
}>;

export type StepDiff = Readonly<{
  /** The goal the tactic worked on: the first goal that disappeared. */
  acted: Goal | undefined;
  /** Goals that exist after but not before. */
  opened: readonly Goal[];
  /** The goal each opened goal came from, keyed by the opened goal's id. */
  parentOf: ReadonlyMap<string, Goal>;
  /** Goals that disappeared and did not turn into anything: proved. */
  proved: readonly Goal[];
  /** Goals present before and after with the same id. */
  kept: readonly Goal[];
  /** Hypotheses of `acted` that the tactic text mentions by name. */
  usedHyps: readonly Hyp[];
  /** One entry per goal in the after-state, with hypothesis-level changes. */
  goals: readonly GoalView[];
  /** Hypotheses that the first new goal gained / lost / changed relative to `acted`. */
  added: readonly Hyp[];
  removed: readonly Hyp[];
  changed: readonly Readonly<{ hyp: Hyp; was: Hyp }>[];
}>;

/**
 * Compare two hypothesis lists. Lean's FVarId decides identity first. A tactic that rewrites a
 * hypothesis (`rw ... at h`) makes a new FVarId under the old name, so leftovers are then paired
 * by name, each old hypothesis used at most once. Names alone aren't enough: inaccessible names
 * like `a✝` can repeat within one goal.
 */
export function diffHyps(from: readonly Hyp[], to: readonly Hyp[]): readonly HypChange[] {
  const fromById = new Map(from.map((h) => [h.id, h] as const));
  const toIds = new Set(to.map((h) => h.id));
  type Acc = Readonly<{ changes: readonly HypChange[]; spare: readonly Hyp[] }>;
  const init: Acc = { changes: [], spare: from.filter((h) => !toIds.has(h.id)) };
  const { changes, spare } = to.reduce<Acc>((acc, h) => {
    const same = fromById.get(h.id);
    if (same) {
      const c: HypChange = same.type === h.type ? { kind: 'same', hyp: h } : { kind: 'changed', hyp: h, was: same };
      return { ...acc, changes: [...acc.changes, c] };
    }
    const i = acc.spare.findIndex((s) => s.name === h.name);
    if (i < 0) return { ...acc, changes: [...acc.changes, { kind: 'added', hyp: h }] };
    const was = acc.spare[i]!;
    const c: HypChange = was.type === h.type ? { kind: 'same', hyp: h } : { kind: 'changed', hyp: h, was };
    return { changes: [...acc.changes, c], spare: acc.spare.filter((_, j) => j !== i) };
  }, init);
  return [...changes, ...spare.map((hyp): HypChange => ({ kind: 'removed', hyp }))];
}

/**
 * @param parents where Lean says each opened goal came from (Step.parents). Goals it doesn't
 *   cover are taken to come from `acted`, the first goal that changed.
 */
export function diffStates(before: ProofState, after: ProofState, tacticText = '', parents: Readonly<Record<string, string>> = {}): StepDiff {
  const beforeIds = new Set(before.goals.map((g) => g.id));
  const afterIds = new Set(after.goals.map((g) => g.id));
  const gone = before.goals.filter((g) => !afterIds.has(g.id));
  const opened = after.goals.filter((g) => !beforeIds.has(g.id));
  const kept = after.goals.filter((g) => beforeIds.has(g.id));
  const acted = gone[0];
  const goneById = new Map(gone.map((g) => [g.id, g] as const));
  const parentOf = new Map(
    opened.flatMap((g) => {
      const p = goneById.get(parents[g.id] ?? '') ?? acted;
      return p ? [[g.id, p] as const] : [];
    }),
  );
  const hasChildren = new Set([...parentOf.values()].map((g) => g.id));
  const proved = gone.filter((g) => !hasChildren.has(g.id));

  const beforeById = new Map(before.goals.map((g) => [g.id, g] as const));
  const goals: GoalView[] = after.goals.map((goal) => {
    const same = beforeById.get(goal.id);
    const from = same ?? parentOf.get(goal.id);
    const targetChanged = from !== undefined && from.target !== goal.target;
    const status = same ? (targetChanged ? 'changed' : 'kept') : 'new';
    return { goal, from, status, hyps: diffHyps(from?.hyps ?? [], goal.hyps), targetChanged };
  });

  const mentioned = mentionedNames(tacticText);
  const usedHyps = (acted ?? before.goals[0])?.hyps.filter((h) => mentioned.has(h.name)) ?? [];

  const firstNew = goals.find((g) => g.status === 'new');
  const changes = firstNew?.hyps ?? [];
  return {
    acted,
    opened,
    parentOf,
    proved,
    kept,
    usedHyps,
    goals,
    added: changes.flatMap((c) => (c.kind === 'added' ? [c.hyp] : [])),
    removed: changes.flatMap((c) => (c.kind === 'removed' ? [c.hyp] : [])),
    changed: changes.flatMap((c) => (c.kind === 'changed' ? [{ hyp: c.hyp, was: c.was }] : [])),
  };
}
