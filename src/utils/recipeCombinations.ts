import type { ProcessedRecipe, RecipeIndex } from '../types';
import { isBaseResource } from './recipeProcessor';

export interface RecipePath {
  [itemClassName: string]: ProcessedRecipe;
}

export interface ProductionCombination {
  id: string; // Unique identifier for this combination
  targetProduct: string;
  recipePath: RecipePath; // Map of item -> selected recipe
  rawMaterials: string[]; // List of unique raw material classNames
  recipeChain: Array<{
    product: string;
    productName: string;
    recipe: ProcessedRecipe;
  }>;
}

// Configuration
const MAX_COMBINATIONS = 1000; // Limit total combinations
const MAX_DEPTH = 20; // Limit recursion depth

/**
 * Recursively find all recipe combinations for a target product
 */
function generateRecipeCombinations(
  itemClassName: string,
  recipeIndex: RecipeIndex,
  currentPath: RecipePath = {},
  pathStack: string[] = [], // Track full path for circular detection
  depth: number = 0,
  combinationCount: { count: number } = { count: 0 }
): RecipePath[] {
  // FIRST: Check if this is a base resource (ore, water, etc.)
  // Stop recursion immediately - treat as "always available"
  if (isBaseResource(itemClassName)) {
    return [currentPath];
  }

  // SECOND: Check if no recipes exist (raw material with no production method)
  const availableRecipes = recipeIndex[itemClassName] || [];
  if (availableRecipes.length === 0) {
    return [currentPath];
  }

  // THIRD: Check for circular dependency in current path
  if (pathStack.includes(itemClassName)) {
    console.warn(
      `Circular dependency detected: ${[...pathStack, itemClassName].join(
        ' → '
      )}`
    );
    return [currentPath];
  }

  // Safety: Limit recursion depth
  if (depth > MAX_DEPTH) {
    console.warn(`Max depth reached for ${itemClassName} at depth ${depth}`);
    return [currentPath];
  }

  // Safety: Limit total combinations
  if (combinationCount.count > MAX_COMBINATIONS) {
    return [];
  }

  const allCombinations: RecipePath[] = [];
  const newPathStack = [...pathStack, itemClassName];

  // Try each available recipe for this item
  for (const recipe of availableRecipes) {
    const newPath = { ...currentPath, [itemClassName]: recipe };

    // Get all ingredients for this recipe
    const ingredients = recipe.ingredients.map((ing) => ing.item);

    if (ingredients.length === 0) {
      // No ingredients needed, just add this path
      allCombinations.push(newPath);
      combinationCount.count++;
      continue;
    }

    // Recursively generate combinations for each ingredient
    const ingredientCombinations: RecipePath[][] = ingredients.map(
      (ingredient) =>
        generateRecipeCombinations(
          ingredient,
          recipeIndex,
          newPath,
          newPathStack,
          depth + 1,
          combinationCount
        )
    );

    // Combine all ingredient combinations (cartesian product)
    const combinedPaths = cartesianProduct(ingredientCombinations);

    // Check if we're exceeding limits
    if (combinationCount.count + combinedPaths.length > MAX_COMBINATIONS) {
      const remaining = MAX_COMBINATIONS - combinationCount.count;
      allCombinations.push(...combinedPaths.slice(0, remaining));
      combinationCount.count = MAX_COMBINATIONS;
      break;
    }

    allCombinations.push(...combinedPaths);
    combinationCount.count += combinedPaths.length;
  }

  return allCombinations;
}

/**
 * Helper: Cartesian product of recipe paths
 * Combines multiple arrays of paths into all possible combinations
 */
function cartesianProduct(arrays: RecipePath[][]): RecipePath[] {
  if (arrays.length === 0) return [{}];
  if (arrays.length === 1) return arrays[0];

  const result: RecipePath[] = [];
  const [first, ...rest] = arrays;
  const restProduct = cartesianProduct(rest);

  for (const firstItem of first) {
    for (const restItem of restProduct) {
      result.push({ ...firstItem, ...restItem });
    }
  }

  return result;
}

/**
 * Extract raw materials from a recipe path
 */
function extractRawMaterials(
  recipePath: RecipePath,
  recipeIndex: RecipeIndex
): string[] {
  const rawMaterials = new Set<string>();

  // Find all items that are used as ingredients but have no recipe
  Object.values(recipePath).forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const hasRecipe = recipeIndex[ingredient.item]?.length > 0;
      if (!hasRecipe) {
        rawMaterials.add(ingredient.item);
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

  // Traverse the path and build chain in production order
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
  recipeIndex: RecipeIndex
): ProductionCombination[] {
  const allPaths = generateRecipeCombinations(targetProduct, recipeIndex);

  // Deduplicate paths - some combinations create identical paths
  const uniquePaths = new Map<string, RecipePath>();

  allPaths.forEach((path) => {
    const pathId = Object.entries(path)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([product, recipe]) => `${product}:${recipe.className}`)
      .join('|');

    if (!uniquePaths.has(pathId)) {
      uniquePaths.set(pathId, path);
    }
  });

  return Array.from(uniquePaths.values()).map((path) => {
    const rawMaterials = extractRawMaterials(path, recipeIndex);
    const recipeChain = buildRecipeChain(targetProduct, path);

    // Use the same ID generation for consistency
    const recipeIds = Object.entries(path)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([product, recipe]) => `${product}:${recipe.className}`)
      .join('|');

    return {
      id: recipeIds,
      targetProduct,
      recipePath: path,
      rawMaterials,
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
  };
}
