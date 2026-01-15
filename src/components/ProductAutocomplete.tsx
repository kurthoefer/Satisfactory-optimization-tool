import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProductsByCategorySchema, ProductSchema } from '@/types';
import { Input } from './ui/Input';
import { Dropdown } from './ui/Dropdown';
import { CategoryHeader } from './ui/CategoryHeader';
import { ProductGrid } from './ui/ProductGrid';
import { ProductTile } from './ui/ProductTile';

interface ProductAutocompleteProps {
  productsByCategory: ProductsByCategorySchema;
}

export default function ProductAutocomplete({
  productsByCategory,
}: ProductAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Filter products by search term
  const filteredProducts = Object.entries(productsByCategory).reduce(
    (acc, [category, products]) => {
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as ProductsByCategorySchema
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProductSelect = (product: ProductSchema) => {
    navigate(`/calculate/${product.id}`);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className='relative'
    >
      <Input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder='Search for a product...'
      />

      <Dropdown isOpen={isOpen}>
        {Object.entries(filteredProducts).map(([category, products]) => (
          <div key={category}>
            <CategoryHeader>{category}</CategoryHeader>
            <ProductGrid>
              {products.map((product) => (
                <ProductTile
                  key={product.className}
                  product={product}
                  onClick={handleProductSelect}
                />
              ))}
            </ProductGrid>
          </div>
        ))}
      </Dropdown>
    </div>
  );
}
