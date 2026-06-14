import { useRef } from 'react';
import type { Product } from '@/types';
import { LoadedImage } from '@/lib/image';
import { getTierTokens } from '@/styles/designTokens';
import getProductImagePath from '@/utils/imageHelper';
import { cn } from '@/utils/cn';
import { useInView } from './useInView';

interface ProductTileProps {
  product: Product;
  selected?: boolean;
  focused?: boolean; // roving-tabindex focus, owned by the grid's keyboard nav
  disabled?: boolean; // e.g. gated by the active maxTier filter
  onSelect: (product: Product) => void;
}

export function ProductTile({
  product,
  selected = false,
  focused = false,
  disabled = false,
  onSelect,
}: ProductTileProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const inView = useInView(ref); // grid-owned shared observer (stubbed for now)
  const tier = getTierTokens(product.tier);

  // Same call as SelectedProductDisplay → same URL → selecting a tile hits a
  // warm cache and the selected display paints instantly, no skeleton.
  const src = getProductImagePath(product.className);

  return (
    <button
      ref={ref}
      type='button'
      // Deliberately NOT using native `disabled`: that would drop the tile out
      // of keyboard navigation and suppress the title tooltip. aria-disabled +
      // a click guard keeps it navigable and lets the "Requires tier" hint show.
      aria-disabled={disabled || undefined}
      tabIndex={focused ? 0 : -1}
      title={disabled ? `Requires tier ${product.tier}` : undefined}
      onClick={() => {
        if (!disabled) onSelect(product);
      }}
      className={cn(
        'flex flex-col items-center gap-1 p-2 rounded',
        'bg-neutral-800/60 border-2 transition-colors',
        tier.border,
        !disabled && 'cursor-pointer hover:bg-neutral-700/60',
        selected && 'ring-2 ring-white',
        focused && !selected && 'ring-2 ring-neutral-400',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <LoadedImage
        src={src}
        alt={product.name}
        active={inView}
        className='w-12 h-12 object-contain'
        // No explicit placeholder: LoadedImage defaults to <Skeleton> sized by
        // this className. Tune skeleton *appearance* once, in Skeleton.tsx.
      />
      <span className='w-full text-xs text-center text-neutral-200 truncate'>
        {product.name}
      </span>
    </button>
  );
}
