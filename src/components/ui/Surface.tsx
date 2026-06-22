// ============================================================================
// Surface
//
// A floating, draggable window. Owns exactly two things: the panel chrome (the
// shared aesthetic) and window behavior (drag-to-move via the header, raise-to-
// front via the window manager). It deliberately does NOT own its contents'
// layout, scrolling, or draggable-HEIGHT — those live in the children (e.g. the
// shelf list / selector grid) and manage themselves.
//
// Drag is fully imperative (a ref + direct transform writes), so moving a
// window never re-renders its contents — important when the body holds
// something heavy like the selector grid. Pointer capture on the header keeps
// the drag from leaking into the canvas pan underneath.
//
// Mount inside a window-layer stacking context (`isolation: isolate`) so the
// manager's relative z-orders never fight your tooltip / nav z-indices.
// ============================================================================

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

import { useWindow } from '@/lib/windows';
import { cn } from '@/utils/cn';

type Anchor = 'top-left' | 'top-right';

interface SurfaceProps {
  /** Unique window id for z-order tracking. */
  id: string;
  /** Title shown in the drag handle; also the accessible label. */
  title?: string;
  /** Spawn position in viewport px. Cascade these per window. */
  anchor?: Anchor;
  margin?: number;
  /** Extra classes for the window root (e.g. width). */
  className?: string;
  children: ReactNode;
}

export function Surface({
  id,
  title,
  anchor = 'top-left',
  margin = 24,
  className,
  children,
}: SurfaceProps) {
  const { z, raise } = useWindow(id);

  const rootRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const placed = useRef(false);
  const drag = useRef<{
    px: number;
    py: number;
    ox: number;
    oy: number;
  } | null>(null);

  const applyTransform = useCallback(() => {
    const el = rootRef.current;
    if (el)
      el.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
  }, []);

  // Re-apply position after every render (mount, z change, …) from the live
  // ref, so a React render never clobbers an in-progress drag.
  useLayoutEffect(() => {
    if (!placed.current) {
      pos.current = anchorToPosition(anchor, margin, rootRef.current);
      placed.current = true;
    }
    applyTransform();
  });

  // Keep the window reachable if the viewport shrinks under it.
  useEffect(() => {
    const onResize = () => {
      pos.current = clampToViewport(
        pos.current.x,
        pos.current.y,
        rootRef.current,
      );
      applyTransform();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [applyTransform]);

  const onHandleDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = 'grabbing';
    drag.current = {
      px: e.clientX,
      py: e.clientY,
      ox: pos.current.x,
      oy: pos.current.y,
    };
  }, []);

  const onHandleMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d) return;
      const nextX = d.ox + (e.clientX - d.px);
      const nextY = d.oy + (e.clientY - d.py);
      pos.current = clampToViewport(nextX, nextY, rootRef.current);
      applyTransform();
    },
    [applyTransform],
  );

  const onHandleUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = null;
    e.currentTarget.style.cursor = '';
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  return (
    <div
      ref={rootRef}
      role={title ? 'region' : undefined}
      aria-label={title}
      onPointerDown={raise}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: z,
        willChange: 'transform',
      }}
      className={cn(
        // The single home for the panel aesthetic. Dark-only for now (leaning
        // into the Satisfactory palette); when light/dark lands, promote these
        // to design tokens and flip them in one place.
        'flex flex-col overflow-hidden rounded-lg border border-neutral-700',
        'bg-neutral-900/90 shadow-xl',
        className,
      )}
    >
      <div
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        className='flex shrink-0 cursor-grab touch-none select-none items-center gap-2 border-b border-neutral-800 px-3 py-2 text-xs font-medium text-neutral-400'
      >
        <span
          aria-hidden
          className='text-neutral-600'
        >
          ⋮⋮
        </span>
        {title && <span className='truncate'>{title}</span>}
      </div>

      {/* min-h-0 lets a scrollable child (shelf list, selector grid) own its
          own height — Surface stays out of the inner draggable-height story. */}
      <div className='min-h-0 flex-1'>{children}</div>
    </div>
  );
}

function anchorToPosition(
  anchor: Anchor,
  margin: number,
  el: HTMLElement | null,
) {
  const w = el?.offsetWidth ?? 0;
  const x =
    anchor === 'top-right'
      ? Math.max(margin, window.innerWidth - w - margin)
      : margin;
  return { x, y: margin };
}

function clampToViewport(x: number, y: number, el: HTMLElement | null) {
  if (!el) return { x, y };
  const maxX = Math.max(0, window.innerWidth - el.offsetWidth);
  const maxY = Math.max(0, window.innerHeight - el.offsetHeight);
  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
  };
}
