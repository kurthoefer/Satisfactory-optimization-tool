import type {
  ProcessedRecipe,
  RecipeIndex,
  CircularAnalysis,
} from '../types/index-old';
import { isBaseResource, isCircularRisk } from './recipeProcessor';

export interface RecipePath {
  [itemClassName: string]: ProcessedRecipe;
}

export interface CircularEdge {
  from: string; // Item that needs this ingredient
  to: string; // Item that appears earlier in the chain (creates the loop)
  recipeUsing: string; // The recipe className that uses this circular ingredient
}

export interface ProductionCombination {
  id: string;
  targetProduct: string;
  recipePath: RecipePath;
  rawMaterials: string[];
  circularEdges: CircularEdge[];
  recipeChain: Array<{
    product: string;
    productName: string;
    recipe: ProcessedRecipe;
  }>;
}

// Configuration
const MAX_COMBINATIONS = 1000;
const MAX_DEPTH = 20;

// Memoization cache: stores results for item+context combinations
// Key format: "itemClassName|treatIngotsAsRaw|pathStackHash"
const memoCache = new Map<string, RecipeResult[]>();

// Helper to create cache key
function getCacheKey(
  itemClassName: string,
  treatIngotsAsRaw: boolean,
  pathStack: string[]
): string {
  // Include pathStack to detect circular contexts
  const pathHash = pathStack.join('→');
  return `${itemClassName}|${treatIngotsAsRaw}|${pathHash}`;
}

// Helper to clear cache (call this when starting a new product calculation)
function clearMemoCache() {
  memoCache.clear();
}

interface RecipeResult {
  path: RecipePath;
  circulars: CircularEdge[];
}

/**
 * Recursively find all recipe combinations for a target product
 * Now tracks circular dependencies as features, not bugs!
 */
