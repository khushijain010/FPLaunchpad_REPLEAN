// Prev / Next / Play, speed, a scrubber with one tick per proof line, and the step counter.

import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import type { Frame } from '../core/frames';
import type { Trace } from '../core/types';
import { SPEEDS, useStore } from './store';

function Scrubber({ trace, frame }: { trace: Trace; frame: Frame }) {
  const goto = useStore((s) => s.goto);
  const stopPlay = useStore((s) => s.stopPlay);
  const track = useRef<HTMLDivElement>(null);
  const total = trace.steps.length;

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
      <div className="scrub-fill" style={{ width: `${total ? (frame.index / total) * 100 : 0}%` }} />
      {trace.steps.map((s, i) => {
        const pos = ((i + 1) / total) * 100;
        const cls = s.error ? 'is-error' : i < frame.index ? 'is-ran' : '';
        return <span key={i} className={`scrub-tick ${cls}`} style={{ left: `${pos}%` }} title={`Line ${s.range.line}: ${s.text}`} />;
      })}
      <span className="scrub-thumb" style={{ left: `${total ? (frame.index / total) * 100 : 0}%` }} />
    </div>
  );
}

export function TransportBar({ trace, frame }: { trace: Trace; frame: Frame }) {
  const { prev, next, reset, togglePlay, setSpeed } = useStore.getState();
  const playing = useStore((s) => s.playing);
  const speed = useStore((s) => s.speed);
  const atStart = frame.index === 0;
  const atEnd = frame.index === frame.total;

  return (
    <footer className="transport" aria-label="Playback">
      <div className="transport-buttons">
        <button className="btn icon" onClick={reset} disabled={atStart} aria-label="Reset" title="Reset (Home)">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M2 2v10M12 2 5 7l7 5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
        </button>
        <button className="btn icon" onClick={prev} disabled={atStart} aria-label="Previous line" title="Previous (←)">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M10 2 4 7l6 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button className="btn primary next-btn" onClick={next} disabled={atEnd} aria-label="Next line" title="Next (→ or Space)">
          Next
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M4 2l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button className="btn icon" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing} title="Autoplay (P)">
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M4 2v10M10 2v10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M3.5 2v10l8-5z" fill="currentColor" /></svg>
          )}
        </button>
        <div className="speeds" role="group" aria-label="Autoplay speed">
          {SPEEDS.map((s) => (
            <button key={s} className="speed tnum" aria-pressed={speed === s} onClick={() => setSpeed(s)} title="Speed ([ and ])">
              {s}x
            </button>
          ))}
        </div>
      </div>
      <Scrubber trace={trace} frame={frame} />
      <div className="counter tnum" aria-hidden>
        <span className="counter-now">{frame.index}</span>
        <span className="counter-sep">/</span>
        <span>{frame.total}</span>
      </div>
      <p className="sr-only" aria-live="polite">
        {frame.summary}
      </p>
    </footer>
  );
}
