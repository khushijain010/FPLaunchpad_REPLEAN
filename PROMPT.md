# Project brief: a 3D Lean 4 Proof Player

> **How to start:** save this file at the repo root as `PROMPT.md`, open your coding agent in that folder, and send:
> **"Read PROMPT.md fully and execute it end to end, Phase 0 through Phase 5, without stopping for approval. Follow the Human Task Protocol in section 1."**

---

## 1. Autonomy and Human Task Protocol (read this first)

### 1.1 Run to completion
You are the senior engineer on a hackathon team. **Execute every phase (0 to 5) in one continuous run.** Do not stop after a phase to ask whether to continue. Do not wait for approval. The only reasons to stop early are:
- a hard blocker that only the human can resolve AND no other useful work remains (see 1.3), or
- the Definition of Done (section 13) is fully met.

If something is ambiguous, **pick the most reasonable default, write the decision into `PLAN.md` under "Decisions", and keep going.** Never end a turn with a half-finished phase.

### 1.2 Stay resumable
Context can be compacted or the session restarted. To survive that:
- Keep `PROGRESS.md` at the repo root: current phase, a checklist of tasks (done / in progress / next), decisions made, and known issues. Update it after every meaningful step and before every commit.
- At the start of any session or after any context reset, **read `PROGRESS.md`, `PLAN.md` and `HUMAN_TASKS.md` first**, then continue from the first unchecked item.
- Keep a live task list in your working memory and mirror it into `PROGRESS.md`.

### 1.3 Human Task Protocol (when you need me to do something)
Some things you cannot do from the terminal. When you hit one:

1. **Tell me immediately in the chat** using this exact block, then keep working on everything else that does not depend on it:

```
ACTION NEEDED FROM YOU
Task:      <one clear sentence>
Why:       <why it is needed>
How:       <exact steps or the exact command to run, copy-pasteable>
Blocking:  <what is blocked, or "nothing, I am continuing with X">
Priority:  <now / before submission / optional>
```

2. **Append the same entry to `HUMAN_TASKS.md`** (a checklist with `- [ ]`), so nothing is lost if the chat scrolls away.
3. **Never block on me if you can avoid it.** Use a safe default or a placeholder, mark it `TODO(me)`, and continue. Example: if you need my name, write `{{YOUR_NAME}}` in a single config file (`apps/web/src/identity.ts`) so I can fill it once.
4. **Group requests.** Do not ping me ten times; batch related asks.
5. **At the very end**, print a final **"YOUR CHECKLIST"** listing every unchecked item in `HUMAN_TASKS.md`, ordered by priority, with exact commands.

**Tasks I will probably need to do (anticipate and surface these early, in Phase 0):**
- Install Lean via `elan` if missing, and Node 20+ / pnpm / git (give me the exact commands for my OS).
- Create a GitHub repo and push (give me the exact `git remote add` / `git push` commands, since you cannot log in for me).
- Log in to the hosting service (Vercel, Netlify, or GitHub Pages) and deploy, or enable GitHub Pages (give me the exact clicks or CLI commands and prepare the config files for you to do everything else).
- Provide personal details (name, team, college, my one-line story), see section 3.
- Review and rewrite the README sections marked `TODO(me)` in my own words.
- Test the deployed link on my own laptop and phone.
- Record the backup demo video and take the final screenshots/GIF (you may script the capture, but I must run it or screen-record).
- Submit on the hackathon portal (links, description, video).
- Optional: supply an API key only if I choose to enable the optional "Explain this step" feature.

