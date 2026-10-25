// The visualization panel: view tabs, 2D/3D, full screen, the chosen view, the goals counter.

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { Film, Frame } from '../core/frames';
import { buildScene } from '../core/scene';
import type { ViewId } from '../core/types';
import { VIEW_KEYS } from '../ui/shortcuts';
import { useStore } from '../ui/store';
import { ExpandIcon } from '../ui/icons';
import { hasWebGL } from '../ui/webgl';
import { LeanErrors } from './LeanErrors';
import { ListLab } from './ListLab';
import { RewriteLens } from './RewriteLens';
import { ShrinkRail } from './ShrinkRail';
import { StageRail } from './StageRail';
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
  const setLite = useStore((s) => s.setLite);
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
    <section className="panel viz-panel" aria-label="Visualization">
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
              {!manualView && frame.view === v && <span className="auto-dot" title="Picked automatically for this step. Click a tab to choose yourself." />}
            </button>
          ))}
        </div>
        <div className="viz-tools">
          {manualView && (
            <button className="link-btn auto-link" onClick={() => setView(undefined)} title="Let the player pick the best view for each step">
              auto view
            </button>
          )}
          {view === 'tree' && (
            <div className="segmented" role="group" aria-label="Tree dimensions" title={webgl ? 'Show the tree in 2D or 3D (D)' : 'WebGL is not available here, so the tree is 2D'}>
              <button aria-pressed={flat} onClick={() => setLite(true)}>
                2D
              </button>
              <button aria-pressed={!flat} disabled={!webgl} onClick={() => setLite(false)}>
                3D
              </button>
            </div>
          )}
          <button className="icon-btn" aria-pressed={presentation} onClick={togglePresentation} aria-label="Full screen" title="Full screen (F)">
            <ExpandIcon on={presentation} />
          </button>
        </div>
      </div>

      <div className={`viz-body${presentation ? ' has-rail' : ''}`}>
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
      {presentation && <StageRail film={film} frame={frame} />}
      </div>
    </section>
  );
}
