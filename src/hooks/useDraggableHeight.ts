/**
 * Provides a drag-to-resize height for a container.
 * Direction controls whether dragging down (bottom) or up (top) increases height.
 *
 *   'bottom' — handle sits at the bottom, drag down = taller (desktop grid)
 *   'top'    — handle sits at the top, drag up = taller (mobile sheet)
 */

import { useState, useRef, useCallback } from 'react';

const DEFAULT_HEIGHT = 300;
const MIN_HEIGHT = 120;

interface UseDraggableHeightOptions {
  initialHeight?: number;
  minHeight?: number;
  direction?: 'bottom' | 'top';
}

interface UseDraggableHeightResult {
  height: number;
  handleDragStart: (e: React.PointerEvent) => void;
}

export function useDraggableHeight({
  initialHeight = DEFAULT_HEIGHT,
  minHeight = MIN_HEIGHT,
  direction = 'bottom',
}: UseDraggableHeightOptions = {}): UseDraggableHeightResult {
  const [height, setHeight] = useState(initialHeight);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(initialHeight);

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      dragStartY.current = e.clientY;
      dragStartHeight.current = height;

      const onMove = (ev: PointerEvent) => {
        if (dragStartY.current === null) return;
        const delta = ev.clientY - dragStartY.current;
        const next =
          direction === 'top'
            ? dragStartHeight.current - delta
            : dragStartHeight.current + delta;
        setHeight(Math.max(minHeight, next));
      };

      const onUp = () => {
        dragStartY.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [height, direction, minHeight],
  );

  return { height, handleDragStart };
}