### 1.4 Working rules
1. **Vertical slice first.** The app must be demoable end to end at the end of every phase. Never leave `main` broken.
2. **Truth over polish.** Every proof state shown must come from a real Lean run. No hand-written fake traces, no lorem ipsum, no features claimed in the README that are not built.
3. **Verify, don't assume.** Lean tooling changes between versions. Before relying on any API, flag or JSON shape (REPL, InfoTree, `lake`), run it and read the real output. Search the web for current docs when unsure.
4. **Small commits.** Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`), one logical change each, committed continuously.
5. **When something fails:** diagnose, try up to three different approaches, then log it in `PROGRESS.md` under "Known issues", choose a fallback, and move on. Do not loop forever on one problem.
6. **Phase-end status:** after each phase, print a 5 to 10 line status in the chat (what works, what was cut, any action needed) and **immediately continue to the next phase**.
7. **Pure functions at the core.** This is the Functional Programming track, so the architecture must show it (section 6).
8. **Never invent facts about me**, my team, or my background (section 3).
9. **Self-review before finishing:** run the full checklist in section 13, fix what fails, and only then declare completion.

---

## 2. The problem statement (verbatim)

> **3. Proof Player**
> A viewer for a Lean file. Press next and one line of the proof runs. Next to the code, a picture keeps up with that line: a graph grows, a list rearranges, or a goal shrinks down to what was just proved. It comes with a few short sample files so there is something to step through right away.

Hackathon: Syntax Error 2026, Functional Programming track.

Hard requirements derived from it:
- **Next** advances exactly **one line** of the proof.
- **Code on the left, visualization on the right half of the screen.**
- The visualization covers all three behaviours named: **a graph grows**, **a list rearranges**, **a goal shrinks to what was just proved**.
- **Several short sample files** load instantly, with no setup for the viewer.

---

## 3. Product vision, positioning, and personal identity

**Working name:** `{{PROJECT_NAME}}`, default **Lemmascope** (alternatives: Tacticon, Stepwise, ProofLens). Use the default unless I say otherwise; keep the name in one config file so it is a one-line change.

**One-line pitch:** *Watch a Lean proof think.* Step through a Lean 4 proof one line at a time while a 3D scene shows goals splitting, hypotheses arriving, and goals being proved.

### 3.1 Honest positioning (put this in the README)
- **Paperproof** already renders Lean 4 proofs as 2D paper-like proof trees from the history of hypotheses and goals, inside the editor.
- **lean-tui** is a terminal infoview with tactic, data-flow and effect-flow graphs.

We do not claim to be the first proof visualizer. Our differentiators:
1. **A player, not just a view.** Next, back, scrub, autoplay: built for *learning and presenting*.
2. **Standalone and zero-install in demo mode.** Open a URL, pick a sample, press next.
3. **Three coordinated views** matching the problem statement (tree, list lab, goal shrink rail) with automatic view selection per step.
4. **A "Why" panel** explaining each tactic in plain English: what it used, what changed, what it closed.
5. **A 3D scene** that makes branching, scope depth and closing physically legible.

### 3.2 Personal identity (so it does not look machine-generated)
Identity values live in **one file**, `apps/web/src/identity.ts`, with these fields and placeholders:
`{{YOUR_NAME}}`, `{{TEAM_NAME}}`, `{{COLLEGE_OR_ORG}}`, `{{ONE_LINE_STORY}}`, `{{PROJECT_NAME}}`.
Do not wait for my answers: fill the file with the placeholders, build everything against it, raise one batched **ACTION NEEDED** asking me to fill it, and continue. Every place that shows these values must read them from this file.

**Visual identity**
- Start from the hackathon's look: near-black background (`#0A0A0A`), signal orange accent (about `#FF4F00`), monospace-forward type with a geometric sans for headings (self-host via `@fontsource`, e.g. JetBrains Mono and Space Grotesk, so it works offline).
- Add a distinct twist so it does not look like a template. Semantic palette:
  - hypotheses = cool cyan/teal
  - open goals = brand orange
  - proved = warm gold glow
  - error = red
- Design a small custom logo mark (inline SVG) and favicon. No stock gradients, no purple-to-blue hero, no glassmorphism cards stacked everywhere, no default component-library look.
- Details that show care: tabular numerals for step counters, a restrained Q.E.D. moment, thoughtful empty states, a custom scrubber.

**Voice**
- First person, plain English, a little dry humour. Short sentences.
- Banned words: *leverage, seamless, unlock, empower, delve, cutting-edge, revolutionize, supercharge*.
- No emojis in the UI. No exclamation marks except in the Q.E.D. moment.
- Microcopy to adapt: loading = "Asking Lean nicely...", error = "Lean disagrees on line 4.", complete = "Q.E.D. Nothing left to prove."
- README opens with my story in my voice. Where I must write something personal, leave `TODO(me):` and list it in `HUMAN_TASKS.md`; do not invent it.
- Footer and About dialog: "Built by {{YOUR_NAME}} for Syntax Error 2026."

---

## 4. Layout and UX

