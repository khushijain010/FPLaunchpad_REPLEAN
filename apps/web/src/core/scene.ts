// What the tree views draw at a frame: positioned nodes, edges, the proved constellation.
// Tree3D and Tree2D both render this, so lite mode shows the same thing, flatter.

import type { Film, Frame } from './frames';
import type { NodeStatus } from './graph';
import { shortLabel } from './layout';
import type { Hyp } from './types';

export type SceneNode = Readonly<{
  id: string;
  x: number;
  y: number;
  z: number;
  status: Exclude<NodeStatus, 'hidden'>;
  label: string;
  target: string;
  tag: string;
  hyps: readonly Hyp[];
  /** Born on this very frame: animate it in. */
  isNew: boolean;
  /** Closed on this very frame: play the contraction. */
  justClosed: boolean;
}>;

export type SceneEdge = Readonly<{
  id: string;
  from: SceneNode;
  to: SceneNode;
  label: string;
  /** Created by the step that just ran: send a pulse along it. */
  isNew: boolean;
}>;

export type ProvedStar = Readonly<{ id: string; label: string; slot: number; isNew: boolean }>;

export type Scene = Readonly<{
  nodes: readonly SceneNode[];
  edges: readonly SceneEdge[];
  proved: readonly ProvedStar[];
  active: SceneNode | undefined;
  /** Names of hypotheses on the active goal that are new / used by the last step. */
  addedHyps: ReadonlySet<string>;
  usedHyps: ReadonlySet<string>;
  bounds: Film['layout']['bounds'];
  remaining: number;
  done: boolean;
  /** At least one node exists beyond the ~300 we are willing to draw. */
  truncated: boolean;
}>;

export const MAX_NODES = 300;

export function buildScene(film: Film, frame: Frame): Scene {
  const { graph, layout } = film;
  const k = frame.index;
  const visibleIds = graph.order.filter((id) => frame.statuses.get(id) !== 'hidden');
  const drawn = visibleIds.slice(0, MAX_NODES);

  const nodes: SceneNode[] = drawn.map((id) => {
    const n = graph.nodes.get(id)!;
    const p = layout.positions.get(id) ?? { x: 0, y: 0, z: 0 };
    return {
      id,
      x: p.x,
      y: p.y,
      z: p.z,
      status: frame.statuses.get(id) as SceneNode['status'],
      label: shortLabel(n.goal.target),
      target: n.goal.target,
      tag: n.goal.tag,
      hyps: n.goal.hyps,
      isNew: k > 0 && n.bornFrame === k,
      justClosed: n.endFrame === k,
    };
  });
  const byId = new Map(nodes.map((n) => [n.id, n] as const));

  const edges: SceneEdge[] = nodes.flatMap((to) => {
    const g = graph.nodes.get(to.id)!;
    const from = g.parent ? byId.get(g.parent) : undefined;
    if (!from) return [];
    const step = g.bornStep === undefined ? undefined : film.trace.steps[g.bornStep];
    return [{ id: `${from.id}->${to.id}`, from, to, label: step ? shortLabel(step.text.replace(/^·\s*/, ''), 22) : '', isNew: to.isNew }];
  });

  const proved: ProvedStar[] = nodes
    .filter((n) => n.status === 'proved' && graph.nodes.get(n.id)!.children.length === 0)
    .map((n) => ({ n, end: graph.nodes.get(n.id)!.endFrame ?? 0 }))
    .sort((a, b) => a.end - b.end)
    .map(({ n }, slot) => ({ id: n.id, label: n.label, slot, isNew: n.justClosed }));

  const active = frame.activeGoalId ? byId.get(frame.activeGoalId) : undefined;
  const activeView = frame.diff?.goals.find((g) => g.goal.id === frame.activeGoalId);
  return {
    nodes,
    edges,
    proved,
    active,
    addedHyps: new Set(activeView?.hyps.filter((h) => h.kind === 'added' || h.kind === 'changed').map((h) => h.hyp.name) ?? []),
    usedHyps: new Set(frame.diff?.usedHyps.map((h) => h.name) ?? []),
    bounds: layout.bounds,
    remaining: frame.remaining,
    done: frame.done,
    truncated: visibleIds.length > drawn.length,
  };
}
