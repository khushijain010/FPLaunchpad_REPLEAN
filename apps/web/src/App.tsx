import { useMemo } from 'react';
import { filmOf } from './core/frames';
import { Dialogs } from './ui/Dialogs';
import { EditorArea } from './ui/EditorArea';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { useFiles } from './ui/files';
import { Header } from './ui/Header';
import { HOSTED, runFile, useLive } from './ui/live';
import { useAutoplay, useBoot, useHashSync } from './ui/loader';
import { useNav } from './ui/nav';
import { useShortcuts } from './ui/shortcuts';
import { Sidebar } from './ui/Sidebar';
import { Split } from './ui/Split';
import { FILE_PREFIX, useStore } from './ui/store';
import { StatusCard } from './ui/StatusCard';
import { GoalPanels, InfoPanels } from './views/Panels';
import { VizPane } from './views/VizPane';

/** Shown in the visualization column when the open file hasn't been run yet. */
function NotRunYet() {
  const active = useNav((s) => s.active);
  const running = useLive((s) => s.running);
  const availability = useLive((s) => s.availability);
  const file = useFiles((s) => (active?.kind === 'file' ? s.files.find((f) => f.id === active.id) : undefined));
  return (
    <section className="panel viz-panel viz-empty" aria-label="Visualization">
      <div className="viz-empty-body">
        <h2>{running ? 'Running Lean…' : 'Nothing to show yet'}</h2>
        <p className="muted">
          {availability === 'no'
            ? HOSTED
              ? 'The Lean server is unavailable right now. Your file is saved; run it later.'
              : 'No local Lean server found. Start it with pnpm live from the repo root.'
            : 'Run this file and its proof appears here, one line at a time.'}
        </p>
        {file && (
          <button className="btn primary" onClick={() => void runFile(file.id)} disabled={running || availability === 'no'}>
            {running ? 'Running…' : `Run ${file.name}`}
          </button>
        )}
      </div>
    </section>
  );
}

function Workspace() {
  const trace = useStore((s) => s.trace);
  const sampleId = useStore((s) => s.sampleId);
  const step = useStore((s) => s.step);
  const goto = useStore((s) => s.goto);
  const stopPlay = useStore((s) => s.stopPlay);
  const presentation = useStore((s) => s.presentation);
  const explorerOpen = useStore((s) => s.explorerOpen);
  const toggleExplorer = useStore((s) => s.toggleExplorer);
  const active = useNav((s) => s.active);

  // Only play a trace that belongs to the open tab.
  const tabId = active ? (active.kind === 'example' ? active.id : FILE_PREFIX + active.id) : sampleId;
  const shown = trace && sampleId === tabId ? trace : undefined;
  const film = useMemo(() => (shown ? filmOf(shown) : undefined), [shown]);
  const frame = film?.frames[Math.min(step, film.frames.length - 1)];
  const errorSteps = useMemo(() => new Set(shown?.steps.filter((s) => s.error).map((s) => s.index) ?? []), [shown]);

  const jumpToLine = (line: number) => {
    const i = shown?.steps.findIndex((s) => s.range.line === line) ?? -1;
    if (i >= 0) {
      stopPlay();
      goto(i + 1);
    }
  };

  const viz =
    film && frame ? (
      <ErrorBoundary fallback={(msg) => <StatusCard kind="error" title="Visualization error" message={`${msg}. The editor and goal panels still work; try the 2D view (D).`} />}>
        <VizPane film={film} frame={frame} />
      </ErrorBoundary>
    ) : (
      <NotRunYet />
    );

  return (
    <div className={`app${presentation ? ' is-presenting' : ''}${explorerOpen && !presentation ? ' has-sidebar' : ''}`}>
      <Header frame={frame} errorSteps={errorSteps} />
      <div className="workspace">
        {explorerOpen && !presentation && (
          <>
            <Sidebar />
            {/* On narrow screens the sidebar floats over the page; tapping outside closes it. */}
            <button className="sidebar-scrim" onClick={toggleExplorer} aria-label="Close the files panel" tabIndex={-1} />
          </>
        )}
        <Split
          hideLeft={presentation}
          left={
            <div className="column">
              <EditorArea trace={shown} frame={frame} onLine={jumpToLine} />
              <GoalPanels frame={frame} />
            </div>
          }
          right={
            <div className="column">
              {viz}
              {!presentation && <InfoPanels frame={frame} />}
            </div>
          }
        />
      </div>
    </div>
  );
}

export function App() {
  useBoot();
  useHashSync();
  useAutoplay();
  useShortcuts();
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const hasTrace = useStore((s) => s.trace !== undefined);
  const hasTabs = useNav((s) => s.tabs.length > 0);

  return (
    <>
      {/* A failed load (bad trace file) shows its error card rather than an empty workspace. */}
      {hasTrace || (hasTabs && status !== 'error' && status !== 'empty') ? (
        <Workspace />
      ) : status === 'loading' ? (
        <StatusCard kind="loading" title="Loading" message="Loading the proof trace." />
      ) : status === 'empty' ? (
        <StatusCard kind="empty" title="No traces found" message="Generate them from the repo root with pnpm traces (requires Lean), then reload." />
      ) : (
        <StatusCard kind="error" title="Could not load the trace" message={error ?? 'The trace file could not be read.'} />
      )}
      <Dialogs />
    </>
  );
}
