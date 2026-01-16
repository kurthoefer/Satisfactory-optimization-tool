/**
 * Builds a hierarchical tree structure from recipe data for D3 visualization
 * Uses memoization to handle shared subtrees efficiently
 */

import type { RecipesOrganized, Product, TreeNode, Recipe } from '@/types';
import recipesOrganizedData from '@/data/recipes-organized.json';
import productsData from '@/data/products-flat.json';

// Cast JSON imports to proper types
const recipesOrganized = recipesOrganizedData as RecipesOrganized;
const products = productsData as Product[];

/**
 * Recipe option for display and selection
 */
export interface RecipeOption {
  id: string;
  displayName: string;
  machine: string;
  isAlternate: boolean;
  ingredients: {
    className: string;
    name: string;
    amount: number;
  }[];
}

/**
 * Cache for built subtrees to avoid rebuilding shared dependencies
 */
interface SubtreeCache {
  [className: string]: {
    node: TreeNode;
    combinations: number; // Total recipe combinations for this subtree
  };
}

/**
 * Result of building a recipe tree with caching
 */
export interface RecipeTreeResult {
  tree: TreeNode | null;
  cache: SubtreeCache;
  stats: {
    uniqueNodes: number; // Number of unique products in tree
    totalCombinations: number; // Total possible recipe combinations
    maxDepth: number; // Deepest path in tree
    circularNodes: number; // Number of circular dependency nodes
  };
}

/**
 * Calculate significance of a decision based on depth
 */
function calculateSignificance(
  depth: number
): 'critical' | 'moderate' | 'minor' {
  if (depth <= 1) return 'critical';
  if (depth <= 3) return 'moderate';
  return 'minor';
}

/**
 * Convert recipes to RecipeOption format with ingredient details
 */
function buildRecipeOptions(recipes: Recipe[]): RecipeOption[] {
  return recipes.map((recipe) => ({
    id: recipe.id,
    displayName: recipe.displayName,
    machine: recipe.producedIn,
    isAlternate: recipe.isAlternate,
    ingredients: recipe.ingredients.map((ing) => {
      const product = products.find((p) => p.className === ing.className);
      return {
        className: ing.className,
        name: product?.name || ing.className,
        amount: ing.amount,
      };
    }),
  }));
}

/**
 * Builds a recipe tree starting from a target product with memoization
 *
 * @param targetClassName - The className of the product to build tree for (e.g., "Desc_IronIngot_C")
 * @param maxDepth - Maximum depth to traverse (prevents infinite loops)
 * @returns RecipeTreeResult with tree, cache, and statistics
 */
export function buildRecipeTree(
  targetClassName: string,
  maxDepth: number = 5
): RecipeTreeResult {
  const { byProduct, circularRelationships } = recipesOrganized;
  const cache: SubtreeCache = {};

  // Statistics tracking
  let maxDepthReached = 0;
  let circularNodesFound = 0;

  // Helper to get product display name from className
  function getProductName(className: string): string {
    const product = products.find((p) => p.className === className);
    return product?.name || className;
  }

  // Calculate combinations for a node (memoized in cache)
  function calculateCombinations(node: TreeNode): number {
    if (!node.recipes || node.recipes.length === 0) {
      return 1; // Raw resource, one "combination"
    }

    if (!node.children || node.children.length === 0) {
      return node.recipes.length; // Leaf with recipes
    }

    // For each recipe option, multiply combinations of all ingredients
    let totalCombos = 0;
    const numRecipes = node.recipes.length;

    // Each recipe can use any combination of its ingredient recipes
    const childCombos = node.children.map(
      (child) => cache[child.className]?.combinations || 1
    );

    // Multiply child combinations for each recipe option
    const childProduct = childCombos.reduce((a, b) => a * b, 1);
    totalCombos = numRecipes * childProduct;

    return totalCombos;
  }

  // Build a node with caching (memoization)
  function buildNodeCached(
    className: string,
    depth: number,
    visitedInPath: Set<string>
  ): TreeNode {
    // Update max depth stat
    maxDepthReached = Math.max(maxDepthReached, depth);

    // Check if already cached (but still need to track depth for this path)
    if (cache[className]) {
      return cache[className].node;
    }

    const isCircular = circularRelationships.circularItems.includes(className);
    if (isCircular) circularNodesFound++;

    // Get recipes that produce this item
    const recipes = byProduct[className] || [];

    const node: TreeNode = {
      name: getProductName(className),
      className,
      depth,
      isCircular,
      children: [],
      recipes: recipes.map((r) => r.id),

      // NEW FIELDS for D3
      recipeOptions: buildRecipeOptions(recipes),
      selectedRecipe: recipes[0]?.id || '', // Default to first recipe
      decisionWeight: recipes.length,
      significance: calculateSignificance(depth),
    };

    // Stop conditions: max depth or circular reference in current path
    if (depth >= maxDepth || visitedInPath.has(className)) {
      cache[className] = { node, combinations: 1 };
      return node;
    }

    if (recipes.length === 0) {
      // Raw resource (no recipe to produce it)
      cache[className] = { node, combinations: 1 };
      return node;
    }

    // Use first recipe to build the tree structure
    // (All recipes for a product have the same ingredients, just different ratios)
    const recipe = recipes[0];

    // Build children with updated visited set
    const newVisited = new Set(visitedInPath);
    newVisited.add(className);

    node.children = recipe.ingredients.map((ingredient) =>
      buildNodeCached(ingredient.className, depth + 1, newVisited)
    );

    // Calculate and cache combinations
    const combinations = calculateCombinations(node);
    cache[className] = { node, combinations };

    return node;
  }

  // Check if product exists
  const recipes = byProduct[targetClassName];
  if (!recipes && !products.find((p) => p.className === targetClassName)) {
    console.warn(`Product not found: ${targetClassName}`);
    return {
      tree: null,
      cache: {},
      stats: {
        uniqueNodes: 0,
        totalCombinations: 0,
        maxDepth: 0,
        circularNodes: 0,
      },
    };
  }

  // Build the tree with caching
  const tree = buildNodeCached(targetClassName, 0, new Set());

  // Calculate total combinations from root
  const totalCombinations = cache[targetClassName]?.combinations || 0;

  return {
    tree,
    cache,
    stats: {
      uniqueNodes: Object.keys(cache).length,
      totalCombinations,
      maxDepth: maxDepthReached,
      circularNodes: circularNodesFound,
    },
  };
}

/**
 * Legacy function for backward compatibility
 * Returns just the tree without cache/stats
 */
export function buildSimpleRecipeTree(
  targetClassName: string,
  maxDepth: number = 5
): TreeNode | null {
  const result = buildRecipeTree(targetClassName, maxDepth);
  return result.tree;
}
