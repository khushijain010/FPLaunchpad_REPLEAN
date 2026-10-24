# Lean output notes

Toolchain: `leanprover/lean4:v4.34.1`.

## Status

Verified on a real run (2026-10-24, Lean 4.34.1, Windows). The extractor compiled on the first
build; a few things only showed up when it ran (see "Surprises").

## What the v4.34.1 source says (checked, not run)

These signatures were read from `github.com/leanprover/lean4/tree/v4.34.1/src/Lean` and the
extractor is written against them:

- `Lean.Elab.TacticInfo` has `mctxBefore`, `goalsBefore : List MVarId`, `mctxAfter`,
  `goalsAfter : List MVarId` (`Elab/InfoTree/Types.lean`). So before *and* after are both
  available per node; no guessing which one a `goals` field means.
- `InfoTree` = `context (PartialContextInfo) | node (Info) (PersistentArray InfoTree) | hole`.
  Context is threaded with `PartialContextInfo.mergeIntoOuter?` and `Info.updateContext?`
  (`Server/InfoUtils.lean`, `InfoTree.visitM`).
- `ContextInfo.runMetaM (info) (lctx) (x : MetaM α) : IO α` runs with `info.mctx`, so goals are
  printed with `{ ctx with mctx := ti.mctxBefore }` / `mctxAfter`.
- `Parser.parseHeader : InputContext → IO (TSyntax ``Module.header × ModuleParserState × MessageLog)`;
  `Elab.processHeader (header : HeaderSyntax) (opts) (messages) (inputCtx) ...`;
  `HeaderSyntax := TSyntax ``Parser.Module.header`.
- `Elab.IO.processCommands (inputCtx) (parserState) (commandState) : IO Frontend.State`; info trees
  come back in `commandState.infoState.trees`, one per top-level command.
- `Elab.async` defaults to `false`. The extractor sets it to `false` explicitly anyway.
- `MessageLog.toList` returns only *unreported* messages; the extractor uses
  `reportedPlusUnreported`.
- `Parser.mkInputContext` normalises line endings by default, so positions refer to LF text; the
  repo forces LF via `.gitattributes` and the TS side normalises too.

## Extraction approach

Option A, a Lean metaprogram (`lean/Extractor.lean`). Option B (the REPL) is the fallback if
Option A can't be made to compile in reasonable time.

## Real output

`lake exe extract Samples/AndComm.lean`, summarised one node per line
(`id parent kind range goalsBefore -> goalsAfter`, goal ids are the `_uniq.N` MVarIds):

```
 0 p=null Term.byTactic                    3:49-7:13  [11] -> []
 1 p=0    by                               3:49-3:51  [11] -> []
 2 p=1    Tactic.tacticSeq                 4:2-7:13   [11] -> []
 3 p=2    Tactic.tacticSeq1Indented        4:2-7:13   [11] -> []
 4 p=3    Tactic.intro                     4:2-4:9    [11] -> [13]
 5 p=4    null                             4:2-4:9    [11] -> [13]
 6 p=3    Tactic.constructor               5:2-5:13   [13] -> [21(left),22(right)]
 7 p=3    Lean.cdot                        6:2-6:13   [21(left),22(right)] -> [22(right)]
 8 p=7    Lean.cdotTk                      6:2-6:3    [21(left),22(right)] -> [21(left)]
 9 p=7    Tactic.tacticSeq                 6:4-6:13   [21(left)] -> []
10 p=9    Tactic.tacticSeq1Indented        6:4-6:13   [21(left)] -> []
11 p=10   Tactic.exact                     6:4-6:13   [21(left)] -> []
12 p=3    Lean.cdot                        7:2-7:13   [22(right)] -> []
13 p=12   Lean.cdotTk                      7:2-7:3    [22(right)] -> [22(right)]
14 p=12   Tactic.tacticSeq                 7:4-7:13   [22(right)] -> []
15 p=14   Tactic.tacticSeq1Indented        7:4-7:13   [22(right)] -> []
16 p=15   Tactic.exact                     7:4-7:13   [22(right)] -> []
```

First node, verbatim (truncated):

```json
{"after":[],"before":[{"hyps":[{"id":"_uniq.9","name":"p","type":"Prop"},{"id":"_uniq.10","name":"q","type":"Prop"}],"id":"_uniq.11","tag":"","target":"p ∧ q → q ∧ p"}],"cmd":1,"id":0,"kind":"Lean.Parser.Term.byTactic","parent":null,"start":{"col":49,"line":3},"stop":{"col":13,"line":7}}
```

To see the raw output for every sample: `pnpm traces --raw` writes `apps/web/public/traces/*.raw.json` (git-ignored).

## Surprises

1. **First run printed `expected token` at the first `∧`.** Imported environment extensions
   (where notation lives) didn't load. Fix: `unsafe enableInitializersExecution` before importing,
   as the Lean REPL does.
2. **The `by` keyword is itself recorded as tactic nodes** (`Lean.Parser.Term.byTactic` and `by`),
   positioned on the `theorem` line. They never change a goal, so `buildSteps` skips them as step
   starts (they still serve as roots for the final state).
3. **The bullet is three nodes:** `Lean.cdot` (whole line, sees all goals, parks the rest),
   `Lean.cdotTk` (the `·` itself, narrows to the first goal), then the inner `tacticSeq`. The cdot's
   before/after confirm the parked-goal rule: `[21(left), 22(right)] -> [22(right)]`.
4. **Hygienic names print with a dagger** (`n✝`, `a✝¹`) until a `case` renames them, exactly
   as in the infoview.
