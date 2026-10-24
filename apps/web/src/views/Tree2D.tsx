// The goal tree as SVG: the same scene and layout as Tree3D, no WebGL needed.
// Every node is as big as its full goal (the layout wraps and sizes it), and a node's case tag
// sits inside it so it can't collide with edge labels.

import type { Scene, SceneNode } from '../core/scene';
import { BOX, PX } from '../core/layout';

/** Layout units to SVG pixels: label text is drawn at its CSS size. */
const px = (v: number) => v / PX;

export function Tree2D({ scene }: { scene: Scene }) {
  const { minX, maxX, minY, maxY } = scene.bounds;
  const pad = 40;
  const left = px(minX) - pad;
  const top = -px(maxY) - pad;
  const width = px(maxX - minX) + pad * 2;
  const shelfY = -px(minY) + 56;
  const height = shelfY + 36 + pad - top;
  const shelfX = px(minX);

  return (
    <div className="tree2d">
      <svg viewBox={`${left} ${top} ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Goal tree: ${scene.nodes.length} goals, ${scene.remaining} open`}>
        {scene.edges.map((e) => {
          const ax = px(e.from.x);
          const bx = px(e.to.x);
          const y1 = -px(e.from.y - e.from.h / 2);
          const y2 = -px(e.to.y + e.to.h / 2);
          const midY = (y1 + y2) / 2;
          const d = `M${ax},${y1} C${ax},${midY} ${bx},${midY} ${bx},${y2}`;
          return (
            <g key={e.id} className={`t2-edge${e.isNew ? ' is-new' : ''}`}>
              <path d={d} />
              {e.isNew && <path d={d} className="t2-pulse" pathLength={1} />}
              {e.lines.length > 0 && (
                // Labels sit just under the parent, where branches haven't spread yet.
                <text x={ax + BOX.edgeDx} y={y1 + BOX.edgeDy + BOX.edgeFont} className="t2-edge-label">
                  {e.lines.map((l, i) => (
                    <tspan key={i} x={ax + BOX.edgeDx} dy={i === 0 ? 0 : BOX.edgeLineH}>
                      {l}
                    </tspan>
                  ))}
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
  const w = px(n.w);
  const h = px(n.h);
  const tagH = n.tag ? BOX.tagH : 0;
  // Baseline of the first goal line: below the padding and the tag, centred in its line box.
  const first = -h / 2 + BOX.padY + tagH + BOX.lineH / 2;
  return (
    <g className={`t2-node s-${n.status}${n.isNew ? ' is-new' : ''}${n.justClosed ? ' just-closed' : ''}`} transform={`translate(${px(n.x)}, ${-px(n.y)})`}>
      <g className="t2-node-inner">
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={9} />
        {n.tag && (
          <text className="t2-tag" x={-w / 2 + BOX.padX} y={-h / 2 + BOX.padY + BOX.tagFont}>
            {n.tag}
          </text>
        )}
        <text className="t2-label" textAnchor="middle" y={first}>
          {n.lines.map((l, i) => (
            <tspan key={i} x={0} dy={i === 0 ? '0.35em' : BOX.lineH}>
              {l}
            </tspan>
          ))}
        </text>
        <title>{`${n.tag ? `case ${n.tag}\n` : ''}${n.hyps.map((h) => `${h.name} : ${h.type}`).join('\n')}\n⊢ ${n.target}`}</title>
      </g>
    </g>
  );
}
