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
          flex flex-col items-center p-3 rounded
          border-2 transition-colors
          ${
            isSelected
              ? 'border-blue-500 bg-blue-100'
              : 'border-transparent hover:bg-blue-50 focus:bg-blue-100 focus:border-blue-500'
          }
          focus:outline-none
        `}
        role='option'
        aria-selected={isSelected}
      >
        <ImageWithFallback
          src={imagePath}
          alt={product.name}
          className='w-16 h-16 mb-2 object-contain'
        />
        <span className='text-sm text-center leading-tight'>
          {product.name}
        </span>
      </button>
    );
  },
);

ProductTile.displayName = 'ProductTile';
