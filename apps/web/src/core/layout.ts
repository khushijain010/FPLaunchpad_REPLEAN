// Deterministic tree layout for the goal graph. Computed once per trace over the *whole*
// graph, so a node already knows where it will sit before it is born: nothing jumps.

import { hierarchy, tree } from 'd3-hierarchy';
import type { GoalGraph } from './graph';

export type NodePos = Readonly<{ id: string; x: number; y: number; z: number; depth: number }>;
export type Layout = Readonly<{
  positions: ReadonlyMap<string, NodePos>;
  bounds: Readonly<{ minX: number; maxX: number; minY: number; maxY: number }>;
}>;

type HNode = Readonly<{ id: string; children: readonly HNode[] }>;

export const LAYOUT = { dx: 2.8, dy: 2.0, dz: 0.35 } as const;

export function layoutTree(graph: GoalGraph): Layout {
  const build = (id: string): HNode => ({
    id,
    children: (graph.nodes.get(id)?.children ?? []).map(build),
  });
  // A synthetic root joins several proofs into one forest, laid out side by side.
  const root = hierarchy<HNode>({ id: '', children: graph.roots.map(build) }, (n) => [...n.children]);
  const laid = tree<HNode>().nodeSize([LAYOUT.dx, LAYOUT.dy]).separation((a, b) => (a.parent === b.parent ? 1 : 1.3))(root);
  const nodes = laid.descendants().filter((n) => n.depth > 0);
  const positions = new Map(
    nodes.map((n) => {
      const depth = n.depth - 1;
      return [n.data.id, { id: n.data.id, x: n.x, y: -depth * LAYOUT.dy, z: -depth * LAYOUT.dz, depth }] as const;
    }),
  );
  const xs = nodes.map((n) => n.x);
  const ys = [...positions.values()].map((p) => p.y);
  return {
    positions,
    bounds: {
      minX: Math.min(0, ...xs),
      maxX: Math.max(0, ...xs),
      minY: Math.min(0, ...ys),
      maxY: Math.max(0, ...ys),
    },
  };
}

/** A goal's target cut to fit a node label. */
export function shortLabel(target: string, max = 28): string {
  const flat = target.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}
