import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/*
 CursorTooltip — generic floating peek surface.

 Owns three things and nothing else:
   1. Positioning   — follows the cursor at a fixed offset, flips near edges.
   2. Visibility    — a short delay gates *appearance*; a grace period on the
                      way out prevents flicker between adjacent targets.
   3. Follow motion — instant (written straight to transform), so it never
                      lags behind the pointer.

 It is domain-blind: the caller supplies `active` + cursor coords and renders
 whatever content it likes as children. Hit detection (which node is under the
 cursor) lives with whoever owns the cursor — the graph, in our case.
*/

interface CursorTooltipProps {
  /** A target is currently hovered (decided by the caller's hit test). */
  active: boolean;
  /** Cursor position in viewport (client) coordinates. */
  x: number;
  y: number;
  children: ReactNode;
  /** Gap between cursor and tooltip, in px. */
  offset?: number;
  /** Delay before appearing, in ms. Gates appearance only — see note below. */
  showDelay?: number;
  /** Grace period before hiding, in ms. Absorbs gaps between adjacent targets. */
  hideGrace?: number;
  /** Viewport edge padding, in px. */
  margin?: number;
}

export function CursorTooltip({
  active,
  x,
  y,
  children,
  offset = 16,
  showDelay = 80,
  hideGrace = 60,
  margin = 8,
}: CursorTooltipProps) {
  const [visible, setVisible] = useState(false);

  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const cursor = useRef({ x, y });
  const size = useRef({ w: 0, h: 0 });
  const showTimer = useRef<number | undefined>(undefined);
  const hideTimer = useRef<number | undefined>(undefined);

  // Pure positioning math, written directly to `transform`. We deliberately
  // do NOT put a CSS transition on transform — that would make the tooltip
  // lag a frame or two behind the pointer and feel broken. Reads refs only,
  // so it's safe to call from anywhere (render effect, ResizeObserver).
  const place = useCallback(() => {
    const el = outerRef.current;
    if (!el) return;

    const { x, y } = cursor.current;
    const { w, h } = size.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Default anchor: below and to the left of the cursor.
    let left = x - offset - w;
    let top = y + offset;

    // Flip an axis ONLY when the default would actually clip a viewport edge.
    // This keeps the tooltip rock-stable across the middle of the screen and
    // only adjusts within a tooltip-width margin near the edges — no jumping
    // across the viewport midlines.
    if (left < margin) left = x + offset;
    if (top + h > vh - margin) top = y - offset - h;

    // Safety clamp for the degenerate case (tooltip larger than the gap).
    left = Math.max(margin, Math.min(left, vw - w - margin));
    top = Math.max(margin, Math.min(top, vh - h - margin));

    el.style.transform = `translate(${left}px, ${top}px)`;
  }, [offset, margin]);

  // Track the cursor and reposition before paint, every render, while visible.
  // Measuring here (rather than only via the observer) means the very first
  // frame is already correctly placed instead of flashing at w=0.
  useLayoutEffect(() => {
    if (!visible) return;
    cursor.current = { x, y };
    const el = innerRef.current;
    if (el) size.current = { w: el.offsetWidth, h: el.offsetHeight };
    place();
  });

  // The thumbnail loads asynchronously, which changes the tooltip's size
  // without triggering a React render — so re-measure and re-place on resize.
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      size.current = { w: el.offsetWidth, h: el.offsetHeight };
      place();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [place]);

  // Visibility. The show delay gates APPEARANCE only: once the tooltip is up,
  // content swaps instantly as the caller changes children (moving node→node
  // does not re-arm the delay). The hide grace lets the cursor cross a 1px gap
  // between adjacent targets without the tooltip blinking off and back on.
  useEffect(() => {
    if (active) {
      clearTimeout(hideTimer.current);
      if (!visible) {
        showTimer.current = window.setTimeout(
          () => setVisible(true),
          showDelay,
        );
      }
    } else {
      clearTimeout(showTimer.current);
      if (visible) {
        hideTimer.current = window.setTimeout(
          () => setVisible(false),
          hideGrace,
        );
      }
    }
    return () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, [active, visible, showDelay, hideGrace]);

  return (
    <div
      ref={outerRef}
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50,
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    >
      {/* Outer node = position (instant). Inner node = appearance (animated).
          Keeping them separate is what lets the follow stay snappy while the
          fade stays smooth. */}
      <div
        ref={innerRef}
        className='transition-opacity duration-100 ease-out'
        style={{ opacity: visible ? 1 : 0 }}
      >
        {children}
      </div>
    </div>
  );
}
