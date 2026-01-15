import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import allProducts from '@/data/products-flat.json';
import type { ProductSchema } from '@/types';
import getProductImagePath from '@/utils/imageHelper';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

interface CalculatorResultsProps {
  productId: string;
}

export default function CalculatorResults({
  productId,
}: CalculatorResultsProps) {
  const navigate = useNavigate();
  const [targetRate, setTargetRate] = useState(60);

  // Find the product from the productId
  const product = useMemo(() => {
    return allProducts.find((p) => p.id === productId) as
      | ProductSchema
      | undefined;
  }, [productId]);

  // Handle product not found
  // Should never happen ...
  if (!product) {
    return (
      <div className='max-w-6xl mx-auto px-4 py-16 text-center'>
        <div className='bg-red-50 border border-red-200 rounded-lg p-8'>
          <h2 className='text-2xl font-bold text-red-800 mb-2'>
            Product Not Found
          </h2>
          <p className='text-red-600 mb-6'>
            The product "{productId}" doesn't exist in our database.
          </p>
          <button
            onClick={() => navigate('/calculate')}
            className='px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-6xl mx-auto px-4 py-8'>
      {/* Breadcrumb / Back Navigation */}
      <button
        onClick={() => navigate('/calculate')}
        className='flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 group'
      >
        <svg
          className='w-5 h-5 transition-transform group-hover:-translate-x-1'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M10 19l-7-7m0 0l7-7m-7 7h18'
          />
        </svg>
        Back to Search
      </button>

      {/* Product Header */}
      <section className='bg-white rounded-lg shadow p-6 mb-6'>
        <div className='flex items-center gap-4'>
          <ImageWithFallback
            src={getProductImagePath(product.className, 256)}
            alt={product.name}
            className='w-20 h-20 object-contain'
          />
          <div className='flex-1'>
            <h1 className='text-3xl font-bold text-gray-900 mb-1'>
              {product.name}
            </h1>
            <p className='text-gray-600 mb-2'>{product.description}</p>
            <div className='flex gap-4 text-sm'>
              <span className='text-gray-500'>
                <span className='font-medium'>Category:</span>{' '}
                {product.category}
              </span>
              <span className='text-gray-500'>
                <span className='font-medium'>Form:</span> {product.form}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Production Rate Input */}
      <section className='bg-white rounded-lg shadow p-6 mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Production Target</h2>
        <div className='flex items-center gap-4'>
          <label
            htmlFor='target-rate'
            className='text-gray-700 font-medium'
          >
            Target Rate:
          </label>
          <input
            id='target-rate'
            type='number'
            value={targetRate}
            onChange={(e) => setTargetRate(Number(e.target.value))}
            className='px-4 py-2 border-2 border-gray-300 rounded-lg w-32 focus:border-blue-500 focus:outline-none'
            min={1}
          />
          <span className='text-gray-600'>items per minute</span>
        </div>
      </section>

      {/* Recipe Options Section */}
      <section className='bg-white rounded-lg shadow p-6 mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Recipe Options</h2>

        {/* TODO: Replace with actual recipe component */}
        <div className='border-2 border-dashed border-gray-300 rounded-lg p-12 text-center'>
          <p className='text-gray-500 text-lg mb-2'>
            Recipe combinations will appear here
          </p>
          <p className='text-gray-400 text-sm'>
            Use{' '}
            <code className='bg-gray-100 px-2 py-1 rounded'>
              recipeCombinations.ts
            </code>{' '}
            to generate production options
          </p>
          <p className='text-gray-400 text-sm mt-2'>
            Target: {targetRate} {product.name} per minute
          </p>
        </div>
      </section>

      {/* Production Chain Section */}
      <section className='bg-white rounded-lg shadow p-6 mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Production Chain</h2>

        {/* TODO: Replace with production tree visualization */}
        <div className='border-2 border-dashed border-gray-300 rounded-lg p-12 text-center'>
          <p className='text-gray-500 text-lg mb-2'>
            Production tree will appear here
          </p>
          <p className='text-gray-400 text-sm'>
            Visualize ingredient dependencies and machine requirements
          </p>
        </div>
      </section>

      {/* Resource Requirements Section */}
      <section className='bg-white rounded-lg shadow p-6'>
        <h2 className='text-xl font-semibold mb-4'>Resource Requirements</h2>

        {/* TODO: Replace with actual resource breakdown */}
        <div className='border-2 border-dashed border-gray-300 rounded-lg p-12 text-center'>
          <p className='text-gray-500 text-lg mb-2'>
            Raw material requirements will appear here
          </p>
          <p className='text-gray-400 text-sm'>
            Show total ore, water, and other base resources needed
          </p>
        </div>
      </section>
    </div>
  );
}
