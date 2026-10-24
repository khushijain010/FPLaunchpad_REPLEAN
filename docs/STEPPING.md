# What "one line" means

Pressing **Next** runs exactly one source line of the proof. Lean doesn't think in lines; it
thinks in tactics, and tactics nest. This is the rule that maps one onto the other. It lives in
[`apps/web/src/core/buildSteps.ts`](../apps/web/src/core/buildSteps.ts) and is unit-tested.

## Input

The extractor (`lean/Extractor.lean`) records every tactic node in Lean's InfoTree that has an
*original* source position. Nodes created by macro expansion (the `rewrite` hiding inside `rw`,
for example) carry synthetic positions and are dropped. Each node has a start and end position,
its nearest enclosing tactic node, the top-level command it came from, and the goals before and
after it.

## The rule

1. **Steps are grouped by top-level command.** Each `theorem` / `def` with a `by` block is one
   proof, numbered `proof: 0, 1, ...`.
2. **One step per line that has a tactic starting on it.** Lines that only continue a tactic
   from the line above (a long `simp only [...]` wrapped over two lines) are not steps.
3. **A step starts at the earliest tactic on its line**, and among tactics starting at the same
   column, the outermost one. For `· exact h.2` that's the bullet, not `exact`.
4. **Before** = the goals before that node.
5. **After** = the goals before the *next* step's node. On a proof's last line, it's the goals
   after the proof's outermost node.

Rule 5 is what makes a line atomic: whatever ran between the start of this line and the start
of the next (one tactic, three tactics joined by `;`, a `<;>` combinator, the first half of a
block) counts as this line.

## Parked goals

Inside `·` and `case`, Lean shows a tactic only the goal it's focused on. The others are parked
and reappear later. A player that only showed the focused goal would make goals blink in and
out of existence, so `fullGoals` adds them back:

> A goal that is open both **before and after** an enclosing tactic was untouched by it. So it
> is still open at every point inside that tactic.

Walking up a node's ancestors and collecting those goals gives the full list, in order: focused
goals first, then parked ones.

`cases h with | inl … | inr …` (and `induction … with`, `match`) is different: the tactic makes
every alternative's goal at once, but Lean records each one only on its own alternative, never in
any tactic's "after". So while `inl` runs, `inr` is **waiting**:

> The goals of later siblings, along the path up from a node, that no tactic produced, are still
> open at that node.

The `cases` line therefore opens both goals, and `inr` stays visible (and stays attached to the
goal `cases` split) until its turn.

## Where each goal came from

A goal that appears on a line hangs under the goal it came from. Lean tells us: the narrowest
tactic node that produced a goal (fewest goals before it, then the innermost) was working on its
parent. `all_goals intro h` on `p → p` and `q → q` records one `intro` per goal, so `p` hangs under
`p → p` and `q` under `q → q`, and neither original is counted as proved. The result is stored per
step as `parents`; without it, every new goal would be credited to the first goal that changed.

Both rules are tested on real extractor output for [`lean/Fixtures`](../lean/Fixtures), which
`pnpm golden` regenerates and checks like the sample traces.

## Consequences

| Source line | What one Next does |
| --- | --- |
| `intro h` | Runs `intro h`. |
| `constructor` | Splits the goal. Both new goals appear. |
| `· exact h.2` | Focuses the first goal and closes it. The other goal stays visible. |
| `· apply Or.inr` (block continues below) | Focuses and runs `apply`. The rest of the block is the following lines. |
| `case succ k ih =>` (body below) | Focuses `succ` and names `k`, `ih`. Shown as a goal changing its hypotheses. |
| `case zero => rfl` | Focuses and closes in one step. |
| `intro h; exact h` | Both tactics, one step. |
| `constructor <;> simp` | One step. |
| `cases h with` (alternatives below) | Opens one goal per alternative; the later ones wait, visible, until their turn. |
| `all_goals intro h` | One step; each goal is transformed in place, under its own branch. |

## Known limits

- If a single declaration has two separate `by` blocks, the last line of the first block hands
  its "after" to the first line of the second. Rare, and none of the samples do it.
- Columns are Lean codepoint offsets. Lean source here is all in the Basic Multilingual Plane,
  where that equals the UTF-16 offset JavaScript uses.
