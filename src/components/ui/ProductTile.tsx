import { forwardRef } from 'react';
import type { Product } from '@/types';
import getProductImagePath from '@/utils/imageHelper';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

interface ProductTileProps {
  product: Product;
  onClick: (product: Product) => void;
  isSelected?: boolean;
  size?: 64 | 256;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  tabIndex?: number;
}

export const ProductTile = forwardRef<HTMLButtonElement, ProductTileProps>(
  (
    { product, onClick, isSelected = false, size = 64, onKeyDown, tabIndex },
    ref,
  ) => {
    const imagePath = getProductImagePath(product.className, size);

    return (
      <button
        ref={ref}
        onClick={() => onClick(product)}
        onKeyDown={onKeyDown}
        tabIndex={tabIndex}
        className={`
          flex flex-col items-center p-2 rounded-md
          border transition-colors
          ${
            isSelected
              ? 'border-slate-500 bg-slate-100'
              : 'border-transparent hover:bg-slate-50 focus:bg-slate-100 focus:border-slate-500'
          }
          focus:outline-none
        `}
        role='option'
        aria-selected={isSelected}
      >
        <ImageWithFallback
          src={imagePath}
          alt={product.name}
          className='w-full aspect-square mb-1 object-contain'
        />
        <span className='text-xs text-center leading-tight text-slate-900 line-clamp-2'>
          {product.name}
        </span>
      </button>
    );
  },
);

ProductTile.displayName = 'ProductTile';
