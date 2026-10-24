import Lean

/-!
# Replean extractor

Elaborates one Lean file, walks its InfoTree, and prints every tactic node as JSON:
its source range, its parent tactic, and the goals before and after it, with each
hypothesis and target pretty-printed by Lean itself.

This file does no line grouping. Turning tactic nodes into "one step per source line"
is a pure function on the TypeScript side (`apps/web/src/core/buildSteps.ts`), where it
is unit-tested.

Usage: `lake exe extract Samples/AndComm.lean > out.json`
-/

open Lean Elab Meta

namespace Extractor

structure HypJ where
  name : String
  type : String
  id   : String
  deriving ToJson

structure GoalJ where
  id     : String
  tag    : String
  hyps   : Array HypJ
  target : String
  deriving ToJson

structure PosJ where
  line : Nat
  col  : Nat
  deriving ToJson

structure NodeJ where
  id     : Nat
  /-- Index of the top-level command (info tree) this node came from. -/
  cmd    : Nat
  parent : Option Nat
  kind   : String
  start  : PosJ
  stop   : PosJ
  before : Array GoalJ
  after  : Array GoalJ
  deriving ToJson

structure MessageJ where
  severity : String
  start    : PosJ
  stop     : Option PosJ
  text     : String
  deriving ToJson

structure OutputJ where
  leanVersion : String
  file        : String
  nodes       : Array NodeJ
  messages    : Array MessageJ
  deriving ToJson

/-- Inaccessible names (from hygiene) print with a dagger, the way the infoview shows them. -/
def showName (n : Name) : String :=
  if n.isAnonymous then ""
  else
    let base := n.eraseMacroScopes.toString (escape := false)
    if n.hasMacroScopes then base ++ "✝" else base

def toPos (fileMap : FileMap) (p : String.Pos.Raw) : PosJ :=
  let pos := fileMap.toPosition p
  { line := pos.line, col := pos.column }

def goalJ (g : MVarId) : MetaM GoalJ := g.withContext do
  let decl ← g.getDecl
  let mut hyps : Array HypJ := #[]
  for ldecl in (← getLCtx) do
    if ldecl.isImplementationDetail then continue
    let type ← ppExpr (← instantiateMVars ldecl.type)
    hyps := hyps.push
      { name := showName ldecl.userName, type := toString type, id := toString ldecl.fvarId.name }
  let target ← ppExpr (← instantiateMVars decl.type)
  return { id := toString g.name, tag := showName decl.userName, hyps, target := toString target }

/-- Pretty-print a goal list in the metavariable context it belongs to. -/
def goalsJ (ctx : ContextInfo) (mctx : MetavarContext) (goals : List MVarId) : IO (Array GoalJ) := do
  let ctx := { ctx with mctx }
  try
    ctx.runMetaM {} do
      let mut out : Array GoalJ := #[]
      for g in goals do
        try out := out.push (← goalJ g) catch _ => pure ()
      return out
  catch _ => return #[]

/--
Walks the tree, threading the `ContextInfo` the same way `InfoTree.visitM` does, and records
every tactic node that has an original (non-synthetic) source position. `parent` is the nearest
enclosing recorded tactic node.
-/
partial def walk (fileMap : FileMap) (cmd : Nat) (ctx? : Option ContextInfo) (parent : Option Nat) :
    InfoTree → StateT (Array NodeJ) IO Unit
  | .context pci t => walk fileMap cmd (pci.mergeIntoOuter? ctx?) parent t
  | .hole _ => pure ()
  | .node info children => do
    let some ctx := ctx? | return
    let mut myParent := parent
    if let .ofTacticInfo ti := info then
      if let some s := ti.stx.getPos? (canonicalOnly := true) then
        if let some e := ti.stx.getTailPos? (canonicalOnly := true) then
          let before ← goalsJ ctx ti.mctxBefore ti.goalsBefore
          let after ← goalsJ ctx ti.mctxAfter ti.goalsAfter
          let id := (← get).size
          modify (·.push
            { id, cmd, parent, kind := toString ti.stx.getKind
              start := toPos fileMap s, stop := toPos fileMap e, before, after })
          myParent := some id
    let childCtx? := info.updateContext? ctx?
    for c in children do
      walk fileMap cmd childCtx? myParent c

def severityName : MessageSeverity → String
  | .error => "error"
  | .warning => "warning"
  | .information => "info"

def run (path : System.FilePath) : IO OutputJ := do
  let input ← IO.FS.readFile path
  let inputCtx := Parser.mkInputContext input path.toString
  let (header, parserState, messages) ← Parser.parseHeader inputCtx
  -- Synchronous elaboration keeps every proof's info tree in the command snapshot.
  let opts := Elab.async.set {} false
  let (env, messages) ← processHeader header opts messages inputCtx
  let s ← IO.processCommands inputCtx parserState (Command.mkState env messages opts)
  let fileMap := inputCtx.fileMap
  let collect : StateT (Array NodeJ) IO Unit := do
    let mut cmd := 0
    for t in s.commandState.infoState.trees do
      walk fileMap cmd none none t
      cmd := cmd + 1
  let ((), nodes) ← collect.run #[]
  let mut msgs : Array MessageJ := #[]
  for m in s.commandState.messages.reportedPlusUnreported.toList do
    msgs := msgs.push
      { severity := severityName m.severity
        start := { line := m.pos.line, col := m.pos.column }
        stop := m.endPos.map fun p => { line := p.line, col := p.column }
        text := (← m.data.toString) }
  return { leanVersion := Lean.versionString, file := path.toString, nodes, messages := msgs }

end Extractor

def main (args : List String) : IO UInt32 := do
  match args with
  | [path] =>
    -- Without this, imported environment extensions (notation like `∧` among them) don't load.
    unsafe enableInitializersExecution
    initSearchPath (← findSysroot)
    let out ← Extractor.run path
    IO.println (toJson out).compress
    return 0
  | _ =>
    IO.eprintln "usage: extract <file.lean>"
    return 1
