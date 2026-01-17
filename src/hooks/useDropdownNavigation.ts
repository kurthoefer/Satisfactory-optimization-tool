import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Product, ProductsByCategory } from '@/types';

interface GridSection {
  category: string;
  items: Product[];
  startIndex: number;
  endIndex: number;
  itemsPerRow: number;
}

interface UseDropdownNavigationProps {
  isOpen: boolean;
  filteredProducts: ProductsByCategory;
  onSelect: (product: Product) => void;
  onClose: () => void;
}

const buildGridSections = (
  productsByCategory: ProductsByCategory,
): GridSection[] => {
  let globalIndex = 0;

  return Object.entries(productsByCategory).map(([category, items]) => {
    const section = {
      category,
      items,
      startIndex: globalIndex,
      endIndex: globalIndex + items.length - 1,
      itemsPerRow: 1, // Will be measured after render
    };
    globalIndex += items.length;
    return section;
  });
};

export const useDropdownNavigation = ({
  isOpen,
  filteredProducts,
  onSelect,
  onClose,
}: UseDropdownNavigationProps) => {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Build grid sections from filtered products - this is ALWAYS current
  const gridSections = useMemo(() => {
    if (!isOpen || Object.keys(filteredProducts).length === 0) return [];
    return buildGridSections(filteredProducts);
  }, [isOpen, filteredProducts]);

  // Measure and update grid dimensions after render
  useEffect(() => {
    if (!isOpen || gridSections.length === 0) return;

    const timeoutId = setTimeout(() => {
      // Measure the actual DOM and update the itemsPerRow in place
      // TODO. maybe this should be lifted
      gridSections.forEach((section) => {
        const sectionElement = sectionRefs.current[section.category];
        if (!sectionElement || section.items.length === 0) return;

        const items = Array.from(sectionElement.children) as HTMLElement[];
        if (items.length < 2) {
          section.itemsPerRow = items.length;
          return;
        }

        const firstTop = items[0].getBoundingClientRect().top;
        let itemsPerRow = 1;

        for (let i = 1; i < items.length; i++) {
          if (items[i].getBoundingClientRect().top === firstTop) {
            itemsPerRow++;
          } else {
            break;
          }
        }

        section.itemsPerRow = itemsPerRow;
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [isOpen, gridSections]);

  // Focus management
  const focusItem = useCallback((index: number) => {
    const element = itemRefs.current[index];
    if (element) {
      element.focus();
      setFocusedIndex(index);
    }
  }, []);

  // Handle keyboard navigation from input field
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || gridSections.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          focusItem(0); // First item overall
          break;
        case 'ArrowUp':
          e.preventDefault();
          const lastSection = gridSections[gridSections.length - 1];
          const lastCol =
            (lastSection.items.length - 1) % lastSection.itemsPerRow;
          const lastItemInFirstCol = lastSection.endIndex - lastCol;
          focusItem(lastItemInFirstCol); // Last item in first column
          break;
      }
    },
    [isOpen, gridSections, focusItem],
  );

  // Handle keyboard navigation within dropdown items
  const handleItemKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      const currentSection = gridSections.find(
        (s) => currentIndex >= s.startIndex && currentIndex <= s.endIndex,
      );

      if (!currentSection) return;

      const indexInSection = currentIndex - currentSection.startIndex;
      const row = Math.floor(indexInSection / currentSection.itemsPerRow);
      const col = indexInSection % currentSection.itemsPerRow;

      let nextIndex = currentIndex;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextRowIndex = indexInSection + currentSection.itemsPerRow;

          if (nextRowIndex <= currentSection.items.length - 1) {
            // Next row in current section
            nextIndex =
              currentSection.startIndex +
              Math.min(nextRowIndex, currentSection.items.length - 1);
          } else {
            // Move to next section if exists
            const nextSectionIdx =
              gridSections.findIndex((s) => s === currentSection) + 1;
            if (nextSectionIdx < gridSections.length) {
              const nextSection = gridSections[nextSectionIdx];
              // Try to maintain column, but clamp to available items
              nextIndex =
                nextSection.startIndex +
                Math.min(col, nextSection.items.length - 1);
            }
            // Otherwise stay at current position
          }
          break;
        }

        case 'ArrowUp': {
          e.preventDefault();
          const prevRowIndex = indexInSection - currentSection.itemsPerRow;

          if (prevRowIndex >= 0) {
            // Previous row in current section
            nextIndex = currentSection.startIndex + prevRowIndex;
          } else {
            // Move to previous section if exists
            const prevSectionIdx =
              gridSections.findIndex((s) => s === currentSection) - 1;
            if (prevSectionIdx >= 0) {
              const prevSection = gridSections[prevSectionIdx];
              // Go to last row of previous section, maintaining column
              const lastRow = Math.floor(
                (prevSection.items.length - 1) / prevSection.itemsPerRow,
              );
              const targetIndex = lastRow * prevSection.itemsPerRow + col;
              nextIndex =
                prevSection.startIndex +
                Math.min(targetIndex, prevSection.items.length - 1);
            } else {
              // At first section, return focus to input - handled by component
              return;
            }
          }
          break;
        }

        case 'ArrowRight':
          e.preventDefault();
          if (
            col < currentSection.itemsPerRow - 1 &&
            indexInSection < currentSection.items.length - 1
          ) {
            nextIndex = currentIndex + 1;
          }
          // Otherwise stay at edge
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (col > 0) {
            nextIndex = currentIndex - 1;
          }
          // Otherwise stay at edge
          break;

        case 'Escape':
          e.preventDefault();
          onClose();
          return;

        case 'Enter':
          e.preventDefault();
          const allItems = gridSections.flatMap((s) => s.items);
          onSelect(allItems[currentIndex]);
          return;
      }

      if (nextIndex !== currentIndex) {
        focusItem(nextIndex);
      }
    },
    [gridSections, focusItem, onSelect, onClose],
  );

  // Reset focus when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(null);
    }
  }, [isOpen]);

  return {
    focusedIndex,
    itemRefs,
    sectionRefs,
    gridSections,
    handleInputKeyDown,
    handleItemKeyDown,
  };
};
