// Plain-English explanations of a step, built from the tactic name and the structured diff.
// No network, no model: a dictionary plus the facts in the diff.

import type { StepDiff } from './diff';
import type { Hyp, Step } from './types';
import { startsWithBullet } from './tactics';

export type Explanation = Readonly<{
  headline: string;
  /** What the tactic does in general. */
  about: string;
  facts: readonly string[];
}>;

const code = (s: string) => `\`${s}\``;
const hypList = (hs: readonly Hyp[]) => hs.map((h) => `${code(h.name)} : ${code(h.type)}`).join(', ');
const count = (n: number, one: string, many = `${one}s`) => `${n === 0 ? 'no' : n} ${n === 1 ? one : many}`;

const ABOUT: Readonly<Record<string, string>> = {
  intro: 'Takes an assumption or a variable off the front of the goal and puts it in the context.',
  intros: 'Introduces every leading assumption and variable at once.',
  apply: 'Works backwards: if a lemma concludes the goal, you only need to prove its premises.',
  exact: 'Closes the goal with a term whose type is exactly the goal.',
  constructor: 'Splits a goal like A ∧ B into one goal per field of the constructor.',
  cases: 'Splits on how a value was built. One new goal per constructor.',
  rcases: 'Splits a hypothesis by pattern, like cases with names. `hp | hq` makes two branches.',
  obtain: 'Destructures a hypothesis into named parts.',
  induction: 'Proves a statement for every value by proving a base case and a step case.',
  rw: 'Rewrites the goal left-to-right with an equation, then tries rfl.',
  rewrite: 'Rewrites the goal with an equation, without trying rfl afterwards.',
  simp: 'Rewrites with a set of simplification lemmas until nothing more applies.',
  dsimp: 'Simplifies using only definitional unfolding.',
  unfold: 'Replaces a definition with its body.',
  omega: 'A decision procedure for linear arithmetic over Nat and Int.',
  rfl: 'Closes a goal whose two sides are equal by definition.',
  decide: 'Evaluates a decidable proposition to true.',
  have: 'Proves an intermediate fact and adds it to the context.',
  show: 'Restates the goal in a form that is equal by definition.',
  contradiction: 'Closes the goal because the context contains something impossible.',
  exfalso: 'Changes the goal to False.',
  left: 'Picks the left side of an Or.',
  right: 'Picks the right side of an Or.',
  case: 'Focuses on one named goal and names its new variables.',
  next: 'Focuses on the next goal.',
  bullet: 'Focuses on the first goal. The block must close it.',
  trivial: 'Tries a few simple tactics to close the goal.',
  assumption: 'Closes the goal with a hypothesis of exactly that type.',
  specialize: 'Instantiates a hypothesis with arguments.',
  generalize: 'Replaces an expression with a fresh variable.',
};

export function explainTactic(step: Step, diff: StepDiff): Explanation {
  const t = step.tactic;
  const about = ABOUT[t] ?? 'No description for this tactic. The facts below come from the goal diff.';
  const facts: string[] = [];
  const bullet = startsWithBullet(step.text);

  if (step.error) {
    return {
      headline: `Lean error on line ${step.range.line}.`,
      about,
      facts: [step.error.message.split('\n')[0] ?? step.error.message],
    };
  }

  if (bullet) facts.push('The bullet focused on the first goal and parked the rest.');
  if (diff.usedHyps.length > 0) facts.push(`Used ${hypList(diff.usedHyps)}.`);
  if (diff.added.length > 0) facts.push(`New in the context: ${hypList(diff.added)}.`);
  if (diff.changed.length > 0) {
    facts.push(
      `Changed: ${diff.changed.map((c) => `${code(c.hyp.name)} is now ${code(c.hyp.type)} (was ${code(c.was.type)})`).join(', ')}.`,
    );
  }
  if (diff.removed.length > 0) facts.push(`Gone from the context: ${diff.removed.map((h) => code(h.name)).join(', ')}.`);
  const worked = new Set([...diff.parentOf.values()].map((g) => g.id)).size;
  if (worked > 1) facts.push(`Worked on ${count(worked, 'goal')}, each in its own branch.`);
  else if (diff.opened.length > 1) facts.push(`Opened ${count(diff.opened.length, 'goal')}.`);
  if (diff.proved.length > 0) facts.push(`Closed ${count(diff.proved.length, 'goal')}.`);
  const left = step.after.goals.length;
  facts.push(left === 0 ? 'No goals remaining.' : `${count(left, 'goal')} remaining.`);

  return { headline: headline(step, diff), about, facts };
}

