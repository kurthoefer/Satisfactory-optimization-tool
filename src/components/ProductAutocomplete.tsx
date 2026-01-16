import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProductsByCategory, Product } from '@/types';
import { Input } from './ui/Input';
import { Dropdown } from './ui/Dropdown';
import { CategoryHeader } from './ui/CategoryHeader';
import { ProductGrid } from './ui/ProductGrid';
import { ProductTile } from './ui/ProductTile';
// import { buildRecipeTree } from '@/utils/recipeTreeBuilder';

//! testing

import {
  analyzeProduct,
  printAnalysis,
  TEST_PRODUCTS,
} from '@/utils/comboAnalyzer';

// Test a simple product
const rotorAnalysis = analyzeProduct('Desc_Rotor_C');
printAnalysis(rotorAnalysis);

// Test all example products
Object.values(TEST_PRODUCTS)
  .flat()
  .forEach((className) => {
    const analysis = analyzeProduct(className);
    if (analysis) printAnalysis(analysis);
  });

//! testing

import { buildCondensationGraph } from '@/utils/condensationGraph';

// Test Rotor subgraph
const rotorGraph = buildCondensationGraph('Desc_Rotor_C');
console.log('🔬 Rotor Condensation Graph:');
console.log('Stats:', rotorGraph.stats);
console.log('Nodes:', rotorGraph.nodes);
console.log('Edges:', rotorGraph.edges);

// Test full graph (might be big!)
const fullGraph = buildCondensationGraph();
console.log('\n📊 Full Graph Stats:', fullGraph.stats);

//! testing end

interface ProductAutocompleteProps {
  productsByCategory: ProductsByCategory;
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
    {} as ProductsByCategory
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

  const handleProductSelect = (product: Product) => {
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
