/**
 * Search input + scrollable product grid.
 * Opens inline (not a floating dropdown) so the parent controls
 * panel grows and shrinks as a natural side effect.
 *
 * The grid height is user-adjustable via a drag handle.
 * dragDirection controls where the handle sits and which way
 * dragging increases height:
 *   'bottom' — desktop, handle below grid, drag down = taller
 *   'top'    — mobile, handle above grid, drag up = taller
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useProductSelector } from './useProductSelector';
import { useGridNavigation } from './useGridNavigation';
import { useDraggableHeight } from './useDraggableHeight';
import { TILE_MIN_WIDTH } from './constants';
import type { Product } from '@/types';

interface ProductSelectorProps {
  maxTier: number | null;
  onSelect: (product: Product) => void;
  dragDirection?: 'bottom' | 'top';
}

export function ProductSelector({
  maxTier,
  onSelect,
  dragDirection = 'bottom',
}: ProductSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { categories, query, setQuery } = useProductSelector(maxTier);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSelect = useCallback(
    (product: Product) => {
      onSelect(product);
      setQuery('');
      inputRef.current?.blur();
      handleClose();
    },
    [onSelect, handleClose, setQuery, inputRef],
  );

  const { height: gridHeight, handleDragStart } = useDraggableHeight({
    direction: dragDirection,
  });

  const { getRefSetter, isActive, ghostSuffix } = useGridNavigation({
    isOpen,
    sections: categories,
    onSelect: handleSelect,
    onClose: handleClose,
    containerRef,
    inputRef,
    query,
  });

  // Click-outside close
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    }
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, handleClose]);

  const totalCount = categories.reduce((sum, c) => sum + c.products.length, 0);
  const enabledCount = categories.reduce(
    (sum, c) =>
      sum + c.products.filter((p) => p.status === 'selectable').length,
    0,
  );

  const dragHandle = (
    <div
      onPointerDown={handleDragStart}
      className='h-1.5 cursor-ns-resize bg-neutral-800 hover:bg-neutral-600 transition-colors shrink-0 my-1'
      title='Drag to resize'
    />
  );

  return (
    <div ref={containerRef}>
      <div className='relative w-full'>
        {/* Ghost text layer */}
        <div className='absolute inset-0 px-3 pt-2 text-sm pointer-events-none flex items-center'>
          <span className='text-white invisible'>{query}</span>
          <span className='text-neutral-500'>{ghostSuffix}</span>
        </div>
        {/* Search input */}
        <input
          ref={inputRef}
          type='text'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={query ? '' : `Search ${enabledCount} products...`}
          className='w-full mt-2 px-3 py-2 rounded border border-neutral-600 bg-neutral-800 text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400'
        />
      </div>
      {/* Tier info line */}
      {maxTier !== null && (
        <div className='mt-2 text-xs text-neutral-400'>
          {enabledCount} of {totalCount} available at tier {maxTier}
        </div>
      )}

      {/* Inline grid */}
      {isOpen && (
        <>
          {dragDirection === 'top' && dragHandle}

          <div
            style={{ height: gridHeight }}
            className='overflow-y-auto'
          >
            <div className='py-1' />
            {categories.map((section, sectionIndex) => (
              <div key={section.name}>
                <div className='py-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider sticky top-0 bg-neutral-900'>
                  {section.name}
                </div>
                <div
                  className='grid py-2 gap-1'
                  style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${TILE_MIN_WIDTH}px, 1fr))`,
                  }}
                >
                  {section.products.map((item, itemIndex) => {
                    const active = isActive(sectionIndex, itemIndex);
                    const disabled = item.status !== 'selectable';

                    return (
                      <button
                        key={item.product.className}
                        ref={getRefSetter(sectionIndex, itemIndex)}
                        onClick={() => !disabled && handleSelect(item.product)}
                        tabIndex={-1}
                        title={
                          disabled
                            ? `Requires tier ${item.product.tier}`
                            : item.product.name
                        }
                        className={`
                          flex flex-col items-center justify-center
                          p-1 rounded text-xs text-center
                          border transition-colors
                          ${active ? 'ring-1 ring-white' : ''}
                          ${
                            disabled
                              ? 'opacity-40 cursor-not-allowed border-neutral-700 text-neutral-500'
                              : 'cursor-pointer border-neutral-600 text-neutral-200 hover:border-neutral-400'
                          }
                        `}
                      >
                        <span className='truncate w-full'>
                          {item.product.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {categories.length === 0 && (
              <div className='px-3 py-6 text-sm text-neutral-500 text-center'>
                No products match "{query}"
              </div>
            )}
          </div>

          {dragDirection === 'bottom' && dragHandle}
        </>
      )}
    </div>
  );
}
