/**
 * Main calculator page component
 * Composes search, results, and empty state based on route params
 */

import productsData from '@/data/products.json';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import type { ProductsByCategorySchema } from '@/types';
import CalculatorSearch from './CalculatorSearch';
import CalculatorResults from './CalculatorResults';
import EmptyState from './EmptyState';

export default function Calculator() {
  const { productId } = useParams<{ productId: string }>();
  const [productsByCategory] = useState<ProductsByCategorySchema>(productsData);

  console.log('check out the productId inside of Calculator.tsx:', productId);
  if (!productsByCategory) {
    return <div>Loading...</div>; // Or a proper loading component
  }

  return (
    <div className='min-h-screen'>
      <CalculatorSearch productsByCategory={productsByCategory} />
      {productId ? <CalculatorResults productId={productId} /> : <EmptyState />}
    </div>
  );
}
