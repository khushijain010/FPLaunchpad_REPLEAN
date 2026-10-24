# Progress

> Read this first after any context reset, then `PLAN.md` and `HUMAN_TASKS.md`.
> Continue from the first unchecked item.

**Current phase:** 5 (ship). Everything in the brief plus live mode and a Lean error panel is built and
verified: 57 web tests, 22 server tests, golden check, `pnpm verify`, `pnpm capture`, and
`pnpm ui-check` (91/91 clicks-and-checks, zero console errors). Remaining work is yours: push,
deploy, tag, record (HUMAN_TASKS.md). Lean is not installed yet, so
everything that needs a real Lean run is waiting on `HUMAN_TASKS.md` item 1.

Last updated: 2026-10-24 (evening)

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
- [x] Browser check with real traces: `pnpm capture` (Playwright, headless Chromium + SwiftShader WebGL) walks every step of every sample, checks Next/End/Back land on the right frame, fails on any console error, saves `docs/screenshots/`. **Passes: zero console errors.**
- [x] Fixes from that check: duplicate React keys (goal panel listed a proved goal twice; hyp chips keyed by repeatable names like `a✝`), drei `<Html>` + Canvas unmount race (3D scene now stays mounted and is hidden instead), root label missing (Contents wait for `onCreated`), hyp chips moved under the active leaf, split edges labelled once, Q.E.D. text moved off the root, Shrink rail shows the theorem actually being proved, `diffHyps` matches by FVarId first (was flagging `a_ih✝` as changed)

## Phase 3: 3D Tree

- [x] Tree3D (lazy): damped node motion (grow from parent, contract on proof), edge pulse, hypothesis ring with added/used states + beams, gold constellation, camera framing on active goal, double-click reset, Q.E.D. pull-back + pulse, bloom, `frameloop="demand"`, 300-node cap
- [x] Tree2D SVG fallback: same scene/layout; used for lite mode (L), no-WebGL, and as Suspense fallback

## Phase 4: Views and polish

- [x] List Lab (CSS 3D boxes keyed by value, moved boxes lit, symbolic chain + ih fallback)
- [x] Rewrite lens (token diff, from -> to arrow), Shrink rail (theorem, recent steps, shrinking goals with size bars, proved shelf)
- [x] Auto view (`chooseView`), autoplay + speed, custom scrubber with ticks, presentation mode, permalinks
- [x] Keyboard: every control reachable, focus rings, scrubber is an ARIA slider with a text alternative per step, live region announces each step
- [ ] Manual contrast audit (not done; palette chosen for contrast but not measured)

## Phase 5: Ship

- [x] README (real screenshot; story still TODO(me)), docs/ARCHITECTURE.md, docs/STEPPING.md, docs/DEMO.md, docs/lean-output-notes.md (real output)
- [x] CI (`.github/workflows/ci.yml`: lint, typecheck, test, build, `pnpm verify`, `pnpm golden`), GitHub Pages workflow, `vercel.json`, `netlify.toml`
- [x] Pushed to GitHub (FPLaunchpad_REPLEAN). CI: first run failed on invalid YAML, fixed locally, needs a push.
- [x] Deployed on GitHub Pages.
- [ ] Tag v1.0 (after CI is green on GitHub)
- [x] Live mode (P2, requested by the user): `apps/server` (Fastify; 22 tests incl. CORS, origin block, source filter, rate limit, one-job lock), `ui/LiveEditor.tsx` (paste / upload / drag-drop, Ctrl+Enter), `ui/live.ts`, picker entry, Edit button, `pnpm live`. Verified with real Lean in the browser (`pnpm capture` covers upload → run → step → failing proof).
- [x] Public live server: `Dockerfile`, `render.yaml`, Pages build reads `vars.LIVE_API_URL`, CI job builds the image and smoke-tests it (real proof = 3 steps, `#eval` = 422, foreign origin = 403). Docs: `docs/LIVE.md`.
- [x] Docker image: built and running on Render; CI builds and smoke-tests it on every push.
- [x] Live server deployed on Render.

## Deployed (2026-10-24)

- Site: https://khushijain010.github.io/FPLaunchpad_REPLEAN/ (GitHub Pages, built with `LIVE_API_URL`)
- Live server: https://replean-live.onrender.com (Render free, Docker, public mode)
- Verified against the real deployment: `node scripts/smoke-live.mjs https://replean-live.onrender.com`
  (4/4: health, real proof = 3 steps, `#eval` refused, foreign origin refused) and
  `pnpm ui-check https://khushijain010.github.io/FPLaunchpad_REPLEAN/` (91/91, zero console errors,
  live mode through Render).
- Fixed after the first push: `ci.yml` was invalid YAML (a Lean proof with real newlines inside the
  Docker smoke step), so CI never ran; the step now calls `scripts/smoke-live.mjs`. The first Pages run
  failed only because Pages wasn't enabled yet; the re-run succeeded. The server's root URL now answers
  with a short description instead of a 404.
- Commit history cleaned up before the move to the new repo (user request).

## Presentation mode fix (2026-10-24)

- [x] Presentation mode was broken: `.pane { display: flex }` beat the `hidden` attribute, so the code
  side stayed in a 0-width column and the visualization landed in another 0-width column. Fixed with a
  global `[hidden] { display: none !important }` and a one-column grid while presenting.
- [x] `ui-check` now measures presentation mode (code side takes no space, visualization fills the
  window, tabs laid out, tree drawn) instead of only asking "is the code pane hidden". 95/95.
- [x] Removed the sample blurb next to the picker and the "watch" hint above the editor (user: they add
  nothing). The data stays in the trace files; only the UI no longer shows it.
- [x] 3D node labels no longer run past their panels (fixed width + ellipsis; scales with the panel).

## Latest round (user requests)

- [x] **Renamed to Replean** everywhere (UI, docs, packages `@replean/*`, Lean package, Docker/Render
  names, env vars `REPLEAN_*`, localStorage keys). `PROMPT.md` keeps the original brief untouched.
- [x] **Removed the footer** ("Built by ... · Every proof state comes from a real Lean run.") and
  rewrote casual UI copy as plain text: loading, empty and error states, the About dialog (now a plain
  description + "Khushi · Bilibuu · IITR · Syntax Error 2026"), live-mode statuses, server errors.
- [x] **Lean errors in the visualization panel** (`core/errors.ts` + tests, `views/LeanErrors.tsx`):
  a red card with Lean's full message when the step that just ran failed; a "Lean reported N errors"
  bar otherwise, expanded by default when errors can't be reached by stepping, each entry jumping to
  its line; every error line marked in the editor gutter; a live file Lean rejects now opens in the
  player with its errors instead of only a line under the editor.
- [x] **`scripts/ui-check.ts` (`pnpm ui-check`)**: clicks every control (transport, speeds, scrubber
  click/drag/keys, all shortcuts, tabs, auto, lite, presentation, Why, divider, picker, code-line jump,
  permalink, dialogs, live editor: example/upload/drop/run/edit/back/errors) and checks phone width,
  no-WebGL, empty state, bad-trace card, backend-down. 91/91 pass.
- [x] Bugs it found and fixed: the sample picker kept keyboard focus (→ changed the sample instead of
  stepping); a mouse-dragged divider kept focus (→ resized panels); page wider than a phone (grid
  columns sized to content; transport bar didn't wrap); live proofs named after a stale upload.

## Decisions

See `PLAN.md` § Decisions.

## Known issues

- Identity values were entered with their `{{ }}` braces; removed the braces so they render.
- TypeScript 7 broke typescript-eslint peer ranges; pinned TS `~6.0.0`.
