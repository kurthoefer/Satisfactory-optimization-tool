import { useMemo, useState } from 'react';
import { productsByCategory, productCategoryOrder } from '@/data/indexes';
import type { Product } from '@/types';

export type ProductStatus = 'selectable' | 'filtered-out' | 'wiki-only';

export interface SelectorProduct {
  product: Product;
  status: ProductStatus;
}

export interface SelectorCategory {
  name: string;
  products: SelectorProduct[];
}

interface UseProductSelectorResult {
  categories: SelectorCategory[];
  query: string;
  setQuery: (q: string) => void;
}

export function useProductSelector(
  maxTier: number | null,
): UseProductSelectorResult {
  const [query, setQuery] = useState('');

  const categories = useMemo(() => {
    const q = query.toLowerCase();

    return productCategoryOrder.flatMap((categoryName) => {
      const products = productsByCategory[categoryName] ?? [];

      const filtered = products
        .filter((p) => !q || p.name.toLowerCase().includes(q))
        .map(
          (p): SelectorProduct => ({
            product: p,
            status:
              maxTier !== null && p.tier > maxTier
                ? 'filtered-out'
                : 'selectable',
          }),
        );

      if (filtered.length === 0) return [];

      return [{ name: categoryName, products: filtered }];
    });
  }, [query, maxTier]);

  return { categories, query, setQuery };
}