Full-viewport, two columns, **50/50 by default with a draggable divider** (min 35%, max 65%).

**Left half: the code side**
- Top bar: logo, sample picker (title and one-line description), Demo/Live mode badge.
- **Code editor** (CodeMirror 6): read-only in demo mode, editable in live mode. Write a small custom Lean 4 tokenizer (keywords, tactics, comments, unicode symbols). The **current line is highlighted**, already-run lines are dimmed but readable, errors get a red gutter marker.
- **Goal panel below the editor** (infoview-style): hypotheses and `⊢ goal` for each open goal, with **diff highlighting** (added in cyan, changed in orange, removed struck through).
- **Why panel** (collapsible): plain-English explanation of the tactic that just ran.
- A "what to watch" hint above the editor for each sample.

**Right half: the visualization**
- Tabs along the top: **Tree (3D)**, **List Lab**, **Rewrite**, **Shrink**. Auto-switches to the best view per step; a manual choice wins until the next sample is loaded.
- Fullscreen toggle ("presentation mode").

**Bottom transport bar (full width)**
- Prev / **Next** / Play-pause / speed (0.5x, 1x, 2x), scrubber with one tick per proof line, step counter `7 / 12`, Reset.
- **Shortcuts:** `→` or `Space` next, `←` prev, `Home`/`End`, `P` autoplay, `1`-`4` switch views, `[` `]` speed, `F` fullscreen viz, `?` cheatsheet.

Responsive: below 900px, stack the columns (code above, viz below). Respect `prefers-reduced-motion`. Dark theme only.

---

## 5. Visualization spec

The scene is **a pure function of the current step index.** Transitions are interpolated between frames, so scrubbing backwards and jumping around are always correct.

