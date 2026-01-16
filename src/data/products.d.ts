// Type declarations for product JSON imports (necessary for ts to interact with JSON correctly)

import type { Product, ProductsByCategory } from '@/types';

declare module '@/data/products.json' {
  const products: ProductsByCategory;
  export default products;
}

declare module '@/data/products-flat.json' {
  const products: Product[];
  export default products;
}
