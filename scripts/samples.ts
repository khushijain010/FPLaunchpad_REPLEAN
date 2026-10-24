// The sample files the player ships with, in picker order.

export type SampleSpec = Readonly<{
  id: string;
  file: string;
  title: string;
  blurb: string;
  watch: string;
}>;

export const SAMPLES: readonly SampleSpec[] = [
  {
    id: 'and_comm',
    file: 'Samples/AndComm.lean',
    title: 'And, swapped',
    blurb: 'p ∧ q → q ∧ p with intro, constructor and exact.',
    watch: 'Line 5: one goal splits into two. Then each branch turns gold.',
  },
  {
    id: 'or_comm',
    file: 'Samples/OrComm.lean',
    title: 'Or, swapped',
    blurb: 'p ∨ q → q ∨ p by splitting on which side is true.',
    watch: 'rcases makes two branches with different hypotheses: hp in one, hq in the other.',
  },
  {
    id: 'zero_add',
    file: 'Samples/ZeroAdd.lean',
    title: 'Zero plus n, by induction',
    blurb: 'myAdd 0 n = n: a base case, a step case and an induction hypothesis.',
    watch: 'In the succ case, ih arrives in the context, then rw [ih] spends it.',
  },
  {
    id: 'rev',
    file: 'Samples/Rev.lean',
    title: 'Reversing [1, 2, 3]',
    blurb: 'A hand-rolled rev, unfolded one rewrite at a time.',
    watch: 'Open List Lab: each rw [rev] moves the head of the list to the back.',
  },
  {
    id: 'compiler',
    file: 'Samples/Compiler.lean',
    title: 'A tiny compiler, proved correct',
    blurb: 'Arithmetic expressions compiled to a stack machine, with a correctness proof.',
    watch: 'The add case uses both induction hypotheses, one rewrite each.',
  },
];
