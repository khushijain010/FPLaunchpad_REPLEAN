// The right half: view tabs, the chosen view, and the remaining-goals counter.

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { Film, Frame } from '../core/frames';
import { buildScene } from '../core/scene';
import type { ViewId } from '../core/types';
import { VIEW_KEYS } from '../ui/shortcuts';
import { useStore } from '../ui/store';
import { hasWebGL } from '../ui/webgl';
import { LeanErrors } from './LeanErrors';
import { ListLab } from './ListLab';
import { RewriteLens } from './RewriteLens';
import { ShrinkRail } from './ShrinkRail';
import { Tree2D } from './Tree2D';

const Tree3D = lazy(() => import('./Tree3D'));

const LABELS: Readonly<Record<ViewId, string>> = {
  tree: 'Tree',
  list: 'List Lab',
  rewrite: 'Rewrite',
  shrink: 'Shrink',
};

export function VizPane({ film, frame }: { film: Film; frame: Frame }) {
  const manualView = useStore((s) => s.manualView);
  const setView = useStore((s) => s.setView);
  const lite = useStore((s) => s.lite);
  const toggleLite = useStore((s) => s.toggleLite);
  const presentation = useStore((s) => s.presentation);
  const togglePresentation = useStore((s) => s.togglePresentation);
  const view = manualView ?? frame.view;
  const webgl = useMemo(hasWebGL, []);
  const flat = lite || !webgl;
  const scene = useMemo(() => buildScene(film, frame), [film, frame]);
  const show3d = view === 'tree' && !flat;
  const [kept3d, setKept3d] = useState(false);
  useEffect(() => {
    if (show3d) setKept3d(true);
  }, [show3d]);

  return (
    <div className="viz-pane">
      <div className="viz-bar">
        <div className="tabs" role="tablist" aria-label="Visualization">
          {VIEW_KEYS.map((v, i) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              className={`tab${view === v ? ' is-on' : ''}`}
              onClick={() => setView(v)}
              title={`${LABELS[v]} (${i + 1})`}
            >
              {LABELS[v]}
              {v === 'tree' && <span className="tab-sub">{flat ? '2D' : '3D'}</span>}
              {!manualView && frame.view === v && <span className="auto-dot" title="Picked automatically for this step" />}
            </button>
          ))}
        </div>
        <div className="viz-tools">
          {manualView && (
            <button className="btn ghost small" onClick={() => setView(undefined)} title="Let the player pick the view per step">
              auto
            </button>
          )}
          <button className="btn ghost small" aria-pressed={flat} disabled={!webgl} onClick={toggleLite} title={webgl ? 'Lite mode: 2D tree (L)' : 'WebGL is not available here, so the tree is 2D'}>
            lite
          </button>
          <button className="btn icon ghost" aria-pressed={presentation} onClick={togglePresentation} aria-label="Presentation mode" title="Presentation mode (F)">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d={presentation ? 'M5 1v4H1M9 1v4h4M5 13V9H1M9 13V9h4' : 'M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9'} fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="viz-stage" role="tabpanel" aria-label={LABELS[view]}>
        {view === 'tree' && flat && <Tree2D scene={scene} />}
        {/* Once the 3D scene has been shown it stays mounted and is only hidden. Unmounting a
            Canvas full of drei <Html> overlays races React's own DOM cleanup. */}
        {webgl && (show3d || kept3d) && (
          <div className="viz-layer" hidden={!show3d}>
            <Suspense fallback={show3d ? <Tree2D scene={scene} /> : null}>
              <Tree3D scene={scene} />
            </Suspense>
          </div>
        )}
        {view === 'list' && <ListLab frame={frame} />}
        {view === 'rewrite' && <RewriteLens frame={frame} />}
        {view === 'shrink' && <ShrinkRail film={film} frame={frame} />}

        <div className={`remaining${frame.done ? ' is-done' : ''}`} aria-hidden>
          {frame.done ? (
            <span>Q.E.D.</span>
          ) : (
            <>
              <span className="remaining-n tnum">{frame.remaining}</span>
              <span className="remaining-l">{frame.remaining === 1 ? 'goal left' : 'goals left'}</span>
            </>
          )}
        </div>
        {/* Keyed by source so the expanded/collapsed choice resets for each new file. */}
        <LeanErrors key={film.trace.source} trace={film.trace} frame={frame} />
        {scene.truncated && <p className="viz-note">Showing the first 300 goals. The rest are still in the goal panel.</p>}
      </div>
    </div>
  );
}
