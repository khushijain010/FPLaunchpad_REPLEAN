// Branching edge cases, on real extractor output for lean/Fixtures/*.lean (regenerated and
// golden-checked by `pnpm traces`).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { diffStates } from './diff';
import { buildFrames } from './frames';
import { buildGoalGraph } from './graph';
import type { RawOutput } from './raw';
import type { Step } from './types';

const fixture = (name: string) => {
  const raw = JSON.parse(readFileSync(new URL(`./fixtures/${name}.raw.json`, import.meta.url), 'utf8')) as RawOutput;
  const source = readFileSync(new URL(`../../../../lean/Fixtures/${name}.lean`, import.meta.url), 'utf8');
  return buildSteps(raw, source).steps;
};
const targets = (s: { goals: readonly { target: string }[] }) => s.goals.map((g) => g.target);
const onLine = (steps: readonly Step[], text: string) => steps.find((s) => s.text.startsWith(text))!;

describe('cases … with | alternatives', () => {
  const steps = fixture('CasesWith');
  const graph = buildGoalGraph(steps);

  it('shows the waiting alternative while the first one runs', () => {
    expect(targets(onLine(steps, 'cases h with').after)).toEqual(['q ∨ p', 'q ∨ p']);
    expect(onLine(steps, 'cases h with').after.goals.map((g) => g.tag)).toEqual(['inl', 'inr']);
    // Inside `inl`, the `inr` goal is still on the list.
    expect(onLine(steps, 'apply Or.inr').before.goals.map((g) => g.tag)).toEqual(['inl', 'inr']);
    expect(onLine(steps, 'exact hp').before.goals.map((g) => g.tag)).toEqual(['inl', 'inr']);
  });

  it('hangs both alternatives under the goal cases split, with no stray root', () => {
    expect(graph.roots).toHaveLength(1);
    const root = graph.nodes.get(graph.roots[0]!)!;
    expect(root.children.map((id) => graph.nodes.get(id)!.goal.tag)).toEqual(['inl', 'inr']);
  });

  it('counts down open goals one alternative at a time, ending in Q.E.D.', () => {
    const film = buildFrames({ schema: 1, meta: { id: 'f', title: 'f', blurb: '', watch: '', theorem: '', leanVersion: 'test' }, source: '', steps, messages: [] });
    // cases · | inl · apply · exact hp · | inr · exact
    expect(film.frames.map((f) => f.remaining)).toEqual([1, 2, 2, 2, 1, 1, 0]);
    expect(film.frames.at(-1)!.done).toBe(true);
  });
});

describe('induction … with | alt =>, example, rw … at h', () => {
  const steps = fixture('Induction');
  const film = buildFrames({ schema: 1, meta: { id: 'f', title: 'f', blurb: '', watch: '', theorem: '', leanVersion: 'test' }, source: '', steps, messages: [] });
  const frameAfter = (text: string) => film.frames[steps.indexOf(onLine(steps, text)) + 1]!;

  it('opens one goal per alternative and branches the tree into three', () => {
    expect(onLine(steps, 'induction e with').after.goals.map((g) => g.tag)).toEqual(['num', 'add', 'mul']);
    const root = [...film.graph.nodes.values()].find((n) => n.goal.target === 'ev (fold e) = ev e')!;
    expect(root.children.map((id) => film.graph.nodes.get(id)!.goal.tag)).toEqual(['num', 'add', 'mul']);
  });

  it('closes each case, turning it gold, instead of turning it into the next case', () => {
    const f = frameAfter('| num n => rfl');
    expect(f.explanation?.headline).toContain('proved');
    expect(f.remaining).toBe(2);
    const num = film.graph.nodes.get(onLine(steps, 'induction e with').after.goals[0]!.id)!;
    expect(film.frames.at(-1)!.statuses.get(num.id)).toBe('proved');
  });

  it("doesn't count names an alternative introduces as used", () => {
    expect(frameAfter('| num n => rfl').diff?.usedHyps).toEqual([]);
    expect(frameAfter('| add a b iha ihb =>').diff?.usedHyps).toEqual([]);
  });

  it('reads `example … := by decide` as decide', () => {
    expect(onLine(steps, 'example : 2 + 2 = 4').tactic).toBe('decide');
    expect(onLine(steps, 'example (p : Prop)').tactic).toBe('exact');
    expect(frameAfter('example (p : Prop)').diff?.usedHyps.map((h) => h.name)).toEqual(['hp']);
  });

  it('says rw … at h rewrote h and left the goal alone', () => {
    expect(frameAfter('rw [Nat.add_zero] at h').explanation?.headline).toBe('`rw [Nat.add_zero] at h` rewrote `h`. The goal itself is unchanged.');
  });
});

describe('one line acting on several goals', () => {
  const steps = fixture('AllGoals');
  const graph = buildGoalGraph(steps);
  const kids = (target: string, proof: number) => {
    const n = [...graph.nodes.values()].find((x) => x.proof === proof && x.goal.target === target)!;
    return n.children.map((id) => graph.nodes.get(id)!.goal.target);
  };

  it('all_goals: each new goal comes from its own goal', () => {
    const step = onLine(steps, 'all_goals intro h');
    expect(targets(step.before)).toEqual(['p → p', 'q → q']);
    expect(targets(step.after)).toEqual(['p', 'q']);
    expect(kids('p → p', 0)).toEqual(['p']);
    expect(kids('q → q', 0)).toEqual(['q']);
  });

  it('all_goals: transforming a goal is not proving it', () => {
    const step = onLine(steps, 'all_goals intro h');
    const d = diffStates(step.before, step.after, step.text, step.parents);
    expect(d.proved).toEqual([]);
    expect(d.opened.map((g) => d.parentOf.get(g.id)?.target)).toEqual(['p → p', 'q → q']);
  });

  it('<;>: the combined line still splits into the right branches', () => {
    expect(kids('(True → p) ∧ (True → q)', 1)).toEqual(['p', 'q']);
  });

  it('explains all_goals as working on several goals, not splitting one', () => {
    const film = buildFrames({ schema: 1, meta: { id: 'f', title: 'f', blurb: '', watch: '', theorem: '', leanVersion: 'test' }, source: '', steps, messages: [] });
    const frame = film.frames[steps.indexOf(onLine(steps, 'all_goals intro h')) + 1]!;
    expect(frame.explanation?.headline).toContain('ran on 2 goals at once');
    expect(frame.explanation?.facts.join(' ')).not.toMatch(/Closed/);
  });

  it('without the parent map, the old guess would get it wrong', () => {
    const step = onLine(steps, 'all_goals intro h');
    const guess = diffStates(step.before, step.after, step.text);
    expect(guess.proved.map((g) => g.target)).toEqual(['q → q']);
  });
});
