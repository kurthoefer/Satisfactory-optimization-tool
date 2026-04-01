/**
 * useGraphBuilder
 *
 * The orchestration layer between domain rules and visual data.
 * Translates TraversalRules into a fully computed graph
 * ready for GraphCanvas consumption.
 *
 * GraphCanvas receives nodes and links — it never needs to know
 * about filters, tiers, persistence algorithms, or game concepts.
 *
 * Four phases:
 *   1. FILTER  — apply data filters to the edge set
 *   2. WALK    — BFS upstream from target through filtered edges
 *   3. COMPUTE — persistence (3 contexts) + SCC detection
 *   4. ASSEMBLE — build GraphNode[] and GraphEdge[] for D3
 */

import { useMemo } from 'react';

import type {
  GraphNode,
  GraphEdge,
  TopologicalEdge,
  PersistenceScores,
} from '@/types';
import type {
  TraversalConfig,
  TraversalRules,
} from '@/hooks/useTraversalRules';

import {
  productsByClassName,
  recipesByClassName,
  allEdges,
  baseResourceClassNames,
} from '@/data/indexes';

// Full-graph persistence (precomputed at build time)
import topologyData from '@/data/topology.json';
const fullGraphNodeScores = topologyData.nodeScores as Record<string, number>;

// ============================================================================
// TYPES
// ============================================================================

export interface GraphBuilderResult {
  nodes: GraphNode[];
  links: GraphEdge[];
}

// ============================================================================
// PHASE 1: FILTER EDGES
// ============================================================================

/**
 * Apply data filters to the full edge set.
 * Returns edges that survive the current TraversalRules.
 *
 * An edge connects a product to a recipe (or vice versa).
 * We filter by checking the recipe on each edge.
 */
function filterEdges(
  edges: TopologicalEdge[],
  rules: TraversalRules,
): TopologicalEdge[] {
  return edges.filter((edge) => {
    // Find the recipe on this edge (could be source or target)
    const recipe =
      recipesByClassName.get(edge.sourceId) ??
      recipesByClassName.get(edge.targetId);

    // Edge between two products with no recipe — keep it
    if (!recipe) return true;

    // Alternate filter
    if (!rules.includeAlternates && recipe.isAlternate) return false;

    // Converter filter
    if (!rules.includeConverter && recipe.producedIn === 'Converter')
      return false;

    // Tier filter
    if (
      rules.maxTier !== null &&
      recipe.tier !== null &&
      recipe.tier > rules.maxTier
    )
      return false;

    return true;
  });
}

// ============================================================================
// PHASE 2: WALK
// ============================================================================

/**
 * BFS upstream from a target product through filtered edges.
 * Returns the set of all reachable node classNames.
 */
function walkUpstream(
  targetClassName: string,
  filteredEdges: TopologicalEdge[],
  includeBaseResources: boolean,
): Set<string> {
  // Build a local edgesByTarget index from filtered edges
  const edgesByTarget = new Map<string, TopologicalEdge[]>();
  for (const edge of filteredEdges) {
    const existing = edgesByTarget.get(edge.targetId);
    if (existing) {
      existing.push(edge);
    } else {
      edgesByTarget.set(edge.targetId, [edge]);
    }
  }

  const reachable = new Set<string>();
  const queue: string[] = [targetClassName];
  reachable.add(targetClassName);

  while (queue.length > 0) {
    const current = queue.shift()!;

    const incomingEdges = edgesByTarget.get(current) ?? [];

    for (const edge of incomingEdges) {
      const upstreamId = edge.sourceId;

      if (reachable.has(upstreamId)) continue;

      // Check if this is a base resource
      const isBaseResource = baseResourceClassNames.has(upstreamId);

      if (isBaseResource) {
        if (includeBaseResources) {
          reachable.add(upstreamId);
        }
        // Don't recurse past base resources — they're leaves
        continue;
      }

      reachable.add(upstreamId);
      queue.push(upstreamId);
    }
  }

  return reachable;
}

// ============================================================================
// PHASE 3: COMPUTE
// ============================================================================

/**
 * Compute persistence scores and SCC groups for the current context.
 *
 * TODO: Implement runtime PageRank (computePersistence adapted for client)
 * TODO: Implement runtime SCC detection (Tarjan's on TopologicalEdge[])
 *
 * For now, uses precomputed full-graph scores as placeholder
 * for all three persistence contexts.
 */
function computeGraphMetrics(
  filteredEdges: TopologicalEdge[],
  walkedEdges: TopologicalEdge[],
): {
  filteredNodeScores: Record<string, number>;
  subgraphNodeScores: Record<string, number>;
  sccGroups: Map<string, number>;
} {
  // TODO: Runtime PageRank on filteredEdges → filteredNodeScores
  // TODO: Runtime PageRank on walkedEdges → subgraphNodeScores
  // TODO: Runtime Tarjan's on filteredEdges → sccGroups

  // Placeholder: use full-graph scores for all contexts
  return {
    filteredNodeScores: fullGraphNodeScores,
    subgraphNodeScores: fullGraphNodeScores,
    sccGroups: new Map(),
  };
}

