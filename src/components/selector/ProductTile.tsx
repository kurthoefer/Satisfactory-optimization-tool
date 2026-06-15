import { forwardRef, useCallback, useRef } from 'react';
import type { Product } from '@/types';
import { LoadedImage } from '@/lib/image';
import { getTierTokens } from '@/styles/designTokens';
import getProductImagePath from '@/utils/imageHelper';
import { cn } from '@/utils/cn';
import { useInView } from './GridObserver';

interface ProductTileProps {
  product: Product;
  focused?: boolean; // the roving-tabindex "current" tile
  disabled?: boolean; // gated by the active maxTier filter
  onSelect: (product: Product) => void;
}

export const ProductTile = forwardRef<HTMLButtonElement, ProductTileProps>(
  function ProductTile(
    { product, focused = false, disabled = false, onSelect },
    forwardedRef,
  ) {
    const localRef = useRef<HTMLButtonElement>(null);
    const inView = useInView(localRef);
    const tier = getTierTokens(product.tier);

    // Same call as SelectedProductDisplay → same URL → selecting a tile lands
    // on a warm cache and the selected display paints with no skeleton.
    const src = getProductImagePath(product.className);

    // One DOM node, two consumers: roving focus (the grid's tileRefs, via the
    // forwarded ref) and lazy-load observation (useInView, via localRef).
    const setRef = useCallback(
      (el: HTMLButtonElement | null) => {
        localRef.current = el;
        if (typeof forwardedRef === 'function') forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      },
      [forwardedRef],
    );

    return (
      <button
        ref={setRef}
        type='button'
        // Not native `disabled`: that would drop the tile out of keyboard nav
        // and suppress the title tooltip. aria-disabled + a click guard keeps
        // it navigable and lets the "Requires tier" hint show.
        aria-disabled={disabled || undefined}
        tabIndex={focused ? 0 : -1}
        title={disabled ? `Requires tier ${product.tier}` : undefined}
        onClick={() => {
          if (!disabled) onSelect(product);
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-1 p-1 rounded text-xs text-center',
          'border-2 transition-colors',
          tier.border,
          !disabled && 'cursor-pointer hover:bg-neutral-700/60',
          focused && 'ring-2 ring-white',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <LoadedImage
          src={src}
          alt={product.name}
          active={inView}
          className='w-12 h-12 object-contain'
        />
        <span className='w-full truncate text-neutral-200'>{product.name}</span>
      </button>
    );
  },
);
