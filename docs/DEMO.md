# Demo

> Check every "you'll see" line against the real traces once they're generated. The behaviour
> is what the code does with the expected Lean output; Lean has the final word.

## 90-second script

**0:00 – Open on And, swapped. Shrink view (press `4`).**
"This is a Lean proof. Lean checks it in a blink, which is great for Lean and useless for
learning. Replean slows it down to one line at a time."

**0:10 – Press `1` (Tree). Press `→` twice.**
"`intro h` takes `p ∧ q` off the goal and puts it in the context: there it is, flying in, in cyan.
`constructor` splits the goal in two. The graph grows."

**0:25 – `→` twice.**
"Each bullet closes one branch. Watch the beam: that's the hypothesis the line uses. Closed goals
contract, turn gold and drop into the constellation at the bottom."
"Zero goals left. Q.E.D. The camera pulls back so you see the whole proof as one shape."

**0:40 – Pick Reversing [1, 2, 3]. Press `→` repeatedly.**
"Same idea, different picture. The player switched to List Lab on its own because the goal has a
concrete list. Each `rw [rev]` moves the head of the list to the back. That's the list
rearranging."

**0:55 – Drag the scrubber back and forth.**
"Every frame is a pure function of the step index, computed up front. So scrubbing backwards
isn't an undo stack. It's an array lookup, and it can't get out of sync."

**1:05 – Pick the compiler sample, press `P` (autoplay).**
"The boss level: a tiny compiler from arithmetic to a stack machine, proved correct by
induction. Two induction hypotheses, one rewrite each."

**1:20 – Open the Why panel / About.**
"None of this is hand-drawn. A Lean program walks Lean's InfoTree and prints every goal. The
extractor itself is written in Lean. Thanks."

## Backup plan

- If the venue Wi-Fi dies: the site is static and works offline once loaded. Better: `pnpm build`
  then `pnpm preview` locally, or open the deployed link before the demo and keep the tab.
- If WebGL misbehaves on the demo machine: press `L` for the 2D tree. Same data, same layout.
- Keep a screen recording of the script above as a last resort (HUMAN_TASKS).

## Judge Q&A cheat sheet

**Are the proof states real?** Yes. Every string came from `ppExpr` inside Lean, via
`lean/Extractor.lean`. The traces are committed, and CI regenerates them and fails if they differ.

**Why not run Lean in the browser?** Lean's native build is far too big for WASM. Pre-generated
traces make the demo fast and keep it from depending on a server.

**What's functional about it?** The whole core is pure: `buildSteps`, `diffStates`,
`buildGoalGraph`, `layoutTree`, `chooseView`, `explainTactic`, `buildFrames`. Frame `k` is a value,
not the result of `k` mutations. The only mutable state is one small store (which trace, which
step) and animation progress. The extractor is a Lean 4 metaprogram.

**How does "one line" work when tactics nest?** The step starts at the first tactic on the line and
ends where the next line's first tactic starts. Goals parked by `·` are put back so you always see
every open goal. Details in `docs/STEPPING.md`.

**How is this different from Paperproof?** Paperproof is an editor tool for writing proofs, drawn
as 2D paper trees. This is a player for watching and presenting them: scrub, autoplay, three
coordinated views, plain-English explanations, nothing to install.

**What doesn't it do?** No live editing on the public site, `simp` is shown as before/after only,
and "used hypotheses" is a by-name heuristic.
