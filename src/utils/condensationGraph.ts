/**
 * Builds a condensation graph from recipe data
 * Collapses strongly connected components (SCCs) into meta-nodes
 * Results in a pure DAG suitable for visualization
 */

import type { RecipesOrganized, Product, Recipe } from '@/types';
import recipesOrganizedData from '@/data/recipes-organized.json';
import productsData from '@/data/products-flat.json';

const recipesOrganized = recipesOrganizedData as RecipesOrganized;
const products = productsData as Product[];

/**
 * A node in the condensation graph
 * Can be either a single product or an SCC meta-node
 */
export interface CondensationNode {
  id: string; // Unique identifier
  type: 'product' | 'scc'; // Single product or SCC group

  // For product nodes
  name?: string; // Display name
  className?: string; // Product className

  // For SCC nodes
  products?: string[]; // ClassNames of products in this SCC
  productNames?: string[]; // Display names

  // Shared properties
  recipeCount: number; // Total recipes available
  isCircular: boolean; // Whether this contains cycles
}

/**
 * An edge in the condensation graph
 */
export interface CondensationEdge {
  source: string; // Source node ID
  target: string; // Target node ID
  recipes: string[]; // Recipe IDs that connect these nodes
  isMulti: boolean; // Multiple recipe options
}

/**
 * The complete condensation graph structure
 */
export interface CondensationGraph {
  nodes: CondensationNode[];
  edges: CondensationEdge[];

  // Metadata
  stats: {
    totalNodes: number;
    productNodes: number;
    sccNodes: number;
    totalEdges: number;
  };

  // Layout hint
  layout: {
    type: 'dag';
    condensed: boolean;
  };
}

/**
 * Build a condensation graph from all recipes
 *
 * @param targetProduct - Optional: focus on subgraph containing this product
 * @returns CondensationGraph ready for D3 visualization
 */
