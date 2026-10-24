// Raw tactic nodes -> one Step per source line. The rule is documented in docs/STEPPING.md.

import type { RawGoal, RawNode, RawOutput, RawPos } from './raw';
import type { Goal, Step, TraceMessage } from './types';
import { headTactic } from './tactics';

/**
 * Lean records the `by` keyword itself as tactic nodes, positioned on the `theorem` line.
 * They never change a goal, so they never start a step (they still count as ancestors/roots).
 */
const NOT_A_STEP = new Set(['Lean.Parser.Term.byTactic', 'by']);

const comparePos =(a: RawPos, b: RawPos): number => a.line - b.line || a.col - b.col;

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
  waiting: readonly RawGoal[] = [],
): readonly RawGoal[] {
  const seen = new Set(focused.map((g) => g.id));
  const parked: RawGoal[] = [];
  for (const g of waiting) {
    if (!seen.has(g.id)) {
      seen.add(g.id);
      parked.push(g);
    }
  }
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

/**
 * `cases h with | inl … | inr …` (and `induction … with`, `match`) makes every alternative's
 * goal up front, but Lean records each one only on its own alternative, never in any tactic's
 * "after". While the first alternative runs, the later ones are waiting: they are the goals of
 * later siblings, along the path up from `node`, that no tactic produced.
 */
export function waitingGoals(
  node: RawNode,
  byId: ReadonlyMap<number, RawNode>,
  childrenOf: ReadonlyMap<number, readonly RawNode[]>,
  produced: ReadonlySet<string>,
): readonly RawGoal[] {
  const out: RawGoal[] = [];
  let cur = node;
  for (const a of ancestorsOf(node, byId)) {
    for (const s of childrenOf.get(a.id) ?? []) {
      if (comparePos(s.start, cur.stop) < 0) continue;
      out.push(...s.before.filter((g) => !produced.has(g.id)));
    }
    cur = a;
  }
  return out;
}

/**
 * Where each goal came from: the goal a tactic was working on when it appeared. `all_goals t`
 * and `t₁ <;> t₂` record one node per goal they run on, so the narrowest node that produced a
 * goal (fewest goals before it, then the innermost) names its real parent.
 */
export function goalOrigins(nodes: readonly RawNode[]): ReadonlyMap<string, string> {
  const best = new Map<string, RawNode>();
  for (const n of nodes) {
    if (n.before.length === 0) continue;
    const had = new Set(n.before.map((g) => g.id));
    for (const g of n.after) {
      if (had.has(g.id)) continue;
      const cur = best.get(g.id);
      if (!cur || n.before.length < cur.before.length || (n.before.length === cur.before.length && n.id > cur.id)) best.set(g.id, n);
    }
  }
  return new Map([...best].map(([id, n]) => [id, n.before[0]!.id] as const));
}

/** For each goal a step opened, the goal from its before-state it descends from. */
const parentsWithin = (origins: ReadonlyMap<string, string>, before: readonly Goal[], after: readonly Goal[]): Record<string, string> => {
  const had = new Set(before.map((g) => g.id));
  const rootOf = (id: string): string | undefined => {
    const seen = new Set<string>();
    let cur = origins.get(id);
    while (cur !== undefined && !had.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      cur = origins.get(cur);
    }
    return cur !== undefined && had.has(cur) ? cur : undefined;
  };
  return Object.fromEntries(after.filter((g) => !had.has(g.id)).flatMap((g) => {
    const p = rootOf(g.id);
    return p === undefined ? [] : [[g.id, p] as const];
  }));
};

export type BuiltSteps = Readonly<{ steps: readonly Step[]; messages: readonly TraceMessage[] }>;

export function buildSteps(raw: RawOutput, source: string): BuiltSteps {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const byId = new Map(raw.nodes.map((n) => [n.id, n] as const));
  const childrenOf = raw.nodes.reduce((m, n) => {
    if (n.parent !== null && n.parent !== undefined) m.set(n.parent, [...(m.get(n.parent) ?? []), n]);
    return m;
  }, new Map<number, RawNode[]>());
  const produced = new Set(raw.nodes.flatMap((n) => n.after.map((g) => g.id)));
  const origins = goalOrigins(raw.nodes);
  const before = (n: RawNode) => fullGoals(n.before, ancestorsOf(n, byId), waitingGoals(n, byId, childrenOf, produced)).map(toGoal);

  const cmds = [...new Set(raw.nodes.map((n) => n.cmd))].sort((a, b) => a - b);

  type Draft = { proof: number; line: number; first: RawNode; after: readonly Goal[] };
  const drafts: Draft[] = cmds.flatMap((cmd, proof) => {
    const nodes = raw.nodes.filter((n) => n.cmd === cmd);
    const firstByLine = nodes.filter((n) => !NOT_A_STEP.has(n.kind)).reduce<ReadonlyMap<number, RawNode>>((m, n) => {
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

  // Lean can report the same message in both its reported and unreported logs.
  const messages: TraceMessage[] = raw.messages
    .map((m): TraceMessage => ({ severity: m.severity, line: m.start.line, col: m.start.col, text: m.text }))
    .filter((m, i, all) => all.findIndex((o) => o.line === m.line && o.col === m.col && o.text === m.text && o.severity === m.severity) === i);

  const steps = drafts.map((d, index): Step => {
    const lineText = lines[d.line - 1] ?? '';
    const text = lineText.trim();
    const nextLine = drafts[index + 1]?.proof === d.proof ? drafts[index + 1]!.line : Infinity;
    const lastLineOfProof = nextLine === Infinity ? Math.max(d.line, d.first.stop.line) : nextLine - 1;
    const error = messages.find(
      (m) => m.severity === 'error' && m.line >= d.line && m.line <= lastLineOfProof,
    );
    const goalsBefore = before(d.first);
    const parents = parentsWithin(origins, goalsBefore, d.after);
    return {
      index,
      proof: d.proof,
      range: { line: d.line, colStart: d.first.start.col, colEnd: lineText.trimEnd().length },
      text,
      tactic: headTactic(text),
      before: { goals: goalsBefore },
      after: { goals: d.after },
      ...(Object.keys(parents).length ? { parents } : {}),
      ...(error ? { error: { message: error.text } } : {}),
    };
  });

  return { steps, messages };
}
