import type { Product } from '@/types';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import getProductImagePath from '@/utils/imageHelper';
import { getTierTokens } from '@/styles/designTokens';

interface SelectedProductDisplayProps {
  product: Product;
}

export function SelectedProductDisplay({
  product,
}: SelectedProductDisplayProps) {
  const tierTokens = getTierTokens(product.tier);
  return (
    <div
      className={`flex items-center gap-3 py-2 mt-2 rounded bg-neutral-800/60 border border-neutral-700 border-l-2 ${tierTokens.border}`}
    >
      <div className='relative w-10 h-10 pl-3 shrink-0'>
        <ImageWithFallback
          src={getProductImagePath(product.className)}
          alt={product.name}
          className='w-10 h-10 object-contain'
        />
      </div>
      <div className='flex flex-col min-w-0'>
        <span className='text-sm font-semibold text-white truncate'>
          {product.name}
        </span>
        <span className={`text-xs ${tierTokens.muted}`}>
          {product.category} · Tier {product.tier}
        </span>
      </div>
    </div>
  );
}
