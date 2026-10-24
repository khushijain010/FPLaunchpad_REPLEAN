// Deterministic tree layout for the goal graph. Computed once per trace over the *whole*
// graph, so a node already knows where it will sit before it is born: nothing jumps.
// Every node is sized to its full goal text (wrapped, never cut), and the tree is spaced by
// those sizes, so neighbours never overlap however long a goal gets.

import { hierarchy, tree } from 'd3-hierarchy';
import type { GoalGraph } from './graph';

export type NodePos = Readonly<{
  id: string;
  x: number;
  /** Centre of the node. */
  y: number;
  z: number;
  depth: number;
  w: number;
  h: number;
  /** The goal, wrapped to fit the node. */
  lines: readonly string[];
  /** The tactic on the edges out of this node, wrapped. Empty for a leaf. */
  edgeLines: readonly string[];
}>;
export type Layout = Readonly<{
  positions: ReadonlyMap<string, NodePos>;
  /** Extents of every node box, not just their centres. */
  bounds: Readonly<{ minX: number; maxX: number; minY: number; maxY: number }>;
}>;

type HNode = Readonly<{ id: string; children: readonly HNode[] }>;

/** One CSS pixel of label text, in layout units. Both trees draw labels at this scale. */
export const PX = 0.018;
/** Label metrics in CSS pixels (JetBrains Mono advances 0.6em). */
export const BOX = {
  font: 13,
  lineH: 17,
  tagFont: 10,
  tagH: 13,
  padX: 14,
  padY: 9,
  minW: 64,
  /** Longest goal line before it wraps. */
  cols: 36,
  edgeFont: 11,
  edgeLineH: 14,
  edgeCols: 30,
  /** Edge labels start this far right of the parent's centre and below its bottom. */
  edgeDx: 8,
  edgeDy: 4,
} as const;
export const LAYOUT = { dz: 0.35, gapX: 0.5, gapProofs: 1.1, gapY: 0.85 } as const;

const charW = (font: number) => font * 0.6 * PX;
const flat = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Wraps text at spaces into lines of at most `cols` characters, balancing the lines so a goal
 * one word too long doesn't leave a single word on its own. A word longer than a line is split.
 */
export function wrapText(text: string, cols: number): readonly string[] {
  const words = flat(text)
    .split(' ')
    .filter(Boolean)
    .flatMap((w) => Array.from({ length: Math.ceil([...w].length / cols) }, (_, i) => [...w].slice(i * cols, (i + 1) * cols).join('')));
  const greedy = (width: number) =>
    words.reduce<string[]>((lines, w) => {
      const last = lines[lines.length - 1];
      if (last !== undefined && [...last].length + 1 + [...w].length <= width) return [...lines.slice(0, -1), `${last} ${w}`];
      return [...lines, w];
    }, []);
  const loose = greedy(cols);
  if (loose.length <= 1) return loose;
  const even = greedy(Math.min(cols, Math.ceil([...words.join(' ')].length / loose.length) + 3));
  return even.length === loose.length ? even : loose;
}

const widest = (lines: readonly string[]) => Math.max(0, ...lines.map((l) => [...l].length));

/** Size of a node that shows `target` (and its case tag), in layout units. */
export function boxOf(target: string, tag: string): Readonly<{ w: number; h: number; lines: readonly string[] }> {
  const lines = wrapText(target, BOX.cols);
  const textW = Math.max(widest(lines) * charW(BOX.font), [...tag].length * charW(BOX.tagFont), BOX.minW * PX);
  return {
    w: textW + 2 * BOX.padX * PX,
    h: (lines.length * BOX.lineH + (tag ? BOX.tagH : 0) + 2 * BOX.padY) * PX,
    lines,
  };
}

/** How far right of a node's centre the label on its outgoing edges reaches. */
const edgeReach = (edgeLines: readonly string[]) => (edgeLines.length ? BOX.edgeDx * PX + widest(edgeLines) * charW(BOX.edgeFont) : 0);

/**
 * @param edgeText the tactic drawn on the edges out of a node ('' for none), so the layout can
 *   leave room for it.
 */
export function layoutTree(graph: GoalGraph, edgeText: (id: string) => string = () => ''): Layout {
  const sized = new Map(
    graph.order.map((id) => {
      const n = graph.nodes.get(id)!;
      const box = boxOf(n.goal.target, n.goal.tag);
      const edgeLines = n.children.length ? wrapText(edgeText(id), BOX.edgeCols) : [];
      return [id, { ...box, edgeLines }] as const;
    }),
  );
  // Half the room a node needs across. Its edge label hangs off to the right, and d3 doesn't
  // say which side a neighbour is on, so that reach is reserved on both sides.
  const half = (id: string) => {
    const s = sized.get(id);
    return s ? Math.max(s.w / 2, edgeReach(s.edgeLines)) : 0;
  };

  const build = (id: string): HNode => ({
    id,
    children: (graph.nodes.get(id)?.children ?? []).map(build),
  });
  // A synthetic root joins several proofs into one forest, laid out side by side.
  const root = hierarchy<HNode>({ id: '', children: graph.roots.map(build) }, (n) => [...n.children]);
  const laid = tree<HNode>()
    .nodeSize([1, 1])
    .separation((a, b) => half(a.data.id) + half(b.data.id) + (a.parent === b.parent ? LAYOUT.gapX : LAYOUT.gapProofs))(root);
  const nodes = laid.descendants().filter((n) => n.depth > 0);

  // Rows are as tall as their tallest node, and the gap under a row fits its edge labels.
  const depths = Math.max(0, ...nodes.map((n) => n.depth));
  const rowH = Array.from({ length: depths }, (_, d) => Math.max(0, ...nodes.filter((n) => n.depth === d + 1).map((n) => sized.get(n.data.id)!.h)));
  const labelLines = Array.from({ length: depths }, (_, d) =>
    Math.max(0, ...nodes.filter((n) => n.depth === d + 1).map((n) => sized.get(n.data.id)!.edgeLines.length)),
  );
  const rowTop = rowH.reduce<number[]>(
    (tops, h, d) => [...tops, tops[d]! - h - LAYOUT.gapY - (labelLines[d]! * BOX.edgeLineH + BOX.edgeDy) * PX],
    [0],
  );

  const positions = new Map(
    nodes.map((n) => {
      const depth = n.depth - 1;
      const s = sized.get(n.data.id)!;
      const pos: NodePos = { id: n.data.id, x: n.x, y: rowTop[depth]! - s.h / 2, z: -depth * LAYOUT.dz, depth, ...s };
      return [n.data.id, pos] as const;
    }),
  );
  const all = [...positions.values()];
  return {
    positions,
    bounds: {
      minX: Math.min(0, ...all.map((p) => p.x - p.w / 2)),
      maxX: Math.max(0, ...all.map((p) => p.x + p.w / 2)),
      minY: Math.min(0, ...all.map((p) => p.y - p.h / 2)),
      maxY: Math.max(0, ...all.map((p) => p.y + p.h / 2)),
    },
  };
}
