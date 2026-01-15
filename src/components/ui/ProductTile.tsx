import type { Product } from '@/types';
import getProductImagePath from '@/utils/imageHelper';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

interface ProductTileProps {
  product: Product;
  onClick: (product: Product) => void;
  isSelected?: boolean;
  size?: 64 | 256;
}

export const ProductTile: React.FC<ProductTileProps> = ({
  product,
  onClick,
  isSelected = false,
  size = 64,
}) => {
  const imagePath = getProductImagePath(product.className, size);

  return (
    <button
      onClick={() => onClick(product)}
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
      <span className='text-sm text-center leading-tight'>{product.name}</span>
    </button>
  );
};