function headline(step: Step, diff: StepDiff): string {
  const t = step.tactic;
  const acted = diff.acted;
  const first = diff.opened[0];
  const added = diff.added;
  const closed = diff.opened.length === 0 && acted !== undefined;
  const text = code(step.text.replace(/^·\s*/, ''));
  // `all_goals t` or `t₁ <;> t₂` over several goals: nothing was split, several goals changed.
  const parents = new Set([...diff.parentOf.values()].map((g) => g.id)).size;
  if (parents > 1) return `${text} ran on ${parents} goals at once, changing each in place.`;

  switch (t) {
    case 'intro':
    case 'intros':
      if (added.length > 0 && acted) {
        const moved = added.map((h) => `${code(h.type)} as ${code(h.name)}`).join(' and ');
        return `${text} moved ${moved} out of the goal and into the context.`;
      }
      break;
    case 'constructor':
      if (diff.opened.length > 1) return `${text} split the goal into ${diff.opened.length} parts, one per field.`;
      break;
    case 'cases':
    case 'rcases':
    case 'obtain':
    case 'induction':
      if (diff.opened.length > 1) {
        const tags = diff.opened.map((g) => g.tag).filter(Boolean);
        return `${text} made ${diff.opened.length} goals${tags.length ? `: ${tags.map(code).join(', ')}` : ''}.`;
      }
      break;
    case 'exact':
    case 'rfl':
    case 'decide':
    case 'assumption':
    case 'trivial':
    case 'contradiction':
    case 'omega':
      if (closed) return `${text} proved ${code(acted.target)}.`;
      break;
    case 'apply':
      if (first && acted) return `${text} reduced ${code(acted.target)} to ${code(first.target)}.`;
      if (closed) return `${text} closed the goal outright.`;
      break;
    case 'rw':
    case 'rewrite':
    case 'simp':
    case 'dsimp':
    case 'unfold':
    case 'show':
      if (closed) return `${text} rewrote the goal until it closed.`;
      if (first) return `${text} turned the goal into ${code(first.target)}.`;
      break;
    case 'have':
      if (added.length > 0) return `${text} added ${hypList(added)} to the context.`;
      break;
    case 'case':
    case 'next':
      if (first) return `Focused on ${first.tag ? `the ${code(first.tag)} goal` : 'a goal'}${added.length ? ` and named ${added.map((h) => code(h.name)).join(', ')}` : ''}.`;
      break;
  }
  if (closed) return `${text} closed the goal.`;
  if (diff.opened.length > 1) return `${text} split the goal into ${diff.opened.length}.`;
  if (first) return `${text} changed the goal to ${code(first.target)}.`;
  return `${text} ran.`;
}

/** One sentence for screen readers: "Step 3 of 7: intro h. One goal remains." */
export function stepSummary(stepNo: number, total: number, step: Step | undefined, remaining: number): string {
  const goals = remaining === 0 ? 'No goals remain.' : remaining === 1 ? 'One goal remains.' : `${remaining} goals remain.`;
  if (!step) return `Start. ${goals}`;
  return `Step ${stepNo} of ${total}: ${step.text}. ${step.error ? `Error: ${step.error.message.split('\n')[0]}` : goals}`;
}
