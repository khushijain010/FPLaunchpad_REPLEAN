// Raw tactic nodes -> one Step per source line. The rule is documented in docs/STEPPING.md.

import type { RawGoal, RawNode, RawOutput, RawPos } from './raw';
import type { Goal, Step, TraceMessage } from './types';
import { headTactic } from './tactics';

const comparePos = (a: RawPos, b: RawPos): number => a.line - b.line || a.col - b.col;

/**
 * Of several nodes starting on the same line, the step starts at the earliest one,
 * and among nodes starting at the same column, the outermost (longest) one.
 */
const firstOnLine = (a: RawNode, b: RawNode): number =>
  a.start.col - b.start.col || comparePos(b.stop, a.stop) || a.id - b.id;

const toGoal = (g: RawGoal): Goal => ({
  id: g.id,
  tag: g.tag,
  hyps: g.hyps.map((h) => ({ name: h.name, type: h.type, id: h.id })),
  target: g.target,
});

const ancestorsOf = (node: RawNode, byId: ReadonlyMap<number, RawNode>): readonly RawNode[] => {
  const out: RawNode[] = [];
  let p = node.parent;
  while (p !== null && p !== undefined) {
    const a = byId.get(p);
    if (!a) break;
    out.push(a);
    p = a.parent;
  }
  return out;
};

/**
 * Lean only shows a tactic the goals it is focused on. Inside `·` or `case`, the other
 * goals are parked. A goal that is open both before and after an enclosing tactic was
 * untouched by it, so it is still open here: add it back so the player always shows
 * every remaining goal.
 */
export function fullGoals(
  focused: readonly RawGoal[],
  ancestors: readonly RawNode[],
): readonly RawGoal[] {
  const seen = new Set(focused.map((g) => g.id));
  const parked: RawGoal[] = [];
  for (const a of ancestors) {
    const stillOpen = new Set(a.after.map((g) => g.id));
    for (const g of a.before) {
      if (stillOpen.has(g.id) && !seen.has(g.id)) {
        seen.add(g.id);
        parked.push(g);
      }
    }
  }
  return [...focused, ...parked];
}

export type BuiltSteps = Readonly<{ steps: readonly Step[]; messages: readonly TraceMessage[] }>;

export function buildSteps(raw: RawOutput, source: string): BuiltSteps {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const byId = new Map(raw.nodes.map((n) => [n.id, n] as const));
  const before = (n: RawNode) => fullGoals(n.before, ancestorsOf(n, byId)).map(toGoal);

  const cmds = [...new Set(raw.nodes.map((n) => n.cmd))].sort((a, b) => a - b);

  type Draft = { proof: number; line: number; first: RawNode; after: readonly Goal[] };
  const drafts: Draft[] = cmds.flatMap((cmd, proof) => {
    const nodes = raw.nodes.filter((n) => n.cmd === cmd);
    const firstByLine = nodes.reduce<ReadonlyMap<number, RawNode>>((m, n) => {
      const cur = m.get(n.start.line);
      return !cur || firstOnLine(n, cur) < 0 ? new Map(m).set(n.start.line, n) : m;
    }, new Map());
    const order = [...firstByLine.keys()].sort((a, b) => a - b);
    const roots = nodes.filter((n) => n.parent === null || n.parent === undefined || !byId.has(n.parent));
    const lastRoot = roots.reduce<RawNode | undefined>(
      (best, n) => (!best || comparePos(n.stop, best.stop) > 0 ? n : best),
      undefined,
    );
    const finalGoals = (lastRoot?.after ?? []).map(toGoal);
    return order.map((line, i): Draft => {
      const next = order[i + 1];
      const nextNode = next === undefined ? undefined : firstByLine.get(next);
      return {
        proof,
        line,
        first: firstByLine.get(line)!,
        after: nextNode ? before(nextNode) : finalGoals,
      };
    });
  });

  const messages: TraceMessage[] = raw.messages.map((m) => ({
    severity: m.severity,
    line: m.start.line,
    col: m.start.col,
    text: m.text,
  }));

  const steps = drafts.map((d, index): Step => {
    const lineText = lines[d.line - 1] ?? '';
    const text = lineText.trim();
    const nextLine = drafts[index + 1]?.proof === d.proof ? drafts[index + 1]!.line : Infinity;
    const lastLineOfProof = nextLine === Infinity ? Math.max(d.line, d.first.stop.line) : nextLine - 1;
    const error = messages.find(
      (m) => m.severity === 'error' && m.line >= d.line && m.line <= lastLineOfProof,
    );
    return {
      index,
      proof: d.proof,
      range: { line: d.line, colStart: d.first.start.col, colEnd: lineText.trimEnd().length },
      text,
      tactic: headTactic(text),
      before: { goals: before(d.first) },
      after: { goals: d.after },
      ...(error ? { error: { message: error.text } } : {}),
    };
  });

  return { steps, messages };
}