function generateRecipeCombinations(
  itemClassName: string,
  recipeIndex: RecipeIndex,
  circularAnalysis: CircularAnalysis,
  treatIngotsAsRaw: boolean = false,
  currentPath: RecipePath = {},
  pathStack: string[] = [],
  circularEdges: CircularEdge[] = [],
  depth: number = 0,
  combinationCount: { count: number } = { count: 0 }
): RecipeResult[] {
  // Check memoization cache first
  const cacheKey = getCacheKey(itemClassName, treatIngotsAsRaw, pathStack);
  if (memoCache.has(cacheKey)) {
    const cached = memoCache.get(cacheKey)!;
    if (depth <= 3) {
      console.log(
        `${'  '.repeat(depth)}💾 CACHE HIT for ${itemClassName} (${
          cached.length
        } results)`
      );
    }
    return cached;
  }

  // Debug logging for root level and first few depths
  if (depth <= 3) {
    console.log(`${'  '.repeat(depth)}🌱 [depth ${depth}] ${itemClassName}`);
  }

  // FIRST: Check if this is a base resource (ore, water, etc.)
  if (isBaseResource(itemClassName)) {
    if (depth <= 3)
      console.log(`${'  '.repeat(depth)}  ✓ ${itemClassName} is base resource`);
    return [{ path: currentPath, circulars: circularEdges }];
  }

  // Check if this is an ingot and user wants to treat them as raw
  if (treatIngotsAsRaw && itemClassName.includes('Ingot')) {
    if (depth <= 3)
      console.log(
        `${'  '.repeat(depth)}  ✓ ${itemClassName} is ingot (treated as raw)`
      );
    return [{ path: currentPath, circulars: circularEdges }];
  }

  // SECOND: Check for circular dependency in current path
  if (pathStack.includes(itemClassName)) {
    if (depth <= 3)
      console.log(`${'  '.repeat(depth)}  🔄 ${itemClassName} is CIRCULAR`);
    const indexInPath = pathStack.indexOf(itemClassName);
    const circularTo = pathStack[indexInPath];
    const circularFrom = pathStack[pathStack.length - 1];

    const recipeUsing = currentPath[circularFrom]?.className || circularFrom;

    const newCircularEdge: CircularEdge = {
      from: circularFrom,
      to: circularTo,
      recipeUsing: recipeUsing,
    };

    if (!isCircularRisk(itemClassName)) {
      console.info(
        `🔄 Circular production detected: ${circularFrom} → ${circularTo} (via ${recipeUsing})`
      );
    }

    return [
      { path: currentPath, circulars: [...circularEdges, newCircularEdge] },
    ];
  }

  // THIRD: Check if no recipes exist
  const availableRecipes = recipeIndex[itemClassName] || [];
  if (availableRecipes.length === 0) {
    if (depth <= 3)
      console.log(
        `${'  '.repeat(depth)}  ✗ ${itemClassName} has no recipes available!`
      );
    return [{ path: currentPath, circulars: circularEdges }];
  }

  // FILTER OUT CIRCULAR RECIPES (Tarjan's algorithm results)
  const nonCircularRecipes = availableRecipes.filter(
    (recipe) => !circularAnalysis.circularRecipes.has(recipe.className)
  );

  // If all recipes are circular, use the first one but mark it
  const recipesToUse =
    nonCircularRecipes.length > 0 ? nonCircularRecipes : [availableRecipes[0]];

  if (depth <= 3) {
    const filtered = availableRecipes.length - recipesToUse.length;
    if (filtered > 0) {
      console.log(
        `${'  '.repeat(
          depth
        )}  🚫 Filtered ${filtered} circular recipes for ${itemClassName}`
      );
    }
    console.log(
      `${'  '.repeat(depth)}  📋 ${itemClassName} has ${
        recipesToUse.length
      } non-circular recipes`
    );
  }

  // Safety: Limit recursion depth
  if (depth > MAX_DEPTH) {
    console.warn(`Max depth reached for ${itemClassName} at depth ${depth}`);
    return [{ path: currentPath, circulars: circularEdges }];
  }

  // Safety: Limit total combinations
  if (combinationCount.count > MAX_COMBINATIONS) {
    if (depth <= 3) {
      console.warn(
        `${'  '.repeat(depth)}  ⚠️ ALREADY AT MAX (${
          combinationCount.count
        }), returning empty for ${itemClassName}`
      );
    }
    return [];
  }

  if (depth <= 3) {
    console.log(
      `${'  '.repeat(depth)}  🎲 Current combo count: ${
        combinationCount.count
      }/${MAX_COMBINATIONS}`
    );
  }

  const allCombinations: RecipeResult[] = [];
  const newPathStack = [...pathStack, itemClassName];

  // Try each available recipe for this item
  for (const recipe of recipesToUse) {
    const newPath = { ...currentPath, [itemClassName]: recipe };
    const ingredients = recipe.ingredients.map((ing) => ing.item);

    if (depth === 0) {
      console.log(
        `    Recipe: ${recipe.name}, ingredients: ${ingredients.length}`
      );
    }

    if (ingredients.length === 0) {
      // No ingredients needed
      allCombinations.push({ path: newPath, circulars: circularEdges });
      combinationCount.count++;
      continue;
    }

    // Recursively generate combinations for each ingredient
    const ingredientCombinations: RecipeResult[][] = ingredients.map(
      (ingredient, idx) => {
        const result = generateRecipeCombinations(
          ingredient,
          recipeIndex,
          circularAnalysis,
          treatIngotsAsRaw,
          newPath,
          newPathStack,
          circularEdges,
          depth + 1,
          combinationCount
        );
        if (depth <= 2) {
          console.log(
            `${'  '.repeat(depth)}      Ingredient ${idx} (${ingredient}): ${
              result.length
            } results`
          );
        }
        return result;
      }
    );

    if (depth === 0) {
      console.log(
        `    Ingredient combos generated: ${ingredientCombinations
          .map((ic) => ic.length)
          .join(', ')}`
      );
    }

    // Combine all ingredient combinations (cartesian product)
    const combinedResults = cartesianProductWithCirculars(
      ingredientCombinations
    );

    if (depth <= 2) {
      console.log(
        `${'  '.repeat(depth)}      Combined results from cart product: ${
          combinedResults.length
        }`
      );
    }

    // Check if we're exceeding limits
    if (combinationCount.count + combinedResults.length > MAX_COMBINATIONS) {
      const remaining = MAX_COMBINATIONS - combinationCount.count;
      allCombinations.push(...combinedResults.slice(0, remaining));
      combinationCount.count = MAX_COMBINATIONS;
      break;
    }

    allCombinations.push(...combinedResults);
    combinationCount.count += combinedResults.length;
  }

  if (depth <= 3) {
    console.log(
      `${'  '.repeat(depth)}  📦 Returning ${
        allCombinations.length
      } combos for ${itemClassName}`
    );
  }

  // Store in cache before returning
  memoCache.set(cacheKey, allCombinations);

  return allCombinations;
}

/**
 * Cartesian product that also merges circular edges
 */
