import type { ProductsByCategory } from '@/types';
import ProductAutocomplete from '@/components/ProductAutocomplete';

interface CalculatorSearchProps {
  productsByCategory: ProductsByCategory;
}

export default function CalculatorSearch({
  productsByCategory,
}: CalculatorSearchProps) {
  return (
    <div className='max-w-4xl mx-auto p-8'>
      <h1 className='text-3xl font-bold mb-6'>
        Satisfactory Production Calculator
      </h1>
      <ProductAutocomplete productsByCategory={productsByCategory} />
    </div>
  );
}