// ============================================================================
// PHASE 4: ASSEMBLE
// ============================================================================

/**
 * Build GraphNode[] and GraphEdge[] from walked node IDs and filtered edges.
 * Attaches persistence scores, SCC groups, and visual flags.
 */
function assembleGraph(
  reachableIds: Set<string>,
  filteredEdges: TopologicalEdge[],
  filteredNodeScores: Record<string, number>,
  subgraphNodeScores: Record<string, number>,
  sccGroups: Map<string, number>,
  includeBaseResources: boolean,
): { nodes: GraphNode[]; links: GraphEdge[] } {
  // --- Nodes ---
  const nodes: GraphNode[] = [];

  for (const id of reachableIds) {
    const product = productsByClassName.get(id);
    const recipe = recipesByClassName.get(id);

    const isBaseResource = baseResourceClassNames.has(id);

    const persistence: PersistenceScores = {
      full: fullGraphNodeScores[id] ?? 0,
      filtered: filteredNodeScores[id] ?? 0,
      subgraph: subgraphNodeScores[id] ?? 0,
    };

    nodes.push({
      id,
      payload: product
        ? { type: 'product', data: product }
        : recipe
          ? { type: 'recipe', data: recipe }
          : { type: 'product', data: null },
      persistence,
      degree: 0, // Computed below
      sccGroupId: sccGroups.get(id) ?? null,
      visuallyHidden: isBaseResource && !includeBaseResources,
    });
  }

  // --- Links ---
  // Edge persistence = average of source and target node scores.
  // Preserves importance if either endpoint is significant.
  const links: GraphEdge[] = [];

  for (const edge of filteredEdges) {
    if (!reachableIds.has(edge.sourceId) || !reachableIds.has(edge.targetId)) {
      continue;
    }

    links.push({
      source: edge.sourceId,
      target: edge.targetId,
      throughput: edge.throughput,
      weight: edge.weight,
      persistence: {
        full: edge.persistence,
        filtered:
          ((filteredNodeScores[edge.sourceId] ?? 0) +
            (filteredNodeScores[edge.targetId] ?? 0)) /
          2,
        subgraph:
          ((subgraphNodeScores[edge.sourceId] ?? 0) +
            (subgraphNodeScores[edge.targetId] ?? 0)) /
          2,
      },
    });
  }

  // --- Compute degree ---
  for (const link of links) {
    const sourceId =
      typeof link.source === 'string' ? link.source : link.source.id;
    const targetId =
      typeof link.target === 'string' ? link.target : link.target.id;

    const sourceNode = nodes.find((n) => n.id === sourceId);
    const targetNode = nodes.find((n) => n.id === targetId);

    if (sourceNode) sourceNode.degree++;
    if (targetNode) targetNode.degree++;
  }

  return { nodes, links };
}

// ============================================================================
// HOOK
// ============================================================================

export function useGraphBuilder(config: TraversalConfig): GraphBuilderResult {
  return useMemo(() => {
    // Phase 1: Filter edges
    const filteredEdges = filterEdges(allEdges, config.rules);

    // Phase 2: Walk
    let reachableIds: Set<string>;
    let walkedEdges: TopologicalEdge[];

    if (config.targetClassName) {
      reachableIds = walkUpstream(
        config.targetClassName,
        filteredEdges,
        config.rules.includeBaseResources,
      );
      // Edges within the walked subgraph
      walkedEdges = filteredEdges.filter(
        (e) => reachableIds.has(e.sourceId) && reachableIds.has(e.targetId),
      );
    } else {
      // No target — show the full filtered graph
      reachableIds = new Set<string>();
      for (const edge of filteredEdges) {
        reachableIds.add(edge.sourceId);
        reachableIds.add(edge.targetId);
      }
      walkedEdges = filteredEdges;
    }

    // Phase 3: Compute persistence + SCCs
    const { filteredNodeScores, subgraphNodeScores, sccGroups } =
      computeGraphMetrics(filteredEdges, walkedEdges);

    // Phase 4: Assemble
    const { nodes, links } = assembleGraph(
      reachableIds,
      filteredEdges,
      filteredNodeScores,
      subgraphNodeScores,
      sccGroups,
      config.rules.includeBaseResources,
    );

    return { nodes, links };
  }, [
    config.targetClassName,
    config.rules.includeAlternates,
    config.rules.includeConverter,
    config.rules.maxTier,
    config.rules.includeBaseResources,
  ]);
}
