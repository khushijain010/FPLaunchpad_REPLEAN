# Plan

## Stack

- **Lean:** `leanprover/lean4:v4.34.1`, core only, no Mathlib. Lake project in `lean/`.
- **Extractor:** `lean/Extractor.lean`, a Lean 4 program (`lake exe extract <file>`). Elaborates
  the file with `Lean.Elab.IO.processCommands`, walks the InfoTree, and prints JSON.
- **Frontend:** Vite 8 + React 19 + TypeScript 6 (strict), three / R3F / drei / postprocessing,
  CodeMirror 6, zustand, framer-motion (UI only), d3-hierarchy (layout only), Vitest.
- **Live backend (P2):** Node + Fastify on `127.0.0.1`, spawns the same extractor.
- **Tooling:** pnpm workspaces, ESLint (typescript-eslint), Prettier, GitHub Actions.

## Data flow

```
Samples/*.lean --lake exe extract--> raw JSON --buildSteps (pure TS)--> trace.json (committed)
trace.json --buildFrames (pure)--> Frame[] --> views (Tree3D / Tree2D / List Lab / Rewrite / Shrink,
                                               goal panel, Why panel, editor decorations)
```

## Trace schema

`apps/web/src/core/types.ts`, `schema: 1`. Close to the brief's schema, plus:
- `Step.proof`: which top-level declaration the line belongs to (files can have several proofs).
- `Goal.tag`: Lean's case tag (`zero`, `succ`...).
- `Trace.messages`: everything Lean reported, so errors outside proofs still reach the UI.
- `meta.id`, `meta.watch`: sample id and the "what to watch" hint.

Goal parents are *not* stored: `buildGoalGraph` derives them from consecutive states.

## Stepping rule (details in docs/STEPPING.md)

1. Every tactic node with an original source position is a candidate.
2. For each source line, the step starts at the earliest, outermost tactic node on that line.
3. *Before* = that node's goals. *After* = the goals before the next line's first node, or, on a
   proof's last line, the goals after the proof's outermost node.
4. Lean hides parked goals inside `·` / `case`. A goal open both before and after an enclosing
   tactic was untouched by it, so it is added back. The player always shows every open goal.
5. Multi-tactic lines (`a; b`, `a <;> b`) run as one step. A line that opens a block (`· intro x`)
   runs the bullet together with the first tactic.

## Decisions

- **Toolchain v4.34.1** rather than v4.35.0: a patch release that's a month old, vs. 12 days.
- **Extractor (Option A) over the REPL (Option B):** one small Lean file, no extra dependency,
  and it gives MVarIds/FVarIds for diffing. The REPL stays the fallback if Option A fails.
- **Line grouping in TypeScript, not Lean:** keeps the extractor dumb and the rule unit-testable
  without a Lean install.
- **Samples avoid `cases ... with | ...` and `induction ... with`:** those alternatives focus a
  goal without leaving a trace of the sibling goal in the InfoTree, so the sibling would vanish
  from view. `rcases` + bullets and `induction` + `case` keep every goal visible.
- **Hypothesis "used" = mentioned by name in the tactic text.** Honest heuristic, labelled as
  such in the Why panel.
- **3D labels via drei `Html`, not troika `Text`:** troika fetches fallback glyphs from a CDN for
  `∧ ∨ ⊢`, which breaks offline. DOM labels use local fonts and render every glyph.
- **List Lab uses CSS 3D boxes + framer-motion layout animation** instead of WebGL, so it also
  works in lite mode.
- **`base: './'` in Vite** so one build works on Vercel, Netlify, GitHub Pages or a folder.
- **TypeScript pinned to ~6.0:** TS 7 is out but typescript-eslint doesn't support it yet.
- **pnpm 9** installed per-user via npm since corepack isn't bundled with Node 26.
- **Compiler sample is ~40 lines**, over the 15-line guide: it's the boss level, and it still
  steps cleanly (two short proofs).

## Risks

| Risk | Mitigation |
| --- | --- |
| Extractor never compiled yet (no Lean) | Written against the real v4.34.1 source; fix on first run; REPL fallback |
| Sample proofs may need small fixes | Kept conservative (`rfl`, `rw`, `exact`); fix on first `lake build` |
| 3D perf on weak laptops | `frameloop="demand"`, lazy bundle, lite 2D mode |
| WebGL missing | Auto-detect, fall back to Tree2D |
