// SYNTHETIC TEST INPUT. Not a real Lean trace and never shown in the app.
// It mirrors the shape `lake exe extract` prints for lean/Samples/AndComm.lean so the pure
// functions can be tested without a Lean install. Real traces live in public/traces/.

import type { RawGoal, RawOutput } from './raw';

export const andCommSource = `namespace AndComm

theorem and_comm (p q : Prop) : p ∧ q → q ∧ p := by
  intro h
  constructor
  · exact h.2
  · exact h.1

end AndComm
`;

const p = { name: 'p', type: 'Prop', id: 'f.p' };
const q = { name: 'q', type: 'Prop', id: 'f.q' };
const h = { name: 'h', type: 'p ∧ q', id: 'f.h' };

const g0: RawGoal = { id: 'm.0', tag: '', hyps: [p, q], target: 'p ∧ q → q ∧ p' };
const g1: RawGoal = { id: 'm.1', tag: '', hyps: [p, q, h], target: 'q ∧ p' };
const g2: RawGoal = { id: 'm.2', tag: 'left', hyps: [p, q, h], target: 'q' };
const g3: RawGoal = { id: 'm.3', tag: 'right', hyps: [p, q, h], target: 'p' };

const pos = (line: number, col: number) => ({ line, col });

export const andCommRaw: RawOutput = {
  leanVersion: 'test',
  file: 'Samples/AndComm.lean',
  messages: [],
  nodes: [
    { id: 0, cmd: 1, parent: null, kind: 'Lean.Parser.Tactic.tacticSeq', start: pos(4, 2), stop: pos(7, 13), before: [g0], after: [] },
    { id: 1, cmd: 1, parent: 0, kind: 'Lean.Parser.Tactic.tacticSeq1Indented', start: pos(4, 2), stop: pos(7, 13), before: [g0], after: [] },
    { id: 2, cmd: 1, parent: 1, kind: 'Lean.Parser.Tactic.intro', start: pos(4, 2), stop: pos(4, 9), before: [g0], after: [g1] },
    { id: 3, cmd: 1, parent: 1, kind: 'Lean.Parser.Tactic.constructor', start: pos(5, 2), stop: pos(5, 13), before: [g1], after: [g2, g3] },
    { id: 4, cmd: 1, parent: 1, kind: 'Lean.cdot', start: pos(6, 2), stop: pos(6, 13), before: [g2, g3], after: [g3] },
    { id: 5, cmd: 1, parent: 4, kind: 'Lean.Parser.Tactic.exact', start: pos(6, 4), stop: pos(6, 13), before: [g2], after: [] },
    { id: 6, cmd: 1, parent: 1, kind: 'Lean.cdot', start: pos(7, 2), stop: pos(7, 13), before: [g3], after: [] },
    { id: 7, cmd: 1, parent: 6, kind: 'Lean.Parser.Tactic.exact', start: pos(7, 4), stop: pos(7, 13), before: [g3], after: [] },
  ],
};

export const goals = { g0, g1, g2, g3 };