export function buildCondensationGraph(
  targetProduct?: string
): CondensationGraph {
  const { byProduct, circularRelationships } = recipesOrganized;
  const { stronglyConnectedComponents, circularItems } = circularRelationships;

  // Map each product to its SCC index
  const productToSCC = new Map<string, number>();
  stronglyConnectedComponents.forEach((scc, index) => {
    scc.forEach((product) => {
      productToSCC.set(product, index);
    });
  });

  // If targetProduct specified, find all reachable products (BFS)
  let relevantProducts: Set<string>;
  if (targetProduct) {
    relevantProducts = findReachableProducts(targetProduct, byProduct);
  } else {
    // Include all products
    relevantProducts = new Set(Object.keys(byProduct));
  }

  // Build nodes
  const nodes: CondensationNode[] = [];
  const processedSCCs = new Set<number>();
  const nodeIdMap = new Map<string, string>(); // product className -> node ID

  // Process each relevant product
  relevantProducts.forEach((className) => {
    const sccIndex = productToSCC.get(className);

    if (sccIndex !== undefined && !processedSCCs.has(sccIndex)) {
      // This is part of an SCC - create meta-node
      const scc = stronglyConnectedComponents[sccIndex];
      const isActuallyCircular =
        scc.length > 1 || (scc.length === 1 && circularItems.includes(scc[0]));

      if (isActuallyCircular) {
        // Multi-product SCC or self-loop
        const nodeId = `scc-${sccIndex}`;
        const sccProducts = scc.filter((p) => relevantProducts.has(p));

        const node: CondensationNode = {
          id: nodeId,
          type: 'scc',
          products: sccProducts,
          productNames: sccProducts.map((p) => getProductName(p)),
          recipeCount: sccProducts.reduce(
            (sum, p) => sum + (byProduct[p]?.length || 0),
            0
          ),
          isCircular: true,
        };

        nodes.push(node);
        processedSCCs.add(sccIndex);

        // Map all products in SCC to this meta-node
        sccProducts.forEach((p) => nodeIdMap.set(p, nodeId));
      } else {
        // Single-product SCC with no self-loop - treat as regular node
        const nodeId = className;
        const recipes = byProduct[className] || [];

        nodes.push({
          id: nodeId,
          type: 'product',
          name: getProductName(className),
          className,
          recipeCount: recipes.length,
          isCircular: false,
        });

        nodeIdMap.set(className, nodeId);
        processedSCCs.add(sccIndex);
      }
    } else if (!productToSCC.has(className)) {
      // Not in any SCC - regular product node
      const nodeId = className;
      const recipes = byProduct[className] || [];

      nodes.push({
        id: nodeId,
        type: 'product',
        name: getProductName(className),
        className,
        recipeCount: recipes.length,
        isCircular: false,
      });

      nodeIdMap.set(className, nodeId);
    }
  });

  // Build edges
  const edges: CondensationEdge[] = [];
  const edgeSet = new Set<string>(); // To deduplicate

  relevantProducts.forEach((productClassName) => {
    const recipes = byProduct[productClassName] || [];
    const sourceNodeId = nodeIdMap.get(productClassName);

    if (!sourceNodeId) return;

    recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ingredient) => {
        const targetNodeId = nodeIdMap.get(ingredient.className);

        if (!targetNodeId) return;
        if (sourceNodeId === targetNodeId) return; // Skip self-loops (handled by SCC)

        const edgeKey = `${sourceNodeId}->${targetNodeId}`;

        if (!edgeSet.has(edgeKey)) {
          // Find all recipes that connect these nodes
          const connectingRecipes = recipes
            .filter((r) =>
              r.ingredients.some(
                (ing) => nodeIdMap.get(ing.className) === targetNodeId
              )
            )
            .map((r) => r.id);

          edges.push({
            source: sourceNodeId,
            target: targetNodeId,
            recipes: connectingRecipes,
            isMulti: connectingRecipes.length > 1,
          });

          edgeSet.add(edgeKey);
        }
      });
    });
  });

  // Calculate stats
  const sccNodeCount = nodes.filter((n) => n.type === 'scc').length;

  return {
    nodes,
    edges,
    stats: {
      totalNodes: nodes.length,
      productNodes: nodes.length - sccNodeCount,
      sccNodes: sccNodeCount,
      totalEdges: edges.length,
    },
    layout: {
      type: 'dag',
      condensed: true,
    },
  };
}

/**
 * Find all products reachable from a target product (dependencies)
 * Uses BFS to traverse the recipe graph
 */
function findReachableProducts(
  targetProduct: string,
  byProduct: { [className: string]: Recipe[] }
): Set<string> {
  const reachable = new Set<string>();
  const queue: string[] = [targetProduct];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (reachable.has(current)) continue;
    reachable.add(current);

    const recipes = byProduct[current] || [];
    recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ingredient) => {
        if (!reachable.has(ingredient.className)) {
          queue.push(ingredient.className);
        }
      });
    });
  }

  return reachable;
}

/**
 * Helper to get product display name
 */
function getProductName(className: string): string {
  const product = products.find((p) => p.className === className);
  return product?.name || className;
}

/**
 * Expand an SCC node to see individual products and their relationships
 */
export function expandSCC(
  graph: CondensationGraph,
  sccNodeId: string
): CondensationGraph {
  const sccNode = graph.nodes.find((n) => n.id === sccNodeId);

  if (!sccNode || sccNode.type !== 'scc' || !sccNode.products) {
    return graph; // Not an SCC or already expanded
  }

  // Replace SCC meta-node with individual product nodes
  const newNodes = graph.nodes.filter((n) => n.id !== sccNodeId);

  sccNode.products.forEach((className) => {
    const recipes = recipesOrganized.byProduct[className] || [];
    newNodes.push({
      id: className,
      type: 'product',
      name: getProductName(className),
      className,
      recipeCount: recipes.length,
      isCircular: true, // Part of expanded SCC
    });
  });

  // Rebuild edges for expanded products
  // This would add internal SCC edges - implementation depends on desired behavior

  return {
    ...graph,
    nodes: newNodes,
    layout: {
      type: 'dag',
      condensed: false, // Now expanded
    },
  };
}
