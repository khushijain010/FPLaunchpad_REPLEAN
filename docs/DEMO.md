# Demo

## 90-second script

**0:00 – Open on `and_comm.lean` (Files panel → Examples → Logic). Tree view, 3D.**
"This is a Lean proof. Lean checks it in a blink, which is great for Lean and useless for
learning. Replean slows it down to one line at a time."

**0:10 – Press `→` twice.**
"`intro h` takes `p ∧ q` off the goal and puts it in the context: there it is, in cyan.
`constructor` splits the goal in two. The graph grows. Goal State shows both goals; Explanation
says what the tactic did."

**0:25 – `→` twice.**
"Each bullet closes one branch. The beam is the hypothesis the line uses. Closed goals turn gold
and drop into the row at the bottom. Zero goals left: Q.E.D., and the camera pulls back to show
the whole proof."

**0:40 – Open `rev.lean` (Examples → Lists). Press `→` a few times.**
"Same idea, different picture. The player switched to List Lab by itself because the goal has a
concrete list. Each `rw [rev]` moves the head of the list to the back. That's the list
rearranging."

**0:55 – Drag the scrubber back and forth.**
"Every frame is a pure function of the step index, computed up front. Scrubbing backwards isn't
an undo stack. It's an array lookup, so it can't get out of sync."

**1:05 – My Proofs → New file → Run (`Ctrl+Enter`).**
"Your own proofs work too. This file goes to a Lean server, comes back as a trace, and plays the
same way. Break a line and Lean's own error shows up in the picture."

**1:20 – Press `T`, then `?`.**
"Light and dark themes; shortcuts and contact are in Help. None of the proof states are drawn by
hand: a Lean program walks Lean's InfoTree and prints every goal. The extractor itself is written
in Lean. Thanks."

## Backup plan

- If the venue Wi-Fi dies: the site is static and works offline once loaded. Better: `pnpm build`
  then `pnpm preview` locally, or open the deployed site before the demo and keep the tab.
- The Lean server on the free host sleeps when idle. Open the site a minute early; the page wakes
  the server as it loads. The examples never need it.
- If WebGL misbehaves on the demo machine: press `D` (or click **2D**) for the 2D tree. Same data,
  same layout.
- Keep a screen recording of the script above as a last resort.

## Judge Q&A cheat sheet

**Are the proof states real?** Yes. Every string came from `ppExpr` inside Lean, via
`lean/Extractor.lean`. The example traces are committed, and CI regenerates them and fails if they
differ. Your own files run through the same extractor on the server.

**Why not run Lean in the browser?** Lean's native build is far too big for WASM. Pre-generated
traces make the examples instant; your own files go to a small server.

**What's functional about it?** The core is pure: `buildSteps`, `diffStates`, `buildGoalGraph`,
`layoutTree`, `chooseView`, `explainTactic`, `buildFrames`. Frame `k` is a value, not the result of
`k` mutations. The only mutable state is a few small stores (what's open, which step, UI choices)
and animation progress. The extractor is a Lean 4 metaprogram.

**How does "one line" work when tactics nest?** The step starts at the first tactic on the line and
ends where the next line's first tactic starts. Goals parked by `·` are put back so you always see
every open goal. Details in `docs/STEPPING.md`.

**How do you get branching right?** Goals are tracked by Lean's own goal ids, never by their
text. Lean hides parked goals inside `·`, `case` and `cases`/`induction … with | alt =>`; we put
them back, so `induction` on a 3-constructor type opens 3 goals and each case closes on its own.
When one line works on several goals (`all_goals`, `<;>`), Lean records one run per goal, so each
new goal hangs under the goal it came from. Each of these cases has a real Lean proof in
`lean/Fixtures` with tests on its output, golden-checked in CI.

**How is this different from Paperproof?** Paperproof is an editor tool for writing proofs, drawn
as 2D paper trees. This is a player for watching and presenting them: scrub, autoplay, four
coordinated views, plain-English explanations, nothing to install.

**Does it support Mathlib?** No. Mathlib is several gigabytes and needs far more memory than the
free server has. Files that import it get a clear message with core replacements for their tactics.

**What doesn't it do?** `simp` is shown as before/after only, "used hypotheses" is a by-name
heuristic, and the public server refuses code-running commands such as `#eval`.
