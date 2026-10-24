import { useMemo } from 'react';
import { filmOf } from './core/frames';
import { CodePane } from './ui/CodePane';
import { Dialogs } from './ui/Dialogs';
import { useLive } from './ui/live';
import { LiveEditor } from './ui/LiveEditor';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { useAutoplay, useBoot, useHashSync } from './ui/loader';
import { useShortcuts } from './ui/shortcuts';
import { Split } from './ui/Split';
import { useStore } from './ui/store';
import { StatusCard } from './ui/StatusCard';
import { TopBar } from './ui/TopBar';
import { TransportBar } from './ui/TransportBar';
import { GoalPanel } from './views/GoalPanel';
import { VizPane } from './views/VizPane';
import { WhyPanel } from './views/WhyPanel';

function Player() {
  const trace = useStore((s) => s.trace)!;
  const step = useStore((s) => s.step);
  const goto = useStore((s) => s.goto);
  const stopPlay = useStore((s) => s.stopPlay);
  const presentation = useStore((s) => s.presentation);
  const editing = useLive((s) => s.editing);
  const film = useMemo(() => filmOf(trace), [trace]);
  const frame = film.frames[Math.min(step, film.frames.length - 1)]!;

  const jumpToLine = (line: number) => {
    const i = trace.steps.findIndex((s) => s.range.line === line);
    if (i >= 0) {
      stopPlay();
      goto(i + 1);
    }
  };

  const left = editing ? (
    <>
      <TopBar />
      <LiveEditor />
    </>
  ) : (
    <>
      <TopBar />
      {trace.meta.watch && (
        <p className="watch">
          <span className="watch-label">watch</span> {trace.meta.watch}
        </p>
      )}
      <div className="code-wrap">
        <CodePane trace={trace} frame={frame} onLine={jumpToLine} />
      </div>
      <div className="info">
        <GoalPanel frame={frame} />
        <WhyPanel frame={frame} />
      </div>
    </>
  );

  return (
    <div className={`app${presentation ? ' is-presenting' : ''}`}>
      <Split
        hideLeft={presentation && !editing}
        left={left}
        right={
          <ErrorBoundary fallback={(msg) => <StatusCard kind="error" title="Visualization error" message={`${msg}. The code and goal panels still work; lite mode (L) may help.`} />}>
            <VizPane film={film} frame={frame} />
          </ErrorBoundary>
        }
      />
      <TransportBar trace={trace} frame={frame} />
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

  return (
    <>
      {/* While the next sample loads, the current one stays on screen: no flash, no remount. */}
      {(status === 'ready' || status === 'loading') && hasTrace ? (
        <Player />
      ) : status === 'loading' ? (
        <StatusCard kind="loading" title="Loading" message="Loading the proof trace." />
      ) : status === 'empty' ? (
        <StatusCard
          kind="empty"
          title="No traces found"
          message="Generate them from the repo root with pnpm traces (requires Lean), then reload."
        />
      ) : (
        <StatusCard kind="error" title="Could not load the trace" message={error ?? 'The trace file could not be read.'} />
      )}
      <Dialogs />
    </>
  );
}
