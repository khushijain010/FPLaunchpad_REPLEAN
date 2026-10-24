# Lean output notes

Toolchain: `leanprover/lean4:v4.34.1`.

## Status

**No real output pasted yet.** Lean isn't installed on the dev machine (see `HUMAN_TASKS.md` #1).
Until it is, everything below is what the v4.34.1 *source* says, not what a run printed. This file
gets the real output as soon as `lake exe extract` runs.

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

_To be pasted here: `lake exe extract Samples/AndComm.lean` on v4.34.1, plus any surprises._
