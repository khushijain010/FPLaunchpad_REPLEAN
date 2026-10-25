// Draggable dividers. Split: two columns, 50/50 by default, clamped to 35-65%. Stack: two cards
// on top of each other in a column. Each remembers where it was left, so the layout is yours.

import { useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';

const read = (key: string, fallback: number): number => {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, v: number) => {
  try {
    localStorage.setItem(key, String(Math.round(v)));
  } catch {
    // Private mode: the layout just won't be remembered.
  }
};

type Axis = 'x' | 'y';

/** Percentage state for one divider: drag, arrow keys, double-click to reset, remembered. */
function useDivider(key: string, initial: number, min: number, max: number, axis: Axis) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const [pct, setPctRaw] = useState(() => clamp(read(key, initial)));
  const [dragging, setDragging] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const setPct = (v: number) => {
    const c = clamp(v);
    setPctRaw(c);
    write(key, c);
  };
  const [less, more] = axis === 'x' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];

  const boxProps = {
    ref: box,
    onPointerMove: (e: PointerEvent) => {
      if (!dragging || !box.current) return;
      const r = box.current.getBoundingClientRect();
      setPct(axis === 'x' ? ((e.clientX - r.left) / r.width) * 100 : ((e.clientY - r.top) / r.height) * 100);
    },
    onPointerUp: () => setDragging(false),
    onPointerLeave: () => setDragging(false),
  };
  const dividerProps = {
    role: 'separator',
    'aria-orientation': axis === 'x' ? ('vertical' as const) : ('horizontal' as const),
    'aria-valuenow': Math.round(pct),
    'aria-valuemin': min,
    'aria-valuemax': max,
    'data-dragging': dragging,
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.blur();
      setDragging(true);
    },
    // A mouse drag shouldn't leave focus here, or the arrow keys would resize panels instead of
    // stepping. Keyboard users can still Tab to the divider and resize with the arrow keys.
    onMouseDown: (e: MouseEvent) => e.preventDefault(),
    onDoubleClick: () => setPct(initial),
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === less || e.key === more) {
        e.preventDefault();
        e.stopPropagation();
        setPct(pct + (e.key === less ? -2 : 2));
      }
    },
  };
  return { pct, boxProps, dividerProps };
}

export function Split({ left, right, hideLeft }: { left: ReactNode; right: ReactNode; hideLeft: boolean }) {
  const { pct, boxProps, dividerProps } = useDivider('replean.split.columns', 50, 35, 65, 'x');
  return (
    <div className="split" {...boxProps} style={{ gridTemplateColumns: hideLeft ? 'minmax(0, 1fr)' : `${pct}% 9px minmax(0, 1fr)` }}>
      <div className="pane code" hidden={hideLeft}>
        {left}
      </div>
      <button className="divider" aria-label="Resize panels" hidden={hideLeft} {...dividerProps} />
      <div className="pane viz">{right}</div>
    </div>
  );
}

/** Two cards in a column with a draggable divider between them. Without `bottom`, `top` fills it. */
export function Stack({ id, top, bottom, initial, label }: { id: string; top: ReactNode; bottom?: ReactNode; initial: number; label: string }) {
  const { pct, boxProps, dividerProps } = useDivider(`replean.split.${id}`, initial, 20, 80, 'y');
  if (!bottom) return <div className="stack is-single">{top}</div>;
  return (
    <div className="stack" {...boxProps} style={{ gridTemplateRows: `minmax(0, ${pct}fr) 9px minmax(0, ${100 - pct}fr)` }}>
      {top}
      <button className="divider divider-y" aria-label={label} {...dividerProps} />
      {bottom}
    </div>
  );
}
