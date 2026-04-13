/**
 * Static Lookup Indexes
 *
 * Built once on module load from the raw JSON data.
 * These maps are the only way the rest of the app should access
 * products, recipes, and topology edges — never import the JSON directly.
 *
 * Nine indexes, nine questions they answer:
 *   productsBySlug         → "User navigated to /visualize/concrete — which product is that?"
 *   productsByClassName    → "Topology says Desc_Cement_C — which product is that?"
 *   productsByCategory     → "Give me all products grouped by category" (product selector UI)
 *   recipesByClassName     → "Topology says Recipe_IronPlate_C — which recipe is that?"
 *   baseResourceClassNames → "Is this product a leaf node with no recipe producing it?"
 *   sccGroupByClassName    → "Does this node belong to a cycle, and which one?" (full-graph default)
 *   fullGraphNodeScores    → "What is this node's precomputed persistence score?"
 *   nodeDepths             → "How deep in the production chain is this node?"
 *   productCategoryOrder   → "what is the ordered list of Product categories?"
 *
 * Also exposed topologyData.edges:
 *   allEdges               → "Give me the full edge set for filtering and traversal"
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
// SCC GROUP INDEX (Full-graph default)
// ============================================================================

/**
 * Maps a className to its SCC group index (position in topology.sccs array).
 * Nodes sharing the same group index are in the same cycle.
 *
 * IMPORTANT: This reflects the FULL unfiltered production graph.
 * When the user applies filters (TraversalRules), SCCs must be
 * recomputed client-side on the filtered edge set.
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
// PERSISTENCE (Full-graph default)
// ============================================================================

/**
 * Precomputed PageRank scores from the full production graph.
 * Used as the "full" context in PersistenceScores.
 *
 * Filtered and subgraph persistence are computed at runtime
 * by useGraphBuilder when filters or target change.
 */
export const fullGraphNodeScores = (topologyData.nodeScores ?? {}) as Record<
  string,
  number
>;

// ============================================================================
// DEPTH (Flow directionality)
// ============================================================================

/**
 * Shortest distance (in hops) from any base resource.
 * Depth 0 = raw resource, increases toward end products.
 * Products have even depths, recipes have odd depths (bipartite property).
 *
 * Used to identify feedback edges inside SCCs: an edge where
 * source.depth > target.depth flows against the production current.
 */
export const nodeDepths = (topologyData.nodeDepths ?? {}) as Record<
  string,
  number
>;

// ============================================================================
// SELECTOR PRESENTATION
// ============================================================================

export const productCategoryOrder: string[] = [
  'Ingots',
  'Standard Parts',
  'Resources',
  'Fluids',
  'Industrial',
  'Electronics',
  'Nuclear',
  'Space Elevator',
  'Packaged',
  'Power',
  'Vehicles',
  'Equipment',
  'Ammo',
  'Consumables',
  'Biomass',
  'Other',
];

// ============================================================================
// RAW EDGE SET (for filtering and traversal)
// ============================================================================

export { allEdges };
