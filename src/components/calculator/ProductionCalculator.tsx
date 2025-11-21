import { useState, useMemo } from 'react';
import type { ProcessedRecipe, RecipeIndex } from '../../types';
import {
  getAllProductionCombinations,
  type ProductionCombination,
} from '../../utils/recipeCombinations';
import { getProducibleItems, getItemDisplayName } from '../../utils/itemNames';

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
  const [treatIngotsAsRaw, setTreatIngotsAsRaw] = useState(false);

  // Get list of all producible products for dropdown
  const productList = useMemo(() => {
    return getProducibleItems(recipeIndex);
  }, [recipeIndex]);

  // Generate combinations when product is selected
  const combinations = useMemo(() => {
    if (!selectedProduct) return [];
    return getAllProductionCombinations(
      selectedProduct,
      recipeIndex,
      treatIngotsAsRaw
    );
  }, [selectedProduct, recipeIndex, treatIngotsAsRaw]);

  // Group combinations by raw materials
  const groupedCombinations = useMemo(() => {
    const groups = new Map<string, ProductionCombination[]>();

    combinations.forEach((combo) => {
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

  const handleIngotToggle = (checked: boolean) => {
    setTreatIngotsAsRaw(checked);
    setSelectedCombination(null);
  };

  return (
    <div className='min-w-screen p-8'>
      {/* Step 1: Product Selection */}
      <section className='mb-8 p-4 bg-gray-800 rounded'>
        <h2 className='text-2xl mb-4'>What do you want to produce?</h2>
        <select
          value={selectedProduct}
          onChange={(e) => handleProductSelect(e.target.value)}
          className='w-full p-2 bg-gray-900 border border-gray-600 rounded'
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

        <button
          onClick={() => handleIngotToggle(!treatIngotsAsRaw)}
          className={`mt-4 px-4 py-2 rounded ${
            treatIngotsAsRaw
              ? 'bg-orange-500 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          {treatIngotsAsRaw ? '✓ ' : ''}Treat ingots as raw materials
        </button>
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
                      • {getItemDisplayName(material)}
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
                {getItemDisplayName(step.recipe.machineType)}
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
                        {getItemDisplayName(ing.item)} (×{ing.amount})
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
                        {getItemDisplayName(prod.item)} (×{prod.amount})
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

function buildProductionTreeText(combination: ProductionCombination): string {
  const { targetProduct, recipePath } = combination;
  const lines: string[] = [];
  const processed = new Set<string>();

  function buildTree(
    item: string,
    prefix: string = '',
    isLast: boolean = true
  ) {
    if (processed.has(item)) {
      lines.push(
        `${prefix}${isLast ? '└── ' : '├── '}${getItemDisplayName(
          item
        )} [already shown]`
      );
      return;
    }

    processed.add(item);
    const recipe = recipePath[item];

    if (!recipe) {
      lines.push(
        `${prefix}${isLast ? '└── ' : '├── '}🔷 ${getItemDisplayName(
          item
        )} (raw)`
      );
      return;
    }

    const alt = recipe.alternate ? ' [ALT]' : '';
    lines.push(
      `${prefix}${isLast ? '└── ' : '├── '}📦 ${getItemDisplayName(item)}${alt}`
    );

    const newPrefix = prefix + (isLast ? '    ' : '│   ');
    const ingredients = recipe.ingredients;

    ingredients.forEach((ing, index) => {
      const isLastIng = index === ingredients.length - 1;
      buildTree(ing.item, newPrefix, isLastIng);
    });
  }

  lines.push(`🎯 TARGET: ${getItemDisplayName(targetProduct)}`);
  lines.push('');
  buildTree(targetProduct, '', true);

  return lines.join('\n');
}