function cartesianProductWithCirculars(
  arrays: RecipeResult[][]
): RecipeResult[] {
  if (arrays.length === 0) return [{ path: {}, circulars: [] }];
  if (arrays.length === 1) return arrays[0];

  const result: RecipeResult[] = [];
  const [first, ...rest] = arrays;
  const restProduct = cartesianProductWithCirculars(rest);

  for (const firstItem of first) {
    for (const restItem of restProduct) {
      result.push({
        path: { ...firstItem.path, ...restItem.path },
        circulars: [...firstItem.circulars, ...restItem.circulars],
      });
    }
  }

  return result;
}

/**
 * Extract raw materials from a recipe path
 */
function extractRawMaterials(
  recipePath: RecipePath,
  recipeIndex: RecipeIndex,
  treatIngotsAsRaw: boolean = false
): string[] {
  const rawMaterials = new Set<string>();

  Object.values(recipePath).forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const itemClass = ingredient.item;
      const hasRecipe = recipeIndex[itemClass]?.length > 0;
      const isIngot = treatIngotsAsRaw && itemClass.includes('Ingot');

      if (!hasRecipe || isBaseResource(itemClass) || isIngot) {
        rawMaterials.add(itemClass);
      }
    });
  });

  return Array.from(rawMaterials);
}

/**
 * Build a readable recipe chain from a path
 */
function buildRecipeChain(
  targetProduct: string,
  recipePath: RecipePath
): Array<{ product: string; productName: string; recipe: ProcessedRecipe }> {
  const chain: Array<{
    product: string;
    productName: string;
    recipe: ProcessedRecipe;
  }> = [];

  function traverse(item: string, visited: Set<string> = new Set()) {
    if (visited.has(item)) return;
    visited.add(item);

    const recipe = recipePath[item];
    if (!recipe) return;

    // First, process all ingredients
    recipe.ingredients.forEach((ing) => traverse(ing.item, visited));

    // Then add this item to the chain
    chain.push({
      product: item,
      productName: recipe.name,
      recipe,
    });
  }

  traverse(targetProduct);
  return chain;
}

/**
 * Generate all production combinations for a target product
 */
export function getAllProductionCombinations(
  targetProduct: string,
  recipeIndex: RecipeIndex,
  circularAnalysis: CircularAnalysis,
  treatIngotsAsRaw: boolean = false
): ProductionCombination[] {
  console.log(
    `🔍 Generating combinations for: ${targetProduct}, treatIngotsAsRaw: ${treatIngotsAsRaw}`
  );

  // Clear memoization cache for new product calculation
  clearMemoCache();
  console.log(`🗑️  Cache cleared for new product calculation`);

  const allResults = generateRecipeCombinations(
    targetProduct,
    recipeIndex,
    circularAnalysis,
    treatIngotsAsRaw
  );

  console.log(`📊 Generated ${allResults.length} raw results`);
  console.log(`💾 Cache size: ${memoCache.size} entries`);

  // Deduplicate paths
  const uniquePaths = new Map<string, RecipeResult>();

  allResults.forEach((result) => {
    const pathId = Object.entries(result.path)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([product, recipe]) => `${product}:${recipe.className}`)
      .join('|');

    if (!uniquePaths.has(pathId)) {
      uniquePaths.set(pathId, result);
    }
  });

  console.log(
    `✅ After deduplication: ${uniquePaths.size} unique combinations`
  );

  return Array.from(uniquePaths.values()).map((result) => {
    const rawMaterials = extractRawMaterials(
      result.path,
      recipeIndex,
      treatIngotsAsRaw
    );
    const recipeChain = buildRecipeChain(targetProduct, result.path);

    const recipeIds = Object.entries(result.path)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([product, recipe]) => `${product}:${recipe.className}`)
      .join('|');

    return {
      id: recipeIds,
      targetProduct,
      recipePath: result.path,
      rawMaterials,
      circularEdges: result.circulars,
      recipeChain,
    };
  });
}

/**
 * Get a human-readable summary of a combination
 */
export function getCombinationSummary(combination: ProductionCombination): {
  totalSteps: number;
  machineTypes: string[];
  uniqueRawMaterials: number;
  usesAlternates: boolean;
  hasCircularProduction: boolean;
  circularCount: number;
} {
  const machineTypes = new Set<string>();
  let usesAlternates = false;

  Object.values(combination.recipePath).forEach((recipe) => {
    machineTypes.add(recipe.machineType);
    if (recipe.alternate) {
      usesAlternates = true;
    }
  });

  return {
    totalSteps: combination.recipeChain.length,
    machineTypes: Array.from(machineTypes),
    uniqueRawMaterials: combination.rawMaterials.length,
    usesAlternates,
    hasCircularProduction: combination.circularEdges.length > 0,
    circularCount: combination.circularEdges.length,
  };
}
