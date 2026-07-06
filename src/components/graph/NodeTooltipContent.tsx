/**
 * NodeTooltipContent
 * The peek surface for a hovered graph node: thumbnail + label.
 */

import type { GraphNode } from '@/types';
import { LoadedImage } from '@/lib/image';
import { Skeleton } from '@/components/ui/Skeleton';
import getProductImagePath from '@/utils/imageHelper';

export function NodeTooltipContent({ node }: { node: GraphNode }) {
  const { payload } = node;

  // Super-nodes (collapsed SCCs) have no product image / single label yet.
  if (payload.type === 'scc') return null;

  // payload is now narrowed to product | recipe. Access through `payload.data`
  // (NOT a hoisted `data`) so each branch keeps its discriminant.
  const label =
    payload.type === 'product' ? payload.data.name : payload.data.displayName;
  if (!label) return null;

  const className = payload.data.className; // both variants have className

  return (
    <div className='flex items-center gap-2 rounded-xl border bg-white/80 px-3 py-2 text-sm shadow-sm backdrop-blur-sm'>
      <LoadedImage
        src={getProductImagePath(className)}
        alt={label}
        active
        placeholder={<Skeleton className='h-8 w-8 rounded' />}
        className='h-8 w-8 rounded object-contain'
      />
      <span className='font-medium'>{label}</span>
    </div>
  );
}
