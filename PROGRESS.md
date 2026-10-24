# Progress

> Read this first after any context reset, then `PLAN.md` and `HUMAN_TASKS.md`.
> Continue from the first unchecked item.

**Current phase:** 5 (ship). Real traces exist; next is a browser check of the player. Lean is not installed yet, so
everything that needs a real Lean run is waiting on `HUMAN_TASKS.md` item 1.

Last updated: 2026-10-24

## Phase 0: Ground truth

- [x] Environment check: Node 26.1, npm 12, git 2.54 present. pnpm missing, Lean missing.
- [x] Installed pnpm 9.15.9 (`npm i -g pnpm@9`)
- [x] Install Lean via elan: done by the user (elan 4.2.4, Lean 4.34.1)
- [x] Picked and pinned toolchain `leanprover/lean4:v4.34.1` (`lean/lean-toolchain`)
- [x] Read the real v4.34.1 sources for InfoTree, Frontend, Import, Parser, MessageLog to write the extractor against actual signatures (no compiler yet)
- [x] Ran the extractor on and_comm; real output + surprises in `docs/lean-output-notes.md`
- [x] `git init` on `main`
- [x] `PROMPT.md`, `PROGRESS.md`, `HUMAN_TASKS.md`, `PLAN.md`
- [x] `apps/web/src/identity.ts` with placeholders (identity ask is HUMAN_TASKS #2)

## Phase 1: Data pipeline

- [x] `lean/lakefile.toml` (lib `Samples`, exe `extract`), `lean/Samples.lean`
- [x] Five samples written: `AndComm`, `OrComm`, `ZeroAdd`, `Rev`, `Compiler` (all compile with `lake build`, first try)
- [x] `lean/Extractor.lean`: elaborates a file, walks the InfoTree, prints every original tactic node (cmd, parent, kind, range, goals before/after) as JSON
- [x] `core/raw.ts`: types for extractor JSON
- [x] `core/buildSteps.ts`: raw nodes -> one step per line, with parked-goal reconstruction for `·`/`case`
- [x] `scripts/gen-traces.ts` (`pnpm traces`, `--check` golden mode, `--raw` debug), `scripts/verify-samples.ts` (`pnpm verify`), `scripts/lean.ts` (shared lake runner), `scripts/samples.ts` (manifest with titles/blurbs/watch hints). Fails cleanly when lake is missing.
- [x] Generated the 5 real traces (4/6/5/7/10 steps, zero Lean errors) and read every step against the source. Fixes needed on first run: `enableInitializersExecution` in the extractor; skip `by` nodes as step starts.
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
- [x] `core/validate.ts` (+ tests): bad trace -> readable error, never a crash
- [x] `ui/theme.css` (palette tokens, self-hosted fonts, focus rings, reduced motion, <900px stacking)
- [x] `ui/store.ts` (zustand), `ui/loader.ts` (fetch index/trace, `#sample=&step=` permalink, autoplay)
- [x] `ui/leanLanguage.ts` (Lean 4 tokenizer), `ui/CodePane.tsx` (current/ran/next/error lines, error gutter, click a line to jump)
- [x] `views/GoalPanel.tsx` (diff colours, proved rows, Q.E.D., next-theorem preview), `views/WhyPanel.tsx`
- [x] `ui/Logo.tsx` + `public/favicon.svg`, `ui/TopBar.tsx`, `ui/TransportBar.tsx` (custom scrubber with ticks), `ui/Split.tsx` (draggable 35-65%), `ui/shortcuts.ts`, `ui/Dialogs.tsx` (cheatsheet, About)
- [x] `core/scene.ts` (+ tests): one pure scene for both Tree3D and Tree2D
- [x] `views/VizPane.tsx` (tabs, auto view w/ manual override, lite toggle, presentation, remaining counter), `views/Tree2D.tsx`, `App.tsx`, `main.tsx`, `index.html`, `ui/app.css`, `ui/StatusCard.tsx` (loading / no traces / error), `ui/ErrorBoundary.tsx`
- [x] First static build: `vite build` OK. Main bundle 217 KB gzip; Tree3D lazy chunk 279 KB gzip. 50 tests, lint clean, tsc clean.
- [ ] Visual check in a browser with real traces (needs Lean)

## Phase 3: 3D Tree

- [x] Tree3D (lazy): damped node motion (grow from parent, contract on proof), edge pulse, hypothesis ring with added/used states + beams, gold constellation, camera framing on active goal, double-click reset, Q.E.D. pull-back + pulse, bloom, `frameloop="demand"`, 300-node cap
- [x] Tree2D SVG fallback: same scene/layout; used for lite mode (L), no-WebGL, and as Suspense fallback

## Phase 4: Views and polish

- [x] List Lab (CSS 3D boxes keyed by value, moved boxes lit, symbolic chain + ih fallback)
- [x] Rewrite lens (token diff, from -> to arrow), Shrink rail (theorem, recent steps, shrinking goals with size bars, proved shelf)
- [x] Auto view (`chooseView`), autoplay + speed, custom scrubber with ticks, presentation mode, permalinks
- [ ] a11y pass in a real browser (focus order, contrast check) once traces exist

## Phase 5: Ship

- [ ] README, docs (ARCHITECTURE, STEPPING, DEMO), deploy config, live mode (P2), tag v1.0

## Decisions

See `PLAN.md` § Decisions.

## Known issues

- Identity values were entered with their `{{ }}` braces; removed the braces so they render.
- TypeScript 7 broke typescript-eslint peer ranges; pinned TS `~6.0.0`.
