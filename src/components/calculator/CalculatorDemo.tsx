// src/components/calculator/ProductionCalculator.tsx
import { useState, useMemo } from 'react';
// import { ProcessedRecipe, RecipeIndex } from '../../types';
// import { getAllProductionCombinations, ProductionCombination } from '../../utils/recipeCombinations';
import type { ProcessedRecipe, RecipeIndex } from '../../types';
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

  /***********
   * DEBUG ***
   **********/
  // console.log('ProductionCalculatorProps');
  // console.log('recipeIndex:', recipeIndex);
  // const bauxiteRecipes = recipeIndex['Desc_OreBauxite_C'];
  // console.log('Bauxite recipes:', bauxiteRecipes);
  // const ironOreRecipes = recipeIndex['Desc_OreIron_C'];
  // console.log('Iron ore recipes:', ironOreRecipes);
  // console.log('recipes:', recipes);

  // Get list of all producible products for dropdown
  const productList = useMemo(() => {
    const products = new Map<string, string>();

    recipes.forEach((recipe) => {
      recipe.products.forEach((product) => {
        if (!products.has(product.item)) {
          products.set(
            product.item,
            recipe.name
            // recipe.name.split(' ').slice(0, -1).join(' ') || recipe.name
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

  const handleProductSelect = (productClassName: string) => {
    setSelectedProduct(productClassName);
    setSelectedCombination(null);
    console.log('product selected!');
    console.log('combination selected!');
  };

  const handleCombinationSelect = (combo: ProductionCombination) => {
    setSelectedCombination(combo);
    console.log('combination selected!');
  };

  return (
    <div className='production-calculator'>
      {/* Step 1: Product Selection */}
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

      {/* Step 2: Show Recipe Combinations */}
      {selectedProduct && combinations.length > 0 && (
        <section className='combinations-section'>
          <h2>Recipe Combinations ({combinations.length} options)</h2>
          <p className='combinations-hint'>
            Select a production path to see details
          </p>

          <div className='combinations-grid'>
            {combinations.map((combo, index) => (
              <CombinationCard
                key={combo.id}
                combination={combo}
                index={index}
                isSelected={selectedCombination?.id === combo.id}
                onSelect={() => handleCombinationSelect(combo)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Step 3: Show Selected Combination Details */}
      {selectedCombination && (
        <section className='combination-details'>
          <h2>Production Details</h2>
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
      className={`combination-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className='combination-header'>
        <h3>Option {index + 1}</h3>
        {usesAlternates && (
          <span className='alternate-badge'>Uses Alternates</span>
        )}
      </div>

      <div className='combination-content'>
        <div className='raw-materials'>
          <h4>Raw Materials Required:</h4>
          <ul>
            {combination.rawMaterials.length > 0 ? (
              combination.rawMaterials.map((material) => (
                <li key={material}>
                  {material.replace('Desc_', '').replace('_C', '')}
                </li>
              ))
            ) : (
              <li>None (uses only manufactured items)</li>
            )}
          </ul>
        </div>

        <div className='combination-stats'>
          <span className='stat'>
            {combination.recipeChain.length} production steps
          </span>
        </div>
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
    <div className='details-container'>
      <h3>Production Chain</h3>
      <div className='recipe-chain'>
        {combination.recipeChain.map((step, index) => (
          <div
            key={`${step.product}_${index}`}
            className='recipe-step'
          >
            <div className='step-number'>{index + 1}</div>
            <div className='step-content'>
              <h4>
                {step.productName}
                {step.recipe.alternate && (
                  <span className='alt-tag'>(Alternate)</span>
                )}
              </h4>
              <p className='machine-type'>
                Machine:{' '}
                {step.recipe.machineType
                  .replace('Desc_', '')
                  .replace('Mk1_C', '')}
              </p>

              <div className='recipe-io'>
                <div className='inputs'>
                  <strong>Inputs:</strong>
                  <ul>
                    {step.recipe.ingredients.map((ing) => (
                      <li key={ing.item}>
                        {ing.item.replace('Desc_', '').replace('_C', '')} (×
                        {ing.amount})
                      </li>
                    ))}
                  </ul>
                </div>
                <div className='outputs'>
                  <strong>Outputs:</strong>
                  <ul>
                    {step.recipe.products.map((prod) => (
                      <li key={prod.item}>
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
