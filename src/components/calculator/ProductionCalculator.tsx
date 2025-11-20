import { useState, useMemo } from 'react';
import type { RecipeIndex, ProcessedRecipe } from '../../types';
import {
  getAllProductionCombinations,
  type ProductionCombination,
} from '../../utils/recipeCombinations';

interface ProductionCalculatorProps {
  recipeIndex: RecipeIndex;
  recipes: ProcessedRecipe[];
}

export default function ProductionCalculator({
  recipeIndex,
  recipes,
}: ProductionCalculatorProps) {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedCombination, setSelectedCombination] =
    useState<ProductionCombination | null>(null);

  // Get list of all producible products for dropdown
  const productList = useMemo(() => {
    const products = new Map<string, string>();

    recipes.forEach((recipe) => {
      recipe.products.forEach((product) => {
        if (!products.has(product.item)) {
          products.set(
            product.item,
            recipe.name.split(' ').slice(0, -1).join(' ') || recipe.name
          );
        }
      });
    });

    return Array.from(products.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, [recipes]);

  // Generate combinations when product is selected
  const combinations = useMemo(() => {
    if (!selectedProduct) return [];
    return getAllProductionCombinations(selectedProduct, recipeIndex);
  }, [selectedProduct, recipeIndex]);

  // Group combinations by raw materials
  const groupedCombinations = useMemo(() => {
    const groups = new Map<string, ProductionCombination[]>();

    combinations.forEach((combo) => {
      // Create a unique key from sorted raw materials
      const rawMaterialsKey = [...combo.rawMaterials].sort().join('|');

      if (!groups.has(rawMaterialsKey)) {
        groups.set(rawMaterialsKey, []);
      }
      groups.get(rawMaterialsKey)!.push(combo);
    });

    return Array.from(groups.entries()).map(([key, combos]) => ({
      rawMaterials: combos[0].rawMaterials,
      combinations: combos,
    }));
  }, [combinations]);

  const handleProductSelect = (productClassName: string) => {
    setSelectedProduct(productClassName);
    setSelectedCombination(null);
  };

  const handleCombinationSelect = (combo: ProductionCombination) => {
    setSelectedCombination(combo);
  };

  return (
    <div className='production-calculator'>
      {/* Step 1: Product Selection /*
.production-tree {
  background: #1a1a1a;
  padding: 1.5rem;
  border-radius: 4px;
  border: 1px solid #444;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #ddd;
  margin-bottom: 2rem;
}

.production-tree::-webkit-scrollbar {
  height: 8px;
}

.production-tree::-webkit-scrollbar-track {
  background: #0a0a0a;
}

.production-tree::-webkit-scrollbar-thumb {
  background: #ff6b35;
  border-radius: 4px;
}
*/}
      <section className='product-selection'>
        <h2>What do you want to produce?</h2>
        <select
          value={selectedProduct}
          onChange={(e) => handleProductSelect(e.target.value)}
          className='product-select'
        >
          <option value=''>Select a product...</option>
          {productList.map(([className, name]) => (
            <option
              key={className}
              value={className}
            >
              {name}
            </option>
          ))}
        </select>
      </section>

      {/* Step 2: Show Recipe Combinations grouped by raw materials */}
      {selectedProduct && groupedCombinations.length > 0 && (
        <section>
          <h2 className='text-2xl mb-4'>
            Recipe Combinations ({combinations.length} total)
          </h2>

          {groupedCombinations.map((group, groupIndex) => (
            <div
              key={group.rawMaterials.join('|')}
              className='mb-4 p-4 bg-gray-800 rounded border border-gray-700'
            >
              <div className='flex justify-between mb-4 pb-4 border-b border-gray-700'>
                <div>
                  <h3 className='text-xl'>Resource Group {groupIndex + 1}</h3>
                  <p className='text-sm text-gray-400'>
                    {group.combinations.length} variation
                    {group.combinations.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className='p-3 bg-gray-900 rounded border border-gray-600'>
                  <strong className='block mb-2'>Raw Materials:</strong>
                  {group.rawMaterials.map((material) => (
                    <div
                      key={material}
                      className='text-sm'
                    >
                      • {material.replace('Desc_', '').replace('_C', '')}
                    </div>
                  ))}
                </div>
              </div>

              <div className='grid grid-cols-3 gap-4'>
                {group.combinations.map((combo, index) => (
                  <CombinationCard
                    key={combo.id}
                    combination={combo}
                    index={index}
                    isSelected={selectedCombination?.id === combo.id}
                    onSelect={() => handleCombinationSelect(combo)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Step 3: Show Selected Combination Details */}
      {selectedCombination && (
        <section className='mt-8 p-4 bg-gray-800 rounded'>
          <h2 className='text-2xl mb-4'>Production Details</h2>
          <CombinationDetails combination={selectedCombination} />
        </section>
      )}
    </div>
  );
}

// ============================================
// Combination Card Component
// ============================================

interface CombinationCardProps {
  combination: ProductionCombination;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

function CombinationCard({
  combination,
  index,
  isSelected,
  onSelect,
}: CombinationCardProps) {
  const usesAlternates = Object.values(combination.recipePath).some(
    (r) => r.alternate
  );

  return (
    <div
      className={`p-4 bg-gray-800 border rounded cursor-pointer ${
        isSelected ? 'border-orange-500' : 'border-gray-600'
      }`}
      onClick={onSelect}
    >
      <div className='flex justify-between mb-2'>
        <h3>Option {index + 1}</h3>
        {usesAlternates && (
          <span className='px-2 py-1 bg-orange-500 rounded text-xs'>
            Alternates
          </span>
        )}
      </div>

      <div className='text-sm text-gray-400'>
        {combination.recipeChain.length} steps
      </div>
    </div>
  );
}

// ============================================
// Combination Details Component
// ============================================

interface CombinationDetailsProps {
  combination: ProductionCombination;
}

function CombinationDetails({ combination }: CombinationDetailsProps) {
  return (
    <div>
      <h3 className='text-xl mb-4'>Production Tree</h3>
      <pre className='p-4 bg-gray-900 rounded border border-gray-600 overflow-x-auto'>
        {buildProductionTreeText(combination)}
      </pre>

      <h3 className='text-xl mt-8 mb-4'>Production Chain</h3>
      <div>
        {combination.recipeChain.map((step, index) => (
          <div
            key={`${step.product}_${index}`}
            className='flex gap-4 mb-4 p-4 bg-gray-900 rounded'
          >
            <div className='w-8 h-8 bg-orange-500 rounded flex items-center justify-center'>
              {index + 1}
            </div>
            <div className='flex-1'>
              <h4 className='text-lg mb-2'>
                {step.productName}
                {step.recipe.alternate && (
                  <span className='text-orange-500 text-sm ml-2'>(Alt)</span>
                )}
              </h4>
              <p className='text-sm text-gray-400 mb-4'>
                {step.recipe.machineType
                  .replace('Desc_', '')
                  .replace('Mk1_C', '')}
              </p>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <strong className='block mb-2'>Inputs:</strong>
                  <ul>
                    {step.recipe.ingredients.map((ing) => (
                      <li
                        key={ing.item}
                        className='text-sm text-gray-400'
                      >
                        {ing.item.replace('Desc_', '').replace('_C', '')} (×
                        {ing.amount})
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong className='block mb-2'>Outputs:</strong>
                  <ul>
                    {step.recipe.products.map((prod) => (
                      <li
                        key={prod.item}
                        className='text-sm text-gray-400'
                      >
                        {prod.item.replace('Desc_', '').replace('_C', '')} (×
                        {prod.amount})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to build ASCII tree
function buildProductionTreeText(combination: ProductionCombination): string {
  const { targetProduct, recipePath, rawMaterials } = combination;
  const lines: string[] = [];
  const processed = new Set<string>();

  function buildTree(
    item: string,
    prefix: string = '',
    isLast: boolean = true
  ) {
    if (processed.has(item)) {
      lines.push(
        `${prefix}${isLast ? '└── ' : '├── '}${cleanName(item)} [already shown]`
      );
      return;
    }

    processed.add(item);
    const recipe = recipePath[item];

    if (!recipe) {
      // Raw material
      lines.push(
        `${prefix}${isLast ? '└── ' : '├── '}🔷 ${cleanName(item)} (raw)`
      );
      return;
    }

    // Show the item being produced
    const alt = recipe.alternate ? ' [ALT]' : '';
    lines.push(
      `${prefix}${isLast ? '└── ' : '├── '}📦 ${cleanName(item)}${alt}`
    );

    const newPrefix = prefix + (isLast ? '    ' : '│   ');
    const ingredients = recipe.ingredients;

    ingredients.forEach((ing, index) => {
      const isLastIng = index === ingredients.length - 1;
      buildTree(ing.item, newPrefix, isLastIng);
    });
  }

  lines.push(`🎯 TARGET: ${cleanName(targetProduct)}`);
  lines.push('');
  buildTree(targetProduct, '', true);

  return lines.join('\n');
}

function cleanName(itemClass: string): string {
  return itemClass
    .replace('Desc_', '')
    .replace('_C', '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

// ============================================
// Basic CSS (add to src/styles/calculator.css)
// ============================================

/*
.production-calculator {
  max-width: 1200px;
  margin: 0 auto;
}

.product-selection {
  background: #2a2a2a;
  padding: 2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.product-select {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 2px solid #444;
  border-radius: 4px;
  background: #1a1a1a;
  color: #fff;
  margin-top: 1rem;
}

.combinations-section {
  margin-bottom: 2rem;
}

.combinations-hint {
  color: #aaa;
  margin-bottom: 1rem;
}

.combinations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.combination-card {
  background: #2a2a2a;
  border: 2px solid #444;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.combination-card:hover {
  border-color: #ff6b35;
  transform: translateY(-2px);
}

.combination-card.selected {
  border-color: #ff6b35;
  background: #333;
}

.combination-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.alternate-badge {
  background: #ff6b35;
  color: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.raw-materials ul {
  list-style: none;
  padding-left: 0;
}

.raw-materials li {
  padding: 0.25rem 0;
  color: #ddd;
}

.combination-stats {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #444;
  color: #aaa;
  font-size: 0.9rem;
}

.combination-details {
  background: #2a2a2a;
  padding: 2rem;
  border-radius: 8px;
}

.recipe-chain {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.recipe-step {
  display: flex;
  gap: 1rem;
  background: #1a1a1a;
  padding: 1rem;
  border-radius: 4px;
  border-left: 3px solid #ff6b35;
}

.step-number {
  background: #ff6b35;
  color: #fff;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.alt-tag {
  color: #ff6b35;
  font-size: 0.9rem;
  margin-left: 0.5rem;
}

.machine-type {
  color: #aaa;
  font-size: 0.9rem;
  margin: 0.5rem 0;
}

.recipe-io {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
}

.recipe-io ul {
  list-style: none;
  padding-left: 0;
  margin-top: 0.5rem;
}

.recipe-io li {
  padding: 0.25rem 0;
  color: #ddd;
  font-size: 0.9rem;
}
*/
