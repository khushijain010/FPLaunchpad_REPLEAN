// The goal tree as SVG. Same scene and layout as Tree3D, no WebGL needed.

import type { Scene, SceneNode } from '../core/scene';

const UNIT = 60; // px per layout unit
const NODE_W = 132;
const NODE_H = 34;

const px = (n: { x: number; y: number }) => ({ x: n.x * UNIT, y: -n.y * UNIT });

export function Tree2D({ scene }: { scene: Scene }) {
  const { minX, maxX, minY } = scene.bounds;
  const pad = 90;
  const shelfY = -minY * UNIT + 90;
  const width = (maxX - minX) * UNIT + NODE_W + pad * 2;
  const height = shelfY + 60;
  const viewBox = `${minX * UNIT - NODE_W / 2 - pad} ${-pad / 2} ${width} ${height + pad / 2}`;
  const shelfStart = minX * UNIT - NODE_W / 2;

  return (
    <div className="tree2d">
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Goal tree: ${scene.nodes.length} goals, ${scene.remaining} open`}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {scene.edges.map((e) => {
          const a = px(e.from);
          const b = px(e.to);
          const midY = (a.y + b.y) / 2;
          const d = `M${a.x},${a.y + NODE_H / 2} C${a.x},${midY} ${b.x},${midY} ${b.x},${b.y - NODE_H / 2}`;
          return (
            <g key={e.id} className={`t2-edge${e.isNew ? ' is-new' : ''}`}>
              <path d={d} />
              {e.isNew && <path d={d} className="t2-pulse" pathLength={1} />}
              <text x={(a.x + b.x) / 2 + 6} y={midY - 2} className="t2-edge-label">
                {e.label}
              </text>
            </g>
          );
        })}
        {scene.nodes.map((n) => (
          <Node key={n.id} n={n} />
        ))}
        <line x1={shelfStart} x2={shelfStart + width - pad} y1={shelfY - 22} y2={shelfY - 22} className="t2-shelf" />
        <text x={shelfStart} y={shelfY - 30} className="t2-shelf-label">
          proved
        </text>
        {scene.proved.map((p) => (
          <g key={p.id} className={`t2-star${p.isNew ? ' is-new' : ''}`} transform={`translate(${shelfStart + 10 + p.slot * 26}, ${shelfY})`}>
            <circle r={7} filter="url(#glow)">
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
        <rect x={-NODE_W / 2} y={-NODE_H / 2} width={NODE_W} height={NODE_H} rx={8} filter={n.status === 'active' ? 'url(#glow)' : undefined} />
        <text textAnchor="middle" dy="0.35em">
          {n.label}
        </text>
        {n.tag && (
          <text className="t2-tag" textAnchor="middle" y={-NODE_H / 2 - 6}>
            {n.tag}
          </text>
        )}
        <title>{`${n.tag ? `case ${n.tag}\n` : ''}${n.hyps.map((h) => `${h.name} : ${h.type}`).join('\n')}\n⊢ ${n.target}`}</title>
      </g>
    </g>
  );
}