### 5.1 Tree (3D), the hero view
Built with `three` + `@react-three/fiber` + `@react-three/drei` (+ light bloom via `@react-three/postprocessing`).
- **Goals are nodes** (glowing rounded panels or gems with crisp text via `drei`'s `Text`/`Html`). **Tactics are edges**; a pulse of light travels along the edge when the line runs.
- **The graph grows:** `constructor`, `cases`, `induction`, `rcases`, `by_cases` spawn child goals as visible branches. Deterministic layout (a tree layout such as `d3-hierarchy`: depth on one axis, branch fan-out on another, scope nesting on Z). No force-simulation jitter.
- **Hypothesis ring:** for the active goal, hypotheses float as small chips beside it. New ones fly in with a cyan trail, removed ones dissolve, ones **used by this tactic** connect to the goal with a thin beam (this also feeds the Why panel).
- **Goal shrinks / is proved:** when a goal closes, its node contracts, turns gold, and glides into a **"proved" constellation** along the base of the scene. A remaining-goals counter is always visible.
- **Camera:** smooth auto-framing on the active goal, free orbit on drag, double-click to reset.
- **Q.E.D. moment:** when no goals remain, proved nodes pulse once, the camera pulls back to show the whole proof as one shape, and "Q.E.D." fades in. One restrained animation, not confetti.
- **Performance and fallbacks:** instanced meshes where possible, `frameloop="demand"` when idle, dispose geometries, cap at about 300 nodes, lazy-load the 3D bundle. Provide a **2D SVG fallback** (same data, same layout) when WebGL is unavailable or "lite mode" is toggled. Target 60 fps on a mid-range laptop.

### 5.2 List Lab ("a list rearranges")
- Parse concrete list literals from the goal (e.g. `[1, 2, 3]`) and show them as a **row of 3D boxes (cons cells)**. When a rewrite or unfold changes the list, boxes **slide, flip or reorder** into the new arrangement; the touched element is lit.
- If the goal has no concrete list, show a symbolic cons-chain (`x :: xs`) with the induction hypothesis attached.

### 5.3 Rewrite lens
- Before/after goal with **token-level diff** and an arrow from the matched pattern to its replacement for `rw`, `simp only`, `unfold`.
- Stretch: if the extractor emits `Expr` trees, morph the expression tree between steps.

### 5.4 Shrink rail ("a goal shrinks down to what was just proved")
- A compact 2D rail: the theorem statement on the left, remaining goals shrinking toward the right, closed goals collapsing into a "proved" shelf. Each step visibly shrinks or splits the goal text. This is the clean, low-motion view for the demo opening.

### 5.5 Auto view selection (pure function `chooseView(step)`)
- Structural tactics (`constructor`, `cases`, `induction`, `intro`, `apply`) -> Tree
- Rewriting tactics (`rw`, `simp`, `unfold`, `omega`) -> Rewrite, or List Lab if the goal contains a concrete list
- Final closing steps -> Shrink, then Tree for the Q.E.D. moment

### 5.6 Why panel
A curated dictionary of tactic explanations (`intro`, `apply`, `exact`, `constructor`, `cases`, `induction`, `rw`, `simp`, `omega`, `rfl`, `have`, `show`, `contradiction`, bullet `·`), filled from the structured diff, e.g. *"`intro h` moved the assumption `p ∧ q` out of the goal and into the context as `h`."* Show tactic text, hypotheses used, hypotheses added/removed, goals opened/closed. It must work **offline with no AI call.**

---

## 6. Architecture and stack

### 6.1 Principle: replay-first, live-optional
> The demo must never depend on a Lean server being alive.

1. A **trace generator** runs real Lean over each sample and writes `trace.json` (committed to the repo).
2. The **frontend is a static replay engine** over `trace.json`; it deploys as a plain static site.
3. **Live mode** (paste or edit your own Lean) uses a small local backend that runs the same extractor and returns a trace. Optional and local-only.

### 6.2 Functional core (this is the FP track, so show it)
- **Immutable data, discriminated unions, no mutation** in the core. TypeScript `strict`.
- `reduce(trace, stepIndex) -> Frame` is a **pure function**; the 3D scene, goal panel and Why panel are all derived from `Frame`.
- Pure, unit-tested functions: `diffStates`, `chooseView`, `layoutTree`, `parseListLiteral`, `explainTactic`, `buildFrames`.
- State (step, view, speed) lives in one small store (`zustand`); side effects sit at the edges (rendering, fetching, backend).
- Write the **Lean-side extractor in Lean 4 itself** (metaprogramming over the InfoTree). It is on-theme and a good talking point.

### 6.3 Stack
- **Frontend:** Vite + React + TypeScript, `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, CodeMirror 6, `zustand`, `framer-motion` (UI only), `d3-hierarchy` (layout only), Vitest.
- **Backend (live mode only):** Node + TypeScript (Fastify) that spawns Lean with `lake env`, with timeouts and size limits.
- **Lean:** core Lean 4 only for samples. **No Mathlib** (huge download, slow). Pin the toolchain in `lean-toolchain`.
- **Tooling:** pnpm workspaces (`apps/web`, `apps/server`, `lean/`), ESLint, Prettier, GitHub Actions CI.

### 6.4 Getting proof states out of Lean (verify empirically in Phase 0)
- **Option A (preferred): a small Lean metaprogram** that elaborates a file, walks the InfoTree, and for every tactic node emits `goalsBefore` and `goalsAfter` with pretty-printed hypotheses and targets plus source positions. The community `export_infotree` tool in `lean-training-data` does something similar and is a good reference.
- **Option B (fallback): the official Lean REPL** (`leanprover-community/repl`). File mode with `"allTactics": true` returns each tactic with position and goals; tactic mode replays step by step from a `sorry` state. **Check whether `goals` is the state before or after each tactic** on the installed version before building on it.
- Lean 4 does not run in the browser (the native build is far too large), so server-side generation plus pre-baked traces is the right call. Do not spend time on WASM.

**Stretch:** `simp` is a black box. Try Lean's simp rewrite trace (e.g. `set_option trace.Meta.Tactic.simp.rewrite true`, verify the option name) and animate **which lemmas `simp` used, in order**.
**Stretch:** a **Term view** showing the proof term assembled, with each goal as a hole a tactic fills (Curry-Howard made visible).

### 6.5 Trace schema (adapt after Phase 0; keep it flat and versioned)
```ts
type Trace = {
  schema: 1;
  meta: { title: string; blurb: string; theorem: string; leanVersion: string };
  source: string;               // full file text
  steps: Step[];                // one per executed proof line
};
type Step = {
  index: number;
  range: { line: number; colStart: number; colEnd: number };
  text: string;                 // the tactic as written
  tactic: string;               // head tactic name: "intro", "rw", ...
  before: ProofState;
  after: ProofState;
  error?: { message: string };
};
type ProofState = { goals: Goal[] };
type Goal = { id: string; parent?: string; hyps: Hyp[]; target: string };
type Hyp = { name: string; type: string; id: string };
```
Diffs (`added`, `removed`, `changed`, `closed`, `opened`, `usedHyps`) are computed by pure frontend functions from `before`/`after`, not stored.

**Line vs tactic:** the user presses next and *one line* runs. Map tactics to source lines. Handle nested blocks (`·` bullets, `cases ... with | inl h => ...`, `<;>`, `induction ... with`) sensibly: a line that opens a block steps to the first tactic of that block; multi-tactic lines run as one step. Document the rule in `docs/STEPPING.md`.

---

## 7. Sample files (ship 5; all must compile with `lake build`)

Core Lean only. Keep each under about 15 lines so it fits on screen. Each has a title, a one-line blurb, and a "what to watch" hint.

1. **`and_comm`**: `p ∧ q → q ∧ p` using `intro`, `constructor`, `exact`. The graph grows: one goal splits into two.
2. **`or_comm`**: `p ∨ q → q ∨ p` using `cases`/`rcases`. Two branches, both closing.
3. **`zero_add` by induction** on `Nat` (use your own `myAdd` or a primed name to avoid clashing with core). Base case, step case, induction hypothesis, `rw`/`simp`.
4. **`rev` on a concrete list**: a small recursive `rev`/`app`, then prove `rev [1,2,3] = [3,2,1]` with a sequence of `simp only [...]`/`unfold` steps so the **list visibly rearranges** in List Lab.
5. **Boss level, tiny compiler correctness**: an arithmetic `Expr`, an `eval`, a `compile` to a stack machine, `run`, and `theorem compile_correct` by induction. If it is too long for a clean step-through, split it into a short lemma-focused file.

Real traces for all five are generated by Lean and committed under `apps/web/public/traces/`.

---

## 8. Feature tiers

**P0 (must ship, Phases 1 to 3):** extractor, 5 real traces, split layout, editor with line highlight, Next/Prev/Reset, goal panel with diff, 3D Tree with growing and closing animation, Why panel, shortcuts, static-site build.

**P1 (should ship, Phase 4):** List Lab, Rewrite lens, Shrink rail, auto view selection, autoplay and speed, scrubber, Q.E.D. moment, 2D lite mode, presentation mode, polished empty/loading/error states.

**P2 (stretch, only if P0 and P1 are solid):** live mode (paste your own Lean), simp lemma trace, Term view, export PNG or GIF/WebM, shareable permalink (`#sample=and_comm&step=3`), optional "Explain this step" using a user-supplied API key held in memory only and off by default.

Cut from the bottom first. A flawless P0+P1 beats a flaky P2.

---

## 9. Quality bar

- **Correctness:** Vitest unit tests for every pure function; a golden-trace test that regenerates one sample and compares to the committed JSON; `lake build` for all samples in CI.
- **Errors:** an illegal or failing line shows a red marker in the editor and a clear message, and the Tree highlights the failing goal in red. The player never crashes on a bad trace; it shows an explanatory error card.
- **Security (live mode):** Lean can run arbitrary IO (`#eval`, metaprograms). Bind the backend to `127.0.0.1`, set timeouts and size/memory limits, and document that live mode must not be exposed publicly without a sandbox. The public deployment is **demo mode only.**
- **Accessibility:** full keyboard operation, visible focus rings, ARIA labels, sufficient contrast, reduced-motion support, a text alternative per step ("Step 3: intro h. One goal remains.").
- **Performance:** first paint under 2 seconds on a normal connection, no layout shift, 3D scene lazy-loaded.
- **Code quality:** strict TS, no unexplained `any`, ESLint and Prettier clean, no dead code, meaningful names, small modules.

---

## 10. Repository layout and docs

```
/
├─ apps/web/            # Vite + React + TS frontend
│  ├─ src/identity.ts   # name, team, story, project name (the one place to personalize)
│  ├─ src/core/         # pure logic: reduce, diff, layout, chooseView, explain
│  ├─ src/views/        # Tree3D, ListLab, Rewrite, Shrink, GoalPanel, WhyPanel
│  ├─ src/ui/           # layout, editor, transport bar, theme
│  └─ public/traces/    # committed trace JSON + sample sources
├─ apps/server/         # optional live-mode backend
├─ lean/                # lakefile, lean-toolchain, Samples/*.lean, Extractor.lean
├─ scripts/             # gen-traces, verify-samples
├─ docs/                # ARCHITECTURE.md, STEPPING.md, DEMO.md, lean-output-notes.md, screenshots
├─ PROMPT.md  PLAN.md  PROGRESS.md  HUMAN_TASKS.md  README.md  LICENSE
└─ .github/workflows/ci.yml
```

**README.md** includes: my story (in my voice, with `TODO(me)` where needed), a 15-second GIF or screenshot at the top, the one-line pitch, a "Try it" link, how it works in 5 lines, how to run locally (demo and live mode), a "How this relates to Paperproof and lean-tui" paragraph, an honest **Limitations** section, and credits.
**docs/ARCHITECTURE.md** includes one data-flow diagram (Lean -> trace.json -> pure reducer -> views).
**docs/DEMO.md** includes a 90-second demo script and a Q&A cheat sheet for judges.

---

## 11. Phases (run all of them, back to back)

**Phase 0: Ground truth**
- Check the environment (Node, pnpm, git, `elan`/Lean). If something is missing, raise one batched **ACTION NEEDED** with exact install commands for my OS and continue with whatever does not need it.
- Pick a stable Lean toolchain and pin it.
- Run Option A or B on a 3-line proof, **paste the real output** into `docs/lean-output-notes.md`, and decide the extraction approach.
- Write `PLAN.md` (stack, schema, stepping rules, decisions, risks) and create `PROGRESS.md` and `HUMAN_TASKS.md`.
- Create `identity.ts` with placeholders and raise the identity **ACTION NEEDED**. Continue immediately.

**Phase 1: Data pipeline.** Samples compile, the extractor emits traces, `pnpm traces` regenerates them, CI verifies them.

**Phase 2: Working player.** Split layout, editor, stepping, goal panel with diff, Why panel, shortcuts, theme and identity applied. Use a basic 2D tree as a placeholder if the 3D view is not ready. Commit and produce a first static build.

**Phase 3: 3D Tree view.** Everything in 5.1, including the 2D fallback.

**Phase 4: Remaining views and polish.** List Lab, Rewrite, Shrink, auto view selection, autoplay, scrubber, Q.E.D. moment, presentation mode, empty/error states, accessibility pass.

**Phase 5: Ship.** README, `docs/DEMO.md`, screenshots/GIF (script the capture and tell me exactly how to run it if it needs a real display), optional live mode (P2), deploy configuration for Vercel/Netlify/GitHub Pages (prepare everything; I do the login), tag `v1.0`, the backup-demo checklist, and the final **YOUR CHECKLIST**.

---

## 12. Things not to do

- Do not use Mathlib for the samples.
- Do not simulate or hard-code proof states.
- Do not build live mode before the replay player is excellent.
- Do not add a feature that cannot be demoed in under 10 seconds.
- Do not use default component-library looks, stock gradients, emoji, or filler copy.
- Do not commit secrets, `.lake` build caches, or `node_modules`.
- Do not expose the live backend publicly.
- Do not stop mid-phase, and do not wait for approval between phases.

---

## 13. Definition of Done (self-review before you finish)

- [ ] Clone, `pnpm i`, `pnpm dev`: the app opens on a sample, and **Next** advances exactly one line with a visible, correct update on the right half.
- [ ] All 5 samples compile with Lean and have committed, real traces.
- [ ] The three behaviours from the problem statement are demonstrably present: graph grows, list rearranges, goal shrinks to proved.
- [ ] Back and scrub work from any point without glitches.
- [ ] Works fully offline in demo mode; builds as a static site; lite 2D mode works without WebGL.
- [ ] Tests and CI green; no console errors on any sample.
- [ ] README and DEMO docs finished; every `TODO(me)` is resolved or listed in `HUMAN_TASKS.md`.
- [ ] `PROGRESS.md` and `HUMAN_TASKS.md` are up to date.
- [ ] Final message printed: a short summary of what was built, what was cut, how to run it, and **YOUR CHECKLIST** (all remaining human tasks with exact commands).

**Begin now with Phase 0, and keep going until the Definition of Done is met.**
