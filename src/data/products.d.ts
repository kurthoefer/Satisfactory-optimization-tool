// Type declarations for product JSON imports (necessary for ts to interact with JSON correctly)

import type { ProductSchema, ProductsByCategorySchema } from '@/types';

declare module '@/data/products.json' {
  const products: ProductsByCategorySchema;
  export default products;
}

declare module '@/data/products-flat.json' {
  const products: ProductSchema[];
  export default products;
}
