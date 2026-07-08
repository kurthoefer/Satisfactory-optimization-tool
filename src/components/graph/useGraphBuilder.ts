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
  NodePayload,
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
  fullGraphNodeScores,
} from '@/data/indexes';

import { computePersistence } from '@/utils/computePersistence';
import { detectSCCs } from '@/utils/detectSCCs';
import { computeSCCLevels } from '@/utils/computeSCCLevels';

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
    const recipe =
      recipesByClassName.get(edge.sourceId) ??
      recipesByClassName.get(edge.targetId);

    // Edge between two products with no recipe — keep it
    //TODO This line below seems to be watching for an impossible event... why is this here?  the comment above is fishy..
    if (!recipe) return true;

    if (!rules.includeAlternates && recipe.isAlternate) return false;
    if (!rules.includeConverter && recipe.producedIn === 'Converter')
      return false;
    if (!rules.includePackager && recipe.producedIn === 'Packager')
      return false;
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

      const isBaseResource = baseResourceClassNames.has(upstreamId);

      if (isBaseResource) {
        reachable.add(upstreamId);

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
 * Runs PageRank twice:
 *   - On filteredEdges → importance across the full filtered production network
 *   - On walkedEdges → importance within the target product's dependency tree
 *
 * Runs Tarjan's SCC detection on filteredEdges for cycle identification.
 */
function computeGraphMetrics(
  filteredEdges: TopologicalEdge[],
  walkedEdges: TopologicalEdge[],
): {
  filteredNodeScores: Record<string, number>;
  subgraphNodeScores: Record<string, number>;
  sccGroups: Map<string, number>;
  sccLevelByNode: Map<string, number>; // NEW
} {
  const filteredResult = computePersistence(filteredEdges);
  const subgraphResult = computePersistence(walkedEdges);

  // SCC detection now returns groups (true cycles) + the condensation DAG
  const { groups, condensation } = detectSCCs(filteredEdges);

  // sccGroupId source — className → hull group index (unchanged intent)
  const sccGroups = new Map<string, number>();
  groups.forEach((group, groupIndex) => {
    for (const className of group) {
      sccGroups.set(className, groupIndex);
    }
  });

  // sccLevel source — className → stratum. Total: every node gets a level.
  const levels = computeSCCLevels(condensation);
  const sccLevelByNode = new Map<string, number>();
  condensation.members.forEach((group, superId) => {
    for (const className of group) {
      sccLevelByNode.set(className, levels[superId]);
    }
  });

  return {
    filteredNodeScores: filteredResult.nodeScores,
    subgraphNodeScores: subgraphResult.nodeScores,
    sccGroups,
    sccLevelByNode,
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
  sccLevelByNode: Map<string, number>,
): { nodes: GraphNode[]; links: GraphEdge[] } {
  // --- Nodes ---
  const nodes: GraphNode[] = [];
  // Build the id -> node index in the SAME pass that creates the nodes, so the
  // degree step below is O(1) per lookup rather than a linear scan.
  const nodeById = new Map<string, GraphNode>();

  for (const id of reachableIds) {
    const product = productsByClassName.get(id);
    const recipe = recipesByClassName.get(id);

    const persistence: PersistenceScores = {
      full: fullGraphNodeScores[id] ?? 0,
      filtered: filteredNodeScores[id] ?? 0,
      subgraph: subgraphNodeScores[id] ?? 0,
    };

    let payload: NodePayload;
    if (product) payload = { type: 'product', data: product };
    else if (recipe) payload = { type: 'recipe', data: recipe };
    else
      throw new Error(
        `assembleGraph: reachable id "${id}" is neither product nor recipe`,
      );

    const node: GraphNode = {
      id,
      payload,
      persistence,
      degree: 0,
      sccGroupId: sccGroups.get(id) ?? null,
      sccLevel: sccLevelByNode.get(id) ?? 0,
    };

    nodes.push(node);
    nodeById.set(id, node); // index as we build — no second pass
  }

  // --- Links ---
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
      // Edge persistence = average of source and target node scores.
      // Preserves importance if either endpoint is significant.
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

  // --- Compute degree ---  O(edges), O(1) lookups (was O(nodes × edges))
  for (const link of links) {
    const sourceId =
      typeof link.source === 'string' ? link.source : link.source.id;
    const targetId =
      typeof link.target === 'string' ? link.target : link.target.id;

    const sourceNode = nodeById.get(sourceId);
    const targetNode = nodeById.get(targetId);

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
      reachableIds = walkUpstream(config.targetClassName, filteredEdges);
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
    const {
      filteredNodeScores,
      subgraphNodeScores,
      sccGroups,
      sccLevelByNode,
    } = computeGraphMetrics(filteredEdges, walkedEdges);

    // Phase 4: Assemble
    const { nodes, links } = assembleGraph(
      reachableIds,
      filteredEdges,
      filteredNodeScores,
      subgraphNodeScores,
      sccGroups,
      sccLevelByNode, // NEW
    );

    return { nodes, links };
  }, [
    config.targetClassName,
    config.rules.includeAlternates,
    config.rules.includeConverter,
    config.rules.includePackager,
    config.rules.maxTier,
  ]);
}
