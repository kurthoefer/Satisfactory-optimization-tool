/**
 * useGraphBuilder
 *
 * Takes a TraversalConfig and returns the full tagged graph
 * ready for D3 consumption.
 *
 * Two phases:
 *   Phase 1 — WALK: BFS upstream from the target product,
 *             respecting traversal rules. Produces a Set of
 *             focused classNames.
 *
 *   Phase 2 — ASSEMBLY: Builds GraphNode[] and GraphEdge[]
 *             for the entire graph, tagging each with focus: true/false
 *             based on the walk results.
 *
 * Future: SCC collapsing would sit between Phase 1 and Phase 2
 * as a transform on the focusedIds set and the node assembly logic.
 */

import { useMemo } from 'react';

import type { GraphNode, GraphEdge, TopologicalEdge } from '@/types';
import type { TraversalConfig } from '@/hooks/useTraversalRules';

import {
  productsByClassName,
  recipesByClassName,
  edgesByTarget,
  baseResourceClassNames,
  allProducts,
  allRecipes,
  allEdges,
  sccGroupByClassName,
} from '@/data/indexes';

// ============================================================================
// TYPES
// ============================================================================

export interface GraphBuilderResult {
  nodes: GraphNode[];
  links: GraphEdge[];
  /** Exposed for debugging / UI stats */
  focusedCount: number;
}

// ============================================================================
// PHASE 1: UPSTREAM WALK
// ============================================================================

/**
 * BFS upstream from a target product.
 * Returns the set of all classNames reachable by walking
 * backward through the dependency chain.
 */
function walkUpstream(
  targetClassName: string,
  rules: TraversalConfig['rules'],
): Set<string> {
  const focused = new Set<string>();
  const queue: string[] = [targetClassName];

  focused.add(targetClassName);

  while (queue.length > 0) {
    const currentProduct = queue.shift()!;

    // "What recipes produce this product?"
    // Edges where a recipe (source) flows into this product (target)
    const incomingEdges = edgesByTarget.get(currentProduct) ?? [];

    for (const edge of incomingEdges) {
      const recipeClassName = edge.sourceId;

      // Must actually be a recipe (not a product feeding into another product)
      if (!recipesByClassName.has(recipeClassName)) continue;

      // Already visited — skip (handles circular dependencies)
      if (focused.has(recipeClassName)) continue;

      // Rule: alternate recipes
      const recipe = recipesByClassName.get(recipeClassName)!;
      if (recipe.isAlternate && !rules.includeAlternates) continue;

      // Recipe passes — mark it focused
      focused.add(recipeClassName);

      // "What ingredients does this recipe need?"
      // Edges where products (source) flow into this recipe (target)
      const ingredientEdges = edgesByTarget.get(recipeClassName) ?? [];

      for (const ingredientEdge of ingredientEdges) {
        const ingredientClassName = ingredientEdge.sourceId;

        // Must actually be a product
        if (!productsByClassName.has(ingredientClassName)) continue;

        // Already visited
        if (focused.has(ingredientClassName)) continue;

        // Rule: base resources
        const isBaseResource = baseResourceClassNames.has(ingredientClassName);

        if (isBaseResource) {
          if (rules.includeBaseResources) {
            // Include it but don't recurse — it's a leaf
            focused.add(ingredientClassName);
          }
          // Either way, don't queue it for further traversal
          continue;
        }

        // Regular product — focus it and continue walking upstream
        focused.add(ingredientClassName);
        queue.push(ingredientClassName);
      }
    }
  }

  return focused;
}

// ============================================================================
// PHASE 2: ASSEMBLY
// ============================================================================

/**
 * Builds the full node and link arrays for D3.
 * Every product and recipe becomes a node.
 * Every edge becomes a link.
 * Each is tagged with focus based on the walk results.
 */
function assembleGraph(focusedIds: Set<string>): {
  nodes: GraphNode[];
  links: GraphEdge[];
} {
  // --- Nodes ---
  const nodes: GraphNode[] = [];

  for (const product of allProducts) {
    nodes.push({
      id: product.className,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      payload: { type: 'product', data: product },
      stressScore: 0,
      degree: 0,
      focus: focusedIds.has(product.className),
      sccGroupId: sccGroupByClassName.get(product.className) ?? null,
    });
  }

  for (const recipe of allRecipes) {
    nodes.push({
      id: recipe.className,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      payload: { type: 'recipe', data: recipe },
      stressScore: 0,
      degree: 0,
      focus: focusedIds.has(recipe.className),
      sccGroupId: sccGroupByClassName.get(recipe.className) ?? null,
    });
  }

  // --- Links ---
  const links: GraphEdge[] = allEdges.map((edge) => ({
    source: edge.sourceId,
    target: edge.targetId,
    throughput: edge.throughput,
    weight: edge.weight,
    persistence: edge.persistence,
    focus: focusedIds.has(edge.sourceId) && focusedIds.has(edge.targetId),
  }));

  return { nodes, links };
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Reactive graph builder.
 * Recomputes when the traversal config changes (target, rules, or view mode).
 *
 * Future: SCC collapsing would transform focusedIds between
 * walkUpstream() and assembleGraph(), optionally merging
 * cycle members into composite nodes before assembly.
 */
export function useGraphBuilder(config: TraversalConfig): GraphBuilderResult {
  return useMemo(() => {
    // No target — return the full graph, nothing focused
    if (!config.targetClassName) {
      const { nodes, links } = assembleGraph(new Set());
      return { nodes, links, focusedCount: 0 };
    }

    // Phase 1: Walk
    const focusedIds = walkUpstream(config.targetClassName, config.rules);

    // (Future: Phase 1.5 — SCC collapse transform on focusedIds)

    // Phase 2: Assemble
    const { nodes, links } = assembleGraph(focusedIds);

    return { nodes, links, focusedCount: focusedIds.size };
  }, [
    config.targetClassName,
    config.rules.includeAlternates,
    config.rules.includeBaseResources,
  ]);
}
