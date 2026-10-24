# Progress

> Read this first after any context reset, then `PLAN.md` and `HUMAN_TASKS.md`.
> Continue from the first unchecked item.

**Current phase:** 1–2 (data pipeline + functional core). Lean is not installed yet, so
everything that needs a real Lean run is waiting on `HUMAN_TASKS.md` item 1.

Last updated: 2026-10-24

## Phase 0: Ground truth

- [x] Environment check: Node 26.1, npm 12, git 2.54 present. pnpm missing, Lean missing.
- [x] Installed pnpm 9.15.9 (`npm i -g pnpm@9`)
- [ ] Install Lean via elan: **blocked**, auto-mode classifier denied running the installer. Handed to the user (HUMAN_TASKS #1).
- [x] Picked and pinned toolchain `leanprover/lean4:v4.34.1` (`lean/lean-toolchain`)
- [x] Read the real v4.34.1 sources for InfoTree, Frontend, Import, Parser, MessageLog to write the extractor against actual signatures (no compiler yet)
- [ ] Run extractor on a 3-line proof and paste real output into `docs/lean-output-notes.md` (needs Lean)
- [x] `git init` on `main`
- [x] `PROMPT.md`, `PROGRESS.md`, `HUMAN_TASKS.md`, `PLAN.md`
- [x] `apps/web/src/identity.ts` with placeholders (identity ask is HUMAN_TASKS #2)

## Phase 1: Data pipeline

- [x] `lean/lakefile.toml` (lib `Samples`, exe `extract`), `lean/Samples.lean`
- [x] Five samples written: `AndComm`, `OrComm`, `ZeroAdd`, `Rev`, `Compiler` (not yet compiled)
- [x] `lean/Extractor.lean`: elaborates a file, walks the InfoTree, prints every original tactic node (cmd, parent, kind, range, goals before/after) as JSON
- [x] `core/raw.ts`: types for extractor JSON
- [x] `core/buildSteps.ts`: raw nodes -> one step per line, with parked-goal reconstruction for `·`/`case`
- [x] `scripts/gen-traces.ts` (`pnpm traces`, `--check` golden mode, `--raw` debug), `scripts/verify-samples.ts` (`pnpm verify`), `scripts/lean.ts` (shared lake runner), `scripts/samples.ts` (manifest with titles/blurbs/watch hints). Fails cleanly when lake is missing.
- [ ] Generate and commit the 5 real traces (needs Lean)
- [ ] CI: `lake build` + golden-trace check

## Phase 2: Working player

- [x] pnpm workspace, TS 6.0 strict config, Vite 8, ESLint, Prettier
- [x] Web deps installed (React 19, three 0.186, R3F 9, drei 10, CodeMirror 6, zustand 5, framer-motion, d3-hierarchy)
- [x] `core/types.ts`: trace schema
- [x] `core/tactics.ts`: `headTactic`, `mentionedNames`, `extractTheorem`
- [x] `core/diff.ts`: `diffStates`, `diffHyps`
- [x] `core/graph.ts`: `buildGoalGraph`, `nodeStatuses` (folds, no mutation)
- [x] `core/frames.ts`: `buildFrames`, `reduce`, `filmOf` (all frames precomputed; scrubbing = array index)
- [x] `core/chooseView.ts`, `core/layout.ts` (d3-hierarchy), `core/lists.ts`, `core/tokens.ts` (LCS token diff), `core/explain.ts` (offline dictionary)
- [x] Unit tests for every core function: `core/core.test.ts`, 38 passing, against a synthetic and_comm-shaped fixture
- [ ] Store, layout, editor, goal panel, Why panel, transport bar, shortcuts, theme
- [ ] First static build

## Phase 3: 3D Tree

- [ ] Tree3D (lazy), hypothesis ring, pulses, proved constellation, camera, Q.E.D.
- [ ] Tree2D SVG fallback / lite mode

## Phase 4: Views and polish

- [ ] List Lab, Rewrite lens, Shrink rail, auto view, autoplay, scrubber, presentation mode, a11y pass

## Phase 5: Ship

- [ ] README, docs (ARCHITECTURE, STEPPING, DEMO), deploy config, live mode (P2), tag v1.0

## Decisions

See `PLAN.md` § Decisions.

## Known issues

- Lean not installed on this machine yet; the samples and the extractor are written against the
  v4.34.1 source but have never been compiled. Expect a round of fixes once Lean is in.
- TypeScript 7 broke typescript-eslint peer ranges; pinned TS `~6.0.0`.
