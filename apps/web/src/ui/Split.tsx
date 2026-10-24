// Two columns with a draggable divider, 50/50 by default, clamped to 35-65%.

import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

const MIN = 35;
const MAX = 65;
const clamp = (v: number) => Math.max(MIN, Math.min(MAX, v));

export function Split({ left, right, hideLeft }: { left: ReactNode; right: ReactNode; hideLeft: boolean }) {
  const [pct, setPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      setPct((p) => clamp(p + (e.key === 'ArrowLeft' ? -2 : 2)));
    }
  };

  return (
    <div
      className="split"
      ref={box}
      style={{ gridTemplateColumns: hideLeft ? '0 0 1fr' : `${pct}% 9px 1fr` }}
      onPointerMove={(e) => {
        if (!dragging || !box.current) return;
        const r = box.current.getBoundingClientRect();
        setPct(clamp(((e.clientX - r.left) / r.width) * 100));
      }}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setDragging(false)}
    >
      <div className="pane code" hidden={hideLeft}>
        {left}
      </div>
      <button
        className="divider"
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-label="Resize panels"
        data-dragging={dragging}
        hidden={hideLeft}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.blur();
          setDragging(true);
        }}
        // A mouse drag shouldn't leave focus here, or → would resize panels instead of stepping.
        // Keyboard users can still Tab to the divider and resize with the arrow keys.
        onMouseDown={(e) => e.preventDefault()}
        onDoubleClick={() => setPct(50)}
        onKeyDown={onKey}
      />
      <div className="pane viz">{right}</div>
    </div>
  );
}
