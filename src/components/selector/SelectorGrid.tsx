import type { KeyboardEvent, Ref, RefObject } from 'react';
import { GridObserverProvider } from './GridObserver';
import { ProductTile } from './ProductTile';
import { TILE_MIN_WIDTH } from './constants';
import type { Product } from '@/types';

// Structural shape of what useProductSelector returns. If that hook exports a
// named type for its categories, import it here instead of redefining.
interface SelectorItem {
  product: Product;
  status: string; // 'selectable' | ...
}
interface SelectorSection {
  name: string;
  products: SelectorItem[];
}

interface SelectorGridProps {
  categories: SelectorSection[];
  query: string; // for the empty-state message
  /** Scroll container ref — owned by the orchestrator, also the observer root. */
  gridRef: RefObject<HTMLDivElement | null>;
  /** Measurement wrapper from useGridNavigation (true layout width). */
  measureRef: Ref<HTMLDivElement>;
  height: number | string;
  isActive: (sectionIndex: number, itemIndex: number) => boolean;
  registerTile: (
    sectionIndex: number,
    itemIndex: number,
    el: HTMLButtonElement | null,
  ) => void;
  onSelect: (product: Product) => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
}

export function SelectorGrid({
  categories,
  query,
  gridRef,
  measureRef,
  height,
  isActive,
  registerTile,
  onSelect,
  onKeyDown,
}: SelectorGridProps) {
  return (
    <div
      ref={gridRef}
      onKeyDown={onKeyDown}
      style={{ height }}
      className='overflow-y-auto'
    >
      <div className='py-1' />
      {/* One observer for the whole grid, rooted at the scroll container above. */}
      <GridObserverProvider rootRef={gridRef}>
        {/* Measurement wrapper — its width is the true layout width the inner
            grids use for column count; excludes the scrollbar gutter. */}
        <div ref={measureRef}>
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
                {section.products.map((item, itemIndex) => (
                  <ProductTile
                    key={item.product.className}
                    ref={(el) => registerTile(sectionIndex, itemIndex, el)}
                    product={item.product}
                    focused={isActive(sectionIndex, itemIndex)}
                    disabled={item.status !== 'selectable'}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className='px-3 py-6 text-sm text-neutral-500 text-center'>
              No products match "{query}"
            </div>
          )}
        </div>
      </GridObserverProvider>
    </div>
  );
}
