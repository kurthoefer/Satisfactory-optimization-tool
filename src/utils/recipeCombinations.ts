import type { ProcessedRecipe, RecipeIndex } from '../types';
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
  treatIngotsAsRaw: boolean = false,
  currentPath: RecipePath = {},
  pathStack: string[] = [],
  circularEdges: CircularEdge[] = [],
  depth: number = 0,
  combinationCount: { count: number } = { count: 0 }
): RecipeResult[] {
  // FIRST: Check if this is a base resource (ore, water, etc.)
  if (isBaseResource(itemClassName)) {
    return [{ path: currentPath, circulars: circularEdges }];
  }

  // Check if this is an ingot and user wants to treat them as raw
  if (treatIngotsAsRaw && itemClassName.includes('Ingot')) {
    return [{ path: currentPath, circulars: circularEdges }];
  }

  // SECOND: Check for circular dependency in current path
  if (pathStack.includes(itemClassName)) {
    // This is a circular reference! Track it.
    const indexInPath = pathStack.indexOf(itemClassName);
    const circularTo = pathStack[indexInPath];
    const circularFrom = pathStack[pathStack.length - 1]; // The item that needs this circular ingredient

    // Find the recipe that's trying to use this circular ingredient
    const recipeUsing = currentPath[circularFrom]?.className || circularFrom;

    const newCircularEdge: CircularEdge = {
      from: circularFrom,
      to: circularTo,
      recipeUsing: recipeUsing,
    };

    // Log for debugging (optional - can remove if too noisy)
    if (!isCircularRisk(itemClassName)) {
      console.info(
        `🔄 Circular production detected: ${circularFrom} → ${circularTo} (via ${recipeUsing})`
      );
    }

    // Stop recursion but return the path with this circular edge noted
    return [
      { path: currentPath, circulars: [...circularEdges, newCircularEdge] },
    ];
  }

  // THIRD: Check if no recipes exist
  const availableRecipes = recipeIndex[itemClassName] || [];
  if (availableRecipes.length === 0) {
    return [{ path: currentPath, circulars: circularEdges }];
  }

  // Safety: Limit recursion depth
  if (depth > MAX_DEPTH) {
    console.warn(`Max depth reached for ${itemClassName} at depth ${depth}`);
    return [{ path: currentPath, circulars: circularEdges }];
  }

  // Safety: Limit total combinations
  if (combinationCount.count > MAX_COMBINATIONS) {
    console.warn(`Max combo count reached`);
    return [];
  }

  const allCombinations: RecipeResult[] = [];
  const newPathStack = [...pathStack, itemClassName];

  // Try each available recipe for this item
  for (const recipe of availableRecipes) {
    const newPath = { ...currentPath, [itemClassName]: recipe };
    const ingredients = recipe.ingredients.map((ing) => ing.item);

    if (ingredients.length === 0) {
      // No ingredients needed
      allCombinations.push({ path: newPath, circulars: circularEdges });
      combinationCount.count++;
      continue;
    }

    // Recursively generate combinations for each ingredient
    const ingredientCombinations: RecipeResult[][] = ingredients.map(
      (ingredient) =>
        generateRecipeCombinations(
          ingredient,
          recipeIndex,
          treatIngotsAsRaw,
          newPath,
          newPathStack,
          circularEdges,
          depth + 1,
          combinationCount
        )
    );

    // Combine all ingredient combinations (cartesian product)
    const combinedResults = cartesianProductWithCirculars(
      ingredientCombinations
    );

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
  treatIngotsAsRaw: boolean = false
): ProductionCombination[] {
  const allResults = generateRecipeCombinations(
    targetProduct,
    recipeIndex,
    treatIngotsAsRaw
  );

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
