import { useEffect, useRef, useState, useCallback } from 'react';
import type { SelectorCategory } from './useProductSelector';
import type { Product } from '@/types';

import { TILE_MIN_WIDTH } from './constants';
// const TILE_MIN_WIDTH = 80;

interface UseGridNavigationOptions {
  isOpen: boolean;
  sections: SelectorCategory[];
  onSelect: (product: Product) => void;
  onClose: () => void;
  containerRef: React.RefObject<HTMLElement>;
}

interface GridPosition {
  sectionIndex: number;
  itemIndex: number;
}

export function useGridNavigation({
  isOpen,
  sections,
  onSelect,
  onClose,
  containerRef,
}: UseGridNavigationOptions) {
  const [position, setPosition] = useState<GridPosition | null>(null);
  const [itemsPerRow, setItemsPerRow] = useState(4);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  // ResizeObserver — keep itemsPerRow in sync with container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setItemsPerRow(Math.max(1, Math.floor(width / TILE_MIN_WIDTH)));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  // Reset position when selector opens or sections change
  useEffect(() => {
    if (isOpen) {
      setPosition(
        sections.length > 0 ? { sectionIndex: 0, itemIndex: 0 } : null,
      );
    }
  }, [isOpen, sections]);

  // Focus the DOM element whenever position changes
  useEffect(() => {
    if (!position) return;
    const key = makeKey(position);
    itemRefs.current.get(key)?.focus();
  }, [position]);

  // Flatten position → absolute index within a section, and vice versa
  function move(delta: { rows?: number; cols?: number }) {
    setPosition((prev) => {
      if (!prev) return prev;

      const section = sections[prev.sectionIndex];
      if (!section) return prev;

      let { sectionIndex, itemIndex } = prev;
      const sectionLength = section.products.length;

      if (delta.cols) {
        const next = itemIndex + delta.cols;
        if (next < 0) {
          // Move to previous section, last item
          if (sectionIndex === 0) return prev;
          const prevSection = sections[sectionIndex - 1];
          return {
            sectionIndex: sectionIndex - 1,
            itemIndex: prevSection.products.length - 1,
          };
        } else if (next >= sectionLength) {
          // Move to next section, first item
          if (sectionIndex === sections.length - 1) return prev;
          return { sectionIndex: sectionIndex + 1, itemIndex: 0 };
        }
        return { sectionIndex, itemIndex: next };
      }

      if (delta.rows) {
        const next = itemIndex + delta.rows * itemsPerRow;
        if (next < 0) {
          if (sectionIndex === 0) return prev;
          const prevSection = sections[sectionIndex - 1];
          // Land on same column in last row of previous section
          const lastRowStart =
            Math.floor((prevSection.products.length - 1) / itemsPerRow) *
            itemsPerRow;
          const col = itemIndex % itemsPerRow;
          const candidate = lastRowStart + col;
          return {
            sectionIndex: sectionIndex - 1,
            itemIndex: Math.min(candidate, prevSection.products.length - 1),
          };
        } else if (next >= sectionLength) {
          if (sectionIndex === sections.length - 1) return prev;
          const col = itemIndex % itemsPerRow;
          return {
            sectionIndex: sectionIndex + 1,
            itemIndex: Math.min(
              col,
              sections[sectionIndex + 1].products.length - 1,
            ),
          };
        }
        return { sectionIndex, itemIndex: next };
      }

      return prev;
    });
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          move({ cols: 1 });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          move({ cols: -1 });
          break;
        case 'ArrowDown':
          e.preventDefault();
          move({ rows: 1 });
          break;
        case 'ArrowUp':
          e.preventDefault();
          move({ rows: -1 });
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (position) {
            const item =
              sections[position.sectionIndex]?.products[position.itemIndex];
            if (item?.status === 'selectable') onSelect(item.product);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    },
    [isOpen, position, sections, itemsPerRow],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function makeKey({ sectionIndex, itemIndex }: GridPosition) {
    return `${sectionIndex}-${itemIndex}`;
  }

  function getRefSetter(sectionIndex: number, itemIndex: number) {
    return (el: HTMLElement | null) => {
      const key = makeKey({ sectionIndex, itemIndex });
      if (el) itemRefs.current.set(key, el);
      else itemRefs.current.delete(key);
    };
  }

  function isActive(sectionIndex: number, itemIndex: number) {
    return (
      position?.sectionIndex === sectionIndex &&
      position?.itemIndex === itemIndex
    );
  }

  return { getRefSetter, isActive };
}
