// The goal tree as SVG: the same scene and layout as Tree3D, no WebGL needed.
// Nodes are wide enough for their label (labels are cut to fit), siblings never touch, and a
// node's case tag sits inside it so it can't collide with edge labels.

import type { Scene, SceneNode } from '../core/scene';
import { LAYOUT } from '../core/layout';

const NODE_W = 196;
const NODE_H = 46;
/** Pixels per layout unit, horizontally and vertically. Siblings are LAYOUT.dx apart. */
const UX = (NODE_W + 22) / LAYOUT.dx;
const UY = 96;
/** Characters that fit in a node at 12.5px monospace. */
const FIT = 24;

const px = (n: { x: number; y: number }) => ({ x: n.x * UX, y: -n.y * (UY / LAYOUT.dy) });
const fit = (s: string, max = FIT) => (s.length <= max ? s : `${s.slice(0, max - 1)}…`);

export function Tree2D({ scene }: { scene: Scene }) {
  const { minX, maxX, minY } = scene.bounds;
  const pad = 40;
  const left = minX * UX - NODE_W / 2 - pad;
  const width = (maxX - minX) * UX + NODE_W + pad * 2;
  const bottom = -minY * (UY / LAYOUT.dy) + NODE_H / 2;
  const shelfY = bottom + 56;
  const height = shelfY + 36 + pad;
  const shelfX = minX * UX - NODE_W / 2;

  return (
    <div className="tree2d">
      <svg viewBox={`${left} ${-NODE_H / 2 - pad} ${width} ${height + NODE_H / 2}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Goal tree: ${scene.nodes.length} goals, ${scene.remaining} open`}>
        {scene.edges.map((e) => {
          const a = px(e.from);
          const b = px(e.to);
          const y1 = a.y + NODE_H / 2;
          const y2 = b.y - NODE_H / 2;
          const midY = (y1 + y2) / 2;
          const d = `M${a.x},${y1} C${a.x},${midY} ${b.x},${midY} ${b.x},${y2}`;
          return (
            <g key={e.id} className={`t2-edge${e.isNew ? ' is-new' : ''}`}>
              <path d={d} />
              {e.isNew && <path d={d} className="t2-pulse" pathLength={1} />}
              {e.label && (
                // Labels sit just under the parent, where branches haven't spread yet.
                <text x={a.x + 8} y={y1 + 14} className="t2-edge-label">
                  {fit(e.label, 22)}
                </text>
              )}
            </g>
          );
        })}
        {scene.nodes.map((n) => (
          <Node key={n.id} n={n} />
        ))}
        <line x1={shelfX} x2={shelfX + Math.max(width - pad * 2, 160)} y1={shelfY - 18} y2={shelfY - 18} className="t2-shelf" />
        <text x={shelfX} y={shelfY - 26} className="t2-shelf-label">
          proved
        </text>
        {scene.proved.map((p) => (
          <g key={p.id} className={`t2-star${p.isNew ? ' is-new' : ''}`} transform={`translate(${shelfX + 10 + p.slot * 24}, ${shelfY})`}>
            <circle r={7}>
              <title>{p.label}</title>
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Node({ n }: { n: SceneNode }) {
  const { x, y } = px(n);
  return (
    <g className={`t2-node s-${n.status}${n.isNew ? ' is-new' : ''}${n.justClosed ? ' just-closed' : ''}`} transform={`translate(${x}, ${y})`}>
      <g className="t2-node-inner">
        <rect x={-NODE_W / 2} y={-NODE_H / 2} width={NODE_W} height={NODE_H} rx={9} />
        {n.tag && (
          <text className="t2-tag" x={-NODE_W / 2 + 10} y={-NODE_H / 2 + 13}>
            {fit(n.tag, 20)}
          </text>
        )}
        <text className="t2-label" textAnchor="middle" y={n.tag ? 9 : 0} dy="0.35em">
          {fit(n.target.replace(/\s+/g, ' '))}
        </text>
        <title>{`${n.tag ? `case ${n.tag}\n` : ''}${n.hyps.map((h) => `${h.name} : ${h.type}`).join('\n')}\n⊢ ${n.target}`}</title>
      </g>
    </g>
  );
}
