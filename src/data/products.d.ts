import type { Product } from '@/types';

declare module '@/data/products-flat.json' {
  const products: Product[];
  export default products;
}
