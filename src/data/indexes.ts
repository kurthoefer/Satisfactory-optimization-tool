/**
 * Static Lookup Indexes
 *
 * Built once on module load from the raw JSON data.
 * These maps are the only way the rest of the app should access
 * products, recipes, and topology edges — never import the JSON directly.
 *
 * Seven indexes, seven questions they answer:
 *   productsBySlug         → "User navigated to /visualize/concrete — which product is that?"
 *   productsByClassName    → "Topology says Desc_Cement_C — which product is that?"
 *   productsByCategory     → "Give me all products grouped by category" (product selector UI)
 *   recipesByClassName     → "Topology says Recipe_IronPlate_C — which recipe is that?"
 *   edgesByTarget          → "What edges point INTO this node?" (upstream traversal)
 *   baseResourceClassNames → "Is this product a leaf node with no recipe producing it?"
 *   sccGroupByClassName    → "Does this node belong to a cycle, and which one?"
 */

import type { Product, Recipe, TopologicalEdge } from '@/types';

import productsData from '@/data/products-flat.json';
import recipesData from '@/data/recipes.json';
import topologyData from '@/data/topology.json';

// Cast once at the boundary
const allProducts = productsData as Product[];
const allRecipes = recipesData as Recipe[];
const allEdges = topologyData.edges as TopologicalEdge[];

// ============================================================================
// PRODUCT INDEXES
// ============================================================================

/** Resolve a URL slug to a Product. */
export const productsBySlug = new Map<string, Product>(
  allProducts.map((p) => [p.slug, p]),
);

/** Resolve a topology className (e.g. "Desc_Cement_C") to a Product. */
export const productsByClassName = new Map<string, Product>(
  allProducts.map((p) => [p.className, p]),
);

/** All products grouped by category. Used by the product selector UI. */
export const productsByCategory: Record<string, Product[]> = {};

allProducts.forEach((p) => {
  const existing = productsByCategory[p.category];
  if (existing) {
    existing.push(p);
  } else {
    productsByCategory[p.category] = [p];
  }
});

// ============================================================================
// RECIPE INDEX
// ============================================================================

/** Resolve a topology className (e.g. "Recipe_IronPlate_C") to a Recipe. */
export const recipesByClassName = new Map<string, Recipe>(
  allRecipes.map((r) => [r.className, r]),
);

// ============================================================================
// EDGE INDEX
// ============================================================================

/**
 * Given a node ID, return all edges that point INTO it.
 *
 * This is the core index for upstream traversal:
 *   edgesByTarget.get("Recipe_IronPlate_C")
 *     → edges where ingredients flow into that recipe
 *   edgesByTarget.get("Desc_IronPlate_C")
 *     → edges where recipes produce that product
 */
export const edgesByTarget = new Map<string, TopologicalEdge[]>();

allEdges.forEach((edge) => {
  const existing = edgesByTarget.get(edge.targetId);
  if (existing) {
    existing.push(edge);
  } else {
    edgesByTarget.set(edge.targetId, [edge]);
  }
});

// ============================================================================
// BASE RESOURCE DETECTION (Structural)
// ============================================================================

/**
 * A product is a base resource if no recipe produces it.
 * Structurally: no edge exists where a recipe's sourceId points
 * to this product as a targetId. (i.e. nothing flows OUT of a recipe INTO it.)
 *
 * This catches ores, water, crude oil, nitrogen — anything extracted,
 * regardless of how the categorizer labeled it.
 */
const producedByRecipe = new Set<string>();

allEdges.forEach((edge) => {
  // An edge from a recipe to a product means the recipe produces that product.
  if (
    recipesByClassName.has(edge.sourceId) &&
    productsByClassName.has(edge.targetId)
  ) {
    producedByRecipe.add(edge.targetId);
  }
});

export const baseResourceClassNames = new Set<string>(
  allProducts
    .filter((p) => !producedByRecipe.has(p.className))
    .map((p) => p.className),
);

// ============================================================================
// SCC GROUP INDEX
// ============================================================================

/**
 * Maps a className to its SCC group index (position in topology.sccs array).
 * Nodes sharing the same group index are in the same cycle.
 *
 * Returns undefined for nodes not in any cycle — use:
 *   sccGroupByClassName.get(className) ?? null
 */
const allSCCs = (topologyData.sccs ?? []) as string[][];

export const sccGroupByClassName = new Map<string, number>();

allSCCs.forEach((group, groupIndex) => {
  for (const className of group) {
    sccGroupByClassName.set(className, groupIndex);
  }
});

// ============================================================================
// RAW COLLECTIONS (for full-graph assembly)
// ============================================================================

export { allProducts, allRecipes, allEdges };
