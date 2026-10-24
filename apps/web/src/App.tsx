import { useMemo } from 'react';
import { filmOf } from './core/frames';
import { identity, isPlaceholder } from './identity';
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

function Footer() {
  const who = isPlaceholder(identity.yourName) ? null : identity.yourName;
  return (
    <p className="footer">
      {who ? `Built by ${who} for ${identity.event}.` : `Built for ${identity.event}.`}
      <span className="footer-sep" aria-hidden>
        ·
      </span>
      <span>Every proof state comes from a real Lean run.</span>
    </p>
  );
}

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
          <ErrorBoundary fallback={(msg) => <StatusCard kind="error" title="The picture broke." message={`${msg} The code and goals still work. Try lite mode (L).`} />}>
            <VizPane film={film} frame={frame} />
          </ErrorBoundary>
        }
      />
      <TransportBar trace={trace} frame={frame} />
      <Footer />
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
        <StatusCard kind="loading" title="Asking Lean nicely..." message="Loading the proof trace." />
      ) : status === 'empty' ? (
        <StatusCard
          kind="empty"
          title="No traces yet."
          message="Lean hasn't been run over the samples on this build. From the repo root: pnpm traces (needs Lean via elan), then reload."
        />
      ) : (
        <StatusCard kind="error" title="This trace didn't load." message={error ?? 'Something went wrong reading the trace.'} />
      )}
      <Dialogs />
    </>
  );
}
