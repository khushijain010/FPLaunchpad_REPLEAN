# Architecture

Replay first, live optional: the demo never depends on a Lean process being alive.

```
 ┌──────────────────────┐   lake exe extract   ┌────────────┐  buildSteps   ┌─────────────┐
 │ lean/Samples/*.lean  │ ───────────────────▶ │  raw JSON  │ ────────────▶ │ trace.json  │  committed
 └──────────────────────┘  (Lean 4, InfoTree)  └────────────┘   (pure TS)   └──────┬──────┘
                                                                                  │ fetch
                                                                                  ▼
                       ┌───────────────────── pure core ─────────────────────────────────┐
                       │ buildFrames(trace) ─▶ Frame[0..N]                               │
                       │   diffStates · buildGoalGraph · nodeStatuses · layoutTree      │
                       │   chooseView · explainTactic · buildScene · tokenDiff · lists  │
                       └──────────────────────────────┬──────────────────────────────────┘
                                                      │ frames[step]
            ┌──────────────┬──────────────┬───────────┼────────────┬──────────────┬─────────────┐
            ▼              ▼              ▼           ▼            ▼              ▼             ▼
       CodePane       GoalPanel       WhyPanel     Tree3D       Tree2D        ListLab   Rewrite/Shrink
   (decorations)    (diff colours)  (dictionary)  (R3F)       (SVG, 2D)     (CSS 3D)    (DOM)
```

## The pieces

**Extractor (Lean).** `lean/Extractor.lean` parses the header, imports, runs
`Lean.Elab.IO.processCommands` over the file, then walks each command's InfoTree, threading the
`ContextInfo` the same way `InfoTree.visitM` does. For each tactic node with an original position
it pretty-prints the goals before and after with `ppExpr`, inside the metavariable context they
belong to (`mctxBefore` / `mctxAfter`). Goals keep their `MVarId` and hypotheses their `FVarId`, so
the frontend can tell "the same goal" from "a new goal that looks similar". It does no grouping.

**buildSteps (TS, pure).** Raw nodes to one step per line. See `docs/STEPPING.md`.

**buildFrames (TS, pure).** Frame `k` is the world after `k` steps. All frames are computed when a
trace loads (they're small), so scrubbing, Back, Home/End and permalinks are array lookups and can
never disagree with stepping. `reduce(trace, k)` is the indexed form.

**Goal graph.** Goals are nodes, tactics are edges, and identity is Lean's own goal id, so two
goals that print the same are still two nodes. A goal that exists after a step but not before hangs
under the goal Lean produced it from (`Step.parents`, read off the narrowest tactic node that
created it, so `all_goals` and `<;>` keep each branch apart), falling back to the first goal that
disappeared. Built with a fold over the steps.

**Layout.** `d3-hierarchy`'s tidy tree over the *whole* graph, computed once. A node knows where it
will sit before it is born, so nothing jumps as the tree grows. Every node is sized to its full,
wrapped goal text and siblings are spaced by those sizes. Depth goes down Y and back in Z.

**Views.** Each view is a function of a `Frame` (and the trace-wide `Film`). The 3D view keeps one
kind of state, animation progress, which it damps toward the frame's targets each tick and stops
rendering once settled (`frameloop="demand"`).

## Where the side effects are

| Edge | File |
| --- | --- |
| Spawning `lake` | `scripts/lean.ts` |
| Fetching traces, URL hash, autoplay timer | `apps/web/src/ui/loader.ts` |
| The store (step, view, speed, toggles) | `apps/web/src/ui/store.ts` |
| WebGL, DOM | the view components |

`apps/web/src/core/` imports nothing from React, the DOM or the store. Its data is `Readonly` all the
way down and its functions return new values. A few string scanners (`lists.ts`, `tokens.ts`) use
local loops; nothing outside the function can see them.

## Tests

- `core/core.test.ts`, `core/scene.test.ts`, `core/validate.test.ts`: every pure function.
- `pnpm golden` (CI): regenerate every trace with real Lean and compare to the committed JSON.
- `pnpm verify` (CI): `lake build Samples`.
