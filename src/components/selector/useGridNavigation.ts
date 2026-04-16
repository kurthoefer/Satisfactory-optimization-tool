import { useEffect, useRef, useState, useCallback } from 'react';
import type { SelectorCategory } from './useProductSelector';
import type { Product } from '@/types';
import { TILE_MIN_WIDTH } from './constants';

interface UseGridNavigationOptions {
  isOpen: boolean;
  sections: SelectorCategory[];
  onSelect: (product: Product) => void;
  onClose: () => void;
  containerRef: React.RefObject<HTMLElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  query: string;
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
  inputRef,
  query,
}: UseGridNavigationOptions) {
  const [position, setPosition] = useState<GridPosition | null>(null);
  const [itemsPerRow, setItemsPerRow] = useState(4);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const focusInGrid = useRef(false);

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

  // Reset when selector opens
  useEffect(() => {
    if (isOpen) {
      setPosition(
        sections.length > 0 ? { sectionIndex: 0, itemIndex: 0 } : null,
      );
      focusInGrid.current = false;
    }
  }, [isOpen]);

  // this is all to produce the "ghost query" effect when navigating the grid.. this can be moved into the product selector if the highlighted product is comunicated back to ProductSelector.tsx.
  const highlightedProduct = position
    ? sections[position.sectionIndex]?.products[position.itemIndex]
    : null;

  const ghostSuffix = (() => {
    if (!highlightedProduct || !query) return '';
    const name = highlightedProduct.product.name;
    if (!name.toLowerCase().startsWith(query.toLowerCase())) return '';
    return name.slice(query.length);
  })();

  // Clamp position when sections change (e.g. query narrows results)
  useEffect(() => {
    if (!isOpen || !position) return;
    const section = sections[position.sectionIndex];
    if (!section || position.itemIndex >= section.products.length) {
      setPosition(
        sections.length > 0 ? { sectionIndex: 0, itemIndex: 0 } : null,
      );
    }
  }, [sections]);

  // Only move DOM focus to grid item when user has explicitly navigated into grid
  useEffect(() => {
    if (!position || !focusInGrid.current) return;
    const key = makeKey(position);
    itemRefs.current.get(key)?.focus();
  }, [position]);

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
          if (sectionIndex === 0) return prev;
          const prevSection = sections[sectionIndex - 1];
          return {
            sectionIndex: sectionIndex - 1,
            itemIndex: prevSection.products.length - 1,
          };
        } else if (next >= sectionLength) {
          if (sectionIndex === sections.length - 1) return prev;
          return { sectionIndex: sectionIndex + 1, itemIndex: 0 };
        }
        return { sectionIndex, itemIndex: next };
      }

      if (delta.rows) {
        const next = itemIndex + delta.rows * itemsPerRow;
        if (next < 0) {
          if (sectionIndex === 0) {
            // Back to input
            focusInGrid.current = false;
            inputRef.current?.focus();
            return prev;
          }
          const prevSection = sections[sectionIndex - 1];
          const lastRowStart =
            Math.floor((prevSection.products.length - 1) / itemsPerRow) *
            itemsPerRow;
          const col = itemIndex % itemsPerRow;
          return {
            sectionIndex: sectionIndex - 1,
            itemIndex: Math.min(
              lastRowStart + col,
              prevSection.products.length - 1,
            ),
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

      const inputFocused = document.activeElement === inputRef.current;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (inputFocused) {
            focusInGrid.current = true;
            if (position) {
              const key = makeKey(position);
              itemRefs.current.get(key)?.focus();
            } else if (sections.length > 0) {
              setPosition({ sectionIndex: 0, itemIndex: 0 });
            }
          } else {
            move({ rows: 1 });
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (inputFocused) break;
          move({ rows: -1 });
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (!inputFocused) move({ cols: 1 });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (!inputFocused) move({ cols: -1 });
          break;
        case ' ':
          e.preventDefault();
          break;
        case 'Enter':
          e.preventDefault();
          if (position) {
            const item =
              sections[position.sectionIndex]?.products[position.itemIndex];
            if (item?.status === 'selectable') {
              onSelect(item.product);
              onClose();
            }
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    },
    [isOpen, position, sections, itemsPerRow, inputRef],
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

  return { getRefSetter, isActive, ghostSuffix };
}
