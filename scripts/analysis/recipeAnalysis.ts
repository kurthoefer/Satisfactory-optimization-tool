/**
 * recipeAnalysis.ts
 *
 * Runs Tarjan's algorithm on the recipe graph to detect
 * strongly connected components (circular dependencies).
 *
 * This is a build-time concern. The output is embedded in
 * topology.json and consumed at runtime by indexes.ts.
 */

import type { Recipe } from '../../src/types';

// ============================================================================
// TYPES (Build-time only)
// ============================================================================

export interface CircularRelationships {
  stronglyConnectedComponents: string[][];
  circularItems: string[];
}

// ============================================================================
// HELPERS
// ============================================================================

/** Check if an item produces itself (immediate loop) */
function hasSelfLoop(
  item: string,
  byProduct: Record<string, Recipe[]>,
): boolean {
  const recipes = byProduct[item] || [];
  return recipes.some((recipe) =>
    recipe.ingredients.some((ing) => ing.className === item),
  );
}

/** Build the byProduct index needed for Tarjan's traversal */
function indexByProduct(recipes: Recipe[]): Record<string, Recipe[]> {
  const byProduct: Record<string, Recipe[]> = {};

  recipes.forEach((recipe) => {
    recipe.products.forEach((product) => {
      if (!byProduct[product.className]) {
        byProduct[product.className] = [];
      }
      byProduct[product.className].push(recipe);
    });
  });

  return byProduct;
}

// ============================================================================
// TARJAN'S ALGORITHM
// ============================================================================

/**
 * Finds all strongly connected components in the recipe graph.
 * Takes the flat recipe list directly — builds its own indexes internally.
 */
export function findCircularRelationships(
  recipes: Recipe[],
): CircularRelationships {
  const byProduct = indexByProduct(recipes);

  let index = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  // Collect all items in the graph
  const allItems = new Set<string>();
  Object.keys(byProduct).forEach((item) => allItems.add(item));
  Object.values(byProduct).forEach((recipes) => {
    recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ing) => allItems.add(ing.className));
    });
  });

  function strongConnect(item: string) {
    indices.set(item, index);
    lowLinks.set(item, index);
    index++;
    stack.push(item);
    onStack.add(item);

    const recipes = byProduct[item] || [];
    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const successor = ingredient.className;

        if (!indices.has(successor)) {
          strongConnect(successor);
          lowLinks.set(
            item,
            Math.min(lowLinks.get(item)!, lowLinks.get(successor)!),
          );
        } else if (onStack.has(successor)) {
          lowLinks.set(
            item,
            Math.min(lowLinks.get(item)!, indices.get(successor)!),
          );
        }
      }
    }

    if (lowLinks.get(item) === indices.get(item)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== item);
      sccs.push(scc);
    }
  }

  for (const item of allItems) {
    if (!indices.has(item)) {
      strongConnect(item);
    }
  }

  // Identify circular items (SCCs with >1 member, or self-loops)
  const circularItems: string[] = [];

  sccs.forEach((scc) => {
    const isCircular =
      scc.length > 1 || (scc.length === 1 && hasSelfLoop(scc[0], byProduct));

    if (isCircular) {
      circularItems.push(...scc);
    }
  });

  return {
    stronglyConnectedComponents: sccs,
    circularItems,
  };
}
