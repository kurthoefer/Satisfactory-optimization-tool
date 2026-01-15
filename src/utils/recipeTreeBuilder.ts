import type { RecipesOrganized, Product, TreeNode } from '@/types';
import recipesOrganizedData from '@/data/recipes-organized.json';
import productsData from '@/data/products-flat.json';

// Cast JSON imports to proper types
const recipesOrganized = recipesOrganizedData as RecipesOrganized;
const products = productsData as Product[];

/**
 * Builds a recipe tree starting from a target product for D3's consumption
 *
 * @param targetClassName - The className of the product to build tree for (e.g., "Desc_IronIngot_C")
 * @param maxDepth - Maximum depth to traverse (prevents infinite loops)
 * @returns Root TreeNode or null if product not found
 */
export function buildRecipeTree(
  targetClassName: string,
  maxDepth: number = 3
): TreeNode | null {
  const { byProduct, circularRelationships } = recipesOrganized;

  // Helper to get product display name from className
  function getProductName(className: string): string {
    const product = products.find((p) => p.className === className);
    return product?.name || className;
  }

  // Track visited nodes to prevent infinite loops in circular dependencies
  const visited = new Set<string>();

  function buildNode(className: string, depth: number): TreeNode {
    const node: TreeNode = {
      name: getProductName(className),
      className,
      depth,
      isCircular: circularRelationships.circularItems.includes(className),
      children: [],
      recipes: [],
    };

    // Stop conditions: max depth reached or already visited
    if (depth >= maxDepth) return node;
    if (visited.has(className)) return node;

    visited.add(className);

    // Get recipes that produce this item
    const recipes = byProduct[className];
    if (!recipes || recipes.length === 0) {
      // Raw resource (no recipe to produce it)
      return node;
    }

    // Store all recipe IDs that can produce this item
    node.recipes = recipes.map((r) => r.id);

    // For now, use the first recipe (we'll handle alternatives later)
    const recipe = recipes[0];

    // Recursively build children from ingredients
    node.children = recipe.ingredients.map((ingredient) =>
      buildNode(ingredient.className, depth + 1)
    );

    return node;
  }

  // Check if product exists
  const recipes = byProduct[targetClassName];
  if (!recipes && !products.find((p) => p.className === targetClassName)) {
    console.warn(`Product not found: ${targetClassName}`);
    return null;
  }

  return buildNode(targetClassName, 0);
}
