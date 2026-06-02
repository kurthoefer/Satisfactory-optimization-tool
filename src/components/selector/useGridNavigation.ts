/**
 * Grid navigation primitives — position state and movement math.
 *
 * Deliberately small: this hook owns "where in the sectioned grid are we"
 * and "given a delta, what's the new position." It does NOT own keyboard
 * events or DOM focus — those are the component's job, because keyboards
 * belong to elements and elements live in the render tree.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SelectorCategory } from './useProductSelector';
import { TILE_MIN_WIDTH } from './constants';

export interface GridPosition {
  sectionIndex: number;
  itemIndex: number;
}

interface UseGridNavigationOptions {
  sections: SelectorCategory[];
}

/** Result of a `move` call — describes what happened so the caller can react. */
export type MoveResult =
  | { kind: 'moved'; position: GridPosition }
  | { kind: 'noop' }
  | { kind: 'exitUp' };

export function useGridNavigation({ sections }: UseGridNavigationOptions) {
  const [position, setPosition] = useState<GridPosition | null>(null);
  const [itemsPerRow, setItemsPerRow] = useState(4);
  const itemsPerRowRef = useRef(itemsPerRow);
  itemsPerRowRef.current = itemsPerRow;

  // ResizeObserver attached via ref callback. The component attaches this
  // to the measurement wrapper — a div whose width is the true layout width
  // the inner CSS grids use to compute their column count. The callback
  // disconnects + rebinds automatically on mount/unmount, so there's no
  // lifecycle question to manage.
  const observerRef = useRef<ResizeObserver | null>(null);
  const measureRef = useCallback((el: HTMLElement | null) => {
    observerRef.current?.disconnect();
    if (!el) {
      observerRef.current = null;
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setItemsPerRow(Math.max(1, Math.floor(width / TILE_MIN_WIDTH)));
    });
    observer.observe(el);
    observerRef.current = observer;
  }, []);

  // Clean up the observer when the hook unmounts.
  useEffect(() => () => observerRef.current?.disconnect(), []);

  // Clamp position when sections change.
  useEffect(() => {
    if (!position) return;
    const section = sections[position.sectionIndex];
    if (!section || position.itemIndex >= section.products.length) {
      setPosition(
        sections.length > 0 ? { sectionIndex: 0, itemIndex: 0 } : null,
      );
    }
  }, [sections, position]);

  const move = useCallback(
    (delta: { rows?: number; cols?: number }): MoveResult => {
      if (!position) {
        if (sections.length === 0) return { kind: 'noop' };
        const start: GridPosition = { sectionIndex: 0, itemIndex: 0 };
        setPosition(start);
        return { kind: 'moved', position: start };
      }
      const next = computeNext(
        position,
        delta,
        sections,
        itemsPerRowRef.current,
      );
      if (next === 'exitUp') return { kind: 'exitUp' };
      if (next === null) return { kind: 'noop' };
      setPosition(next);
      return { kind: 'moved', position: next };
    },
    [position, sections],
  );

  const isActive = useCallback(
    (sectionIndex: number, itemIndex: number) =>
      position?.sectionIndex === sectionIndex &&
      position?.itemIndex === itemIndex,
    [position],
  );

  const clearPosition = useCallback(() => setPosition(null), []);

  const enterAtStart = useCallback((): GridPosition | null => {
    if (sections.length === 0) return null;
    const start: GridPosition = { sectionIndex: 0, itemIndex: 0 };
    setPosition(start);
    return start;
  }, [sections]);

  return {
    position,
    move,
    isActive,
    clearPosition,
    enterAtStart,
    measureRef,
  };
}

// ─── Pure movement math ───────────────────────────────────────────────────────

function computeNext(
  pos: GridPosition,
  delta: { rows?: number; cols?: number },
  sections: SelectorCategory[],
  itemsPerRow: number,
): GridPosition | 'exitUp' | null {
  const section = sections[pos.sectionIndex];
  if (!section) return null;
  const sectionLength = section.products.length;

  if (delta.cols) {
    const next = pos.itemIndex + delta.cols;
    if (next < 0) {
      if (pos.sectionIndex === 0) return null;
      const prevSection = sections[pos.sectionIndex - 1];
      return {
        sectionIndex: pos.sectionIndex - 1,
        itemIndex: prevSection.products.length - 1,
      };
    } else if (next >= sectionLength) {
      if (pos.sectionIndex === sections.length - 1) return null;
      return { sectionIndex: pos.sectionIndex + 1, itemIndex: 0 };
    }
    return { sectionIndex: pos.sectionIndex, itemIndex: next };
  }

  if (delta.rows) {
    const next = pos.itemIndex + delta.rows * itemsPerRow;
    if (next < 0) {
      if (pos.sectionIndex === 0) return 'exitUp';
      const prevSection = sections[pos.sectionIndex - 1];
      const lastRowStart =
        Math.floor((prevSection.products.length - 1) / itemsPerRow) *
        itemsPerRow;
      const col = pos.itemIndex % itemsPerRow;
      return {
        sectionIndex: pos.sectionIndex - 1,
        itemIndex: Math.min(
          lastRowStart + col,
          prevSection.products.length - 1,
        ),
      };
    } else if (next >= sectionLength) {
      if (pos.sectionIndex === sections.length - 1) return null;
      const col = pos.itemIndex % itemsPerRow;
      return {
        sectionIndex: pos.sectionIndex + 1,
        itemIndex: Math.min(
          col,
          sections[pos.sectionIndex + 1].products.length - 1,
        ),
      };
    }
    return { sectionIndex: pos.sectionIndex, itemIndex: next };
  }

  return null;
}
