// The goal graph: every goal that ever exists in a trace, and which goal it came from.
// Goals are nodes, tactics are edges. Built once per trace by folding over the steps.

import { diffStates } from './diff';
import type { Goal, Step } from './types';

export type GraphNode = Readonly<{
  id: string;
  goal: Goal;
  parent: string | undefined;
  proof: number;
  depth: number;
  /** First frame (0..N) in which the goal is on screen. */
  bornFrame: number;
  /** The step whose tactic created this goal (the edge into it). */
  bornStep: number | undefined;
  /** Frame at which the goal stopped being open, if it ever did. */
  endFrame: number | undefined;
  /** The step that closed or replaced it. */
  endStep: number | undefined;
  children: readonly string[];
}>;

export type GoalGraph = Readonly<{
  nodes: ReadonlyMap<string, GraphNode>;
  /** Node ids in the order they were born. */
  order: readonly string[];
  roots: readonly string[];
}>;

type Acc = Readonly<{ nodes: ReadonlyMap<string, GraphNode>; order: readonly string[] }>;

const withNode = (acc: Acc, node: GraphNode): Acc =>
  acc.nodes.has(node.id)
    ? acc
    : { nodes: new Map(acc.nodes).set(node.id, node), order: [...acc.order, node.id] };

const update = (acc: Acc, id: string, f: (n: GraphNode) => GraphNode): Acc => {
  const n = acc.nodes.get(id);
  return n ? { ...acc, nodes: new Map(acc.nodes).set(id, f(n)) } : acc;
};

const foldStep = (acc: Acc, step: Step, i: number): Acc => {
  // Goals that appear without a parent: the theorem statement of each proof.
  const withRoots = step.before.goals.reduce(
    (a, goal) =>
      withNode(a, {
        id: goal.id,
        goal,
        parent: undefined,
        proof: step.proof,
        depth: 0,
        bornFrame: i,
        bornStep: undefined,
        endFrame: undefined,
        endStep: undefined,
        children: [],
      }),
    acc,
  );
  const d = diffStates(step.before, step.after);
  const parent = d.acted ? withRoots.nodes.get(d.acted.id) : undefined;
  const withChildren = d.opened.reduce(
    (a, goal) =>
      withNode(a, {
        id: goal.id,
        goal,
        parent: parent?.id,
        proof: step.proof,
        depth: (parent?.depth ?? -1) + 1,
        bornFrame: i + 1,
        bornStep: i,
        endFrame: undefined,
        endStep: undefined,
        children: [],
      }),
    withRoots,
  );
  const linked = parent
    ? update(withChildren, parent.id, (n) => ({
        ...n,
        children: [...n.children, ...d.opened.map((g) => g.id)],
      }))
    : withChildren;
  const gone = [...(d.acted ? [d.acted] : []), ...d.proved];
  return gone.reduce(
    (a, g) => update(a, g.id, (n) => (n.endFrame === undefined ? { ...n, endFrame: i + 1, endStep: i } : n)),
    linked,
  );
};

export function buildGoalGraph(steps: readonly Step[]): GoalGraph {
  const acc = steps.reduce<Acc>(foldStep, { nodes: new Map(), order: [] });
  return {
    nodes: acc.nodes,
    order: acc.order,
    roots: acc.order.filter((id) => acc.nodes.get(id)?.parent === undefined),
  };
}

export type NodeStatus = 'hidden' | 'open' | 'active' | 'worked' | 'proved' | 'error';

/** Status of every node at frame `k`. `active` is the goal Lean will work on next. */
export function nodeStatuses(
  graph: GoalGraph,
  steps: readonly Step[],
  k: number,
  activeId: string | undefined,
): ReadonlyMap<string, NodeStatus> {
  const statusOf = (n: GraphNode, done: ReadonlyMap<string, NodeStatus>): NodeStatus => {
    if (n.bornFrame > k) return 'hidden';
    if (n.endFrame === undefined || n.endFrame > k) return n.id === activeId ? 'active' : 'open';
    if (n.endStep !== undefined && steps[n.endStep]?.error) return 'error';
    if (n.children.length === 0) return 'proved';
    const kids = n.children.map((c) => done.get(c));
    if (kids.some((c) => c === 'error')) return 'error';
    return kids.every((c) => c === 'proved') ? 'proved' : 'worked';
  };
  // Children are always born after their parent, so walking birth order backwards
  // settles every child before the node that needs it.
  const settled = graph.order.reduceRight<ReadonlyMap<string, NodeStatus>>(
    (done, id) => new Map(done).set(id, statusOf(graph.nodes.get(id)!, done)),
    new Map(),
  );
  return new Map(graph.order.map((id) => [id, settled.get(id)!] as const));
}
