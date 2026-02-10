/**
 * SCC Detection Module
 *
 * Finds Strongly Connected Components (SCCs) in a directed graph using Tarjan's algorithm.
 * An SCC is a maximal set of vertices where every vertex is reachable from every other vertex.
 *
 * This is a pure function with no side effects - perfect for testing.
 */

import type { Recipe } from '@/types';

/**
 * Result of SCC detection
 */
export interface SCCResult {
  sccs: string[][]; // List of SCCs (each is a list of product classNames)
  circularProducts: Set<string>; // Products that are in cycles
}

/**
 * Find all Strongly Connected Components in a recipe graph
 *
 * @param byProduct - Map of product className to recipes that produce it
 * @returns SCCs and set of products involved in cycles
 */
export function findSCCs(byProduct: {
  [className: string]: Recipe[];
}): SCCResult {
  // Tarjan's algorithm state
  let index = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  // Get all products in the graph (both producers and ingredients)
  const allProducts = new Set<string>();
  Object.keys(byProduct).forEach((product) => allProducts.add(product));
  Object.values(byProduct).forEach((recipes) => {
    recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ing) => allProducts.add(ing.className));
    });
  });

  /**
   * Tarjan's recursive DFS
   */
  function strongConnect(product: string) {
    // Set the depth index for this product
    indices.set(product, index);
    lowLinks.set(product, index);
    index++;
    stack.push(product);
    onStack.add(product);

    // Visit all products this product depends on (via its recipes)
    const recipes = byProduct[product] || [];
    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const successor = ingredient.className;

        if (!indices.has(successor)) {
          // Successor not yet visited - recurse
          strongConnect(successor);
          lowLinks.set(
            product,
            Math.min(lowLinks.get(product)!, lowLinks.get(successor)!),
          );
        } else if (onStack.has(successor)) {
          // Successor is in current SCC
          lowLinks.set(
            product,
            Math.min(lowLinks.get(product)!, indices.get(successor)!),
          );
        }
      }
    }

    // If this is a root node, pop the stack to form an SCC
    if (lowLinks.get(product) === indices.get(product)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== product);

      sccs.push(scc);
    }
  }

  // Run Tarjan's algorithm on all unvisited products
  for (const product of allProducts) {
    if (!indices.has(product)) {
      strongConnect(product);
    }
  }

  // Identify which products are in cycles
  const circularProducts = new Set<string>();
  sccs.forEach((scc) => {
    const isCircular =
      scc.length > 1 || (scc.length === 1 && hasSelfLoop(scc[0], byProduct));

    if (isCircular) {
      scc.forEach((product) => circularProducts.add(product));
    }
  });

  return {
    sccs,
    circularProducts,
  };
}

/**
 * Check if a product has a self-loop (produces itself as an ingredient)
 */
function hasSelfLoop(
  product: string,
  byProduct: { [className: string]: Recipe[] },
): boolean {
  const recipes = byProduct[product] || [];
  return recipes.some((recipe) =>
    recipe.ingredients.some((ing) => ing.className === product),
  );
}
