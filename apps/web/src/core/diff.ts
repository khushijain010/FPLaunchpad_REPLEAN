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
  /** Goals that exist after but not before. All of them came from `acted`. */
  opened: readonly Goal[];
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

const byName = (hyps: readonly Hyp[]): ReadonlyMap<string, Hyp> =>
  new Map(hyps.map((h) => [h.name, h] as const));

/** Compare two hypothesis lists by name: same name and type is the same hypothesis. */
export function diffHyps(from: readonly Hyp[], to: readonly Hyp[]): readonly HypChange[] {
  const old = byName(from);
  const now = new Set(to.map((h) => h.name));
  const kept: HypChange[] = to.map((h) => {
    const was = old.get(h.name);
    if (!was) return { kind: 'added', hyp: h };
    if (was.type !== h.type) return { kind: 'changed', hyp: h, was };
    return { kind: 'same', hyp: h };
  });
  const gone: HypChange[] = from.filter((h) => !now.has(h.name)).map((h) => ({ kind: 'removed', hyp: h }));
  return [...kept, ...gone];
}

export function diffStates(before: ProofState, after: ProofState, tacticText = ''): StepDiff {
  const beforeIds = new Set(before.goals.map((g) => g.id));
  const afterIds = new Set(after.goals.map((g) => g.id));
  const gone = before.goals.filter((g) => !afterIds.has(g.id));
  const opened = after.goals.filter((g) => !beforeIds.has(g.id));
  const kept = after.goals.filter((g) => beforeIds.has(g.id));
  const acted = gone[0];
  const proved = opened.length > 0 ? gone.slice(1) : gone;

  const beforeById = new Map(before.goals.map((g) => [g.id, g] as const));
  const goals: GoalView[] = after.goals.map((goal) => {
    const same = beforeById.get(goal.id);
    const from = same ?? acted;
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
    proved,
    kept,
    usedHyps,
    goals,
    added: changes.flatMap((c) => (c.kind === 'added' ? [c.hyp] : [])),
    removed: changes.flatMap((c) => (c.kind === 'removed' ? [c.hyp] : [])),
    changed: changes.flatMap((c) => (c.kind === 'changed' ? [{ hyp: c.hyp, was: c.was }] : [])),
  };
}
