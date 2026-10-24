// The top bar: brand, sidebar toggle, every playback control, theme and help.

import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import type { Frame } from '../core/frames';
import { identity } from '../identity';
import { FirstIcon, HelpIcon, MoonIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, SidebarIcon, SunIcon } from './icons';
import { Logo, Wordmark } from './Logo';
import { SPEEDS, useStore, type Speed } from './store';
import { setTheme, useTheme } from './theme';

function Scrubber({ frame, errorSteps }: { frame: Frame; errorSteps: ReadonlySet<number> }) {
  const goto = useStore((s) => s.goto);
  const stopPlay = useStore((s) => s.stopPlay);
  const track = useRef<HTMLDivElement>(null);
  const total = frame.total;
  const pct = (k: number) => (total ? (k / total) * 100 : 0);

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = track.current?.getBoundingClientRect();
    if (!r || total === 0) return;
    stopPlay();
    goto(Math.round(((e.clientX - r.left) / r.width) * total));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
    if (e.key in keys) {
      e.preventDefault();
      e.stopPropagation();
      goto(frame.index + keys[e.key]!);
    }
  };

  return (
    <div
      className="scrubber"
      ref={track}
      role="slider"
      tabIndex={0}
      aria-label="Proof position"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={frame.index}
      aria-valuetext={frame.summary}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        fromPointer(e);
      }}
      onPointerMove={(e) => e.buttons === 1 && fromPointer(e)}
      onKeyDown={onKey}
    >
      <div className="scrub-rail" />
      <div className="scrub-fill" style={{ width: `${pct(frame.index)}%` }} />
      {/* Dot k sits where step k has run; a failing step's dot is red. */}
      {Array.from({ length: total + 1 }, (_, k) => (
        <span
          key={k}
          className={`scrub-dot${k <= frame.index ? ' is-ran' : ''}${errorSteps.has(k - 1) ? ' is-error' : ''}`}
          style={{ left: `${pct(k)}%` }}
        />
      ))}
      <span className="scrub-thumb" style={{ left: `${pct(frame.index)}%` }} />
    </div>
  );
}

export function Header({ frame, errorSteps }: { frame: Frame | undefined; errorSteps: ReadonlySet<number> }) {
  const { prev, next, reset, togglePlay, setSpeed, toggleExplorer, setDialog } = useStore.getState();
  const playing = useStore((s) => s.playing);
  const speed = useStore((s) => s.speed);
  const explorerOpen = useStore((s) => s.explorerOpen);
  const theme = useTheme((s) => s.theme);
  const idle = !frame || frame.total === 0;
  const atStart = !frame || frame.index === 0;
  const atEnd = !frame || frame.index === frame.total;

  return (
    <header className="header">
      <div className="header-left">
        <button className="brand" onClick={() => setDialog('help')} aria-label={`${identity.projectName}: help and about`}>
          <Logo size={26} />
          <Wordmark />
        </button>
        <button className="icon-btn" onClick={toggleExplorer} aria-pressed={explorerOpen} aria-label={explorerOpen ? 'Close the files panel' : 'Open the files panel'} title="Files panel (B)">
          <SidebarIcon />
        </button>
      </div>

      <div className="transport" aria-label="Playback">
        <button className="icon-btn" onClick={reset} disabled={atStart} aria-label="Reset" title="Back to the start (Home)">
          <FirstIcon />
        </button>
        <button className="icon-btn" onClick={prev} disabled={atStart} aria-label="Previous line" title="Previous line (←)">
          <PrevIcon />
        </button>
        <button className="btn primary next-btn" onClick={next} disabled={idle || atEnd} aria-label="Next line" title="Next line (→ or Space)">
          Next
          <NextIcon />
        </button>
        <button className="icon-btn" onClick={togglePlay} disabled={idle} aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing} title="Autoplay (P)">
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <span className="step-count tnum" aria-hidden>
          {frame ? (
            <>
              Step <b>{frame.index}</b> / {frame.total}
            </>
          ) : (
            'Run to play'
          )}
        </span>
        {frame && frame.total > 0 && <Scrubber frame={frame} errorSteps={errorSteps} />}
        <label className="speed-select">
          <span className="sr-only">Autoplay speed</span>
          <select value={speed} onChange={(e) => (setSpeed(Number(e.target.value) as Speed), e.target.blur())} title="Autoplay speed ([ and ])">
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="header-right">
        <div className="theme-switch" role="group" aria-label="Theme">
          <button className="icon-btn" aria-pressed={theme === 'light'} onClick={() => setTheme('light')} aria-label="Light theme" title="Light theme">
            <SunIcon />
          </button>
          <button className="icon-btn" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')} aria-label="Dark theme" title="Dark theme">
            <MoonIcon />
          </button>
        </div>
        <button className="icon-btn" onClick={() => setDialog('help')} aria-label="Help, shortcuts and contact" title="Help (?)">
          <HelpIcon />
        </button>
      </div>
      {frame && (
        <p className="sr-only" aria-live="polite">
          {frame.summary}
        </p>
      )}
    </header>
  );
}
