/**
 * computePersistence
 *
 * Computes a persistence score for every TopologicalEdge using
 * weighted PageRank on the reversed graph.
 *
 * Why reversed? In the original graph, edges flow from raw resources
 * toward end products (Product → Recipe → Product → ...). Reversing
 * the graph means importance flows BACKWARD — from end products toward
 * raw resources. Nodes that sit upstream of many important paths
 * accumulate high rank. This captures "structural availability":
 * how central and relied-upon a node is across the production network.
 *
 * Why weighted? Edge throughput (items/min) determines how much rank
 * flows along each edge. High-throughput connections carry more
 * importance than trickles. This means a node's score reflects not
 * just how many things depend on it, but how MUCH they demand from it.
 *
 * Edge persistence = average of source and target node scores,
 * normalized to 0–1. This preserves information from both endpoints:
 * an edge touching anything important retains visibility.
 *
 * Usage (in buildGameData.ts):
 *   const topology = generateTopology(recipes, circular, products);
 *   const { edges, nodeScores } = computePersistence(topology.edges);
 *   topology.edges = edges;
 *   topology.nodeScores = nodeScores;
 */

import type { TopologicalEdge } from '../../src/types';

// ============================================================================
// RESULT TYPE
// ============================================================================

export interface PersistenceResult {
  /** Edges with persistence field populated (0–1) */
  edges: TopologicalEdge[];
  /** Node-level PageRank scores, normalized to 0–1 */
  nodeScores: Record<string, number>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DAMPING_FACTOR = 0.85;
const MAX_ITERATIONS = 40;
const CONVERGENCE_THRESHOLD = 1e-6;

// ============================================================================
// ADJACENCY STRUCTURE
// ============================================================================

interface AdjacencyGraph {
  /** All unique node IDs */
  nodes: string[];
  /** Edges grouped by source node (original direction) */
  edgesBySource: Map<string, TopologicalEdge[]>;
  /** Edges grouped by target node (original direction) */
  edgesByTarget: Map<string, TopologicalEdge[]>;
}

/**
 * Build bidirectional adjacency maps from the flat edge array.
 *
 * These maps serve double duty:
 *   - Original direction: edgesBySource = outbound, edgesByTarget = inbound
 *   - Reversed direction: edgesByTarget = outbound, edgesBySource = inbound
 *
 * PageRank on the reversed graph reads edgesByTarget as "outbound"
 * (where rank flows FROM) and edgesBySource as "inbound" (where rank flows TO).
 */
function buildAdjacency(edges: TopologicalEdge[]): AdjacencyGraph {
  const nodeSet = new Set<string>();
  const edgesBySource = new Map<string, TopologicalEdge[]>();
  const edgesByTarget = new Map<string, TopologicalEdge[]>();

  for (const edge of edges) {
    nodeSet.add(edge.sourceId);
    nodeSet.add(edge.targetId);

    // Group by source
    const bySource = edgesBySource.get(edge.sourceId);
    if (bySource) {
      bySource.push(edge);
    } else {
      edgesBySource.set(edge.sourceId, [edge]);
    }

    // Group by target
    const byTarget = edgesByTarget.get(edge.targetId);
    if (byTarget) {
      byTarget.push(edge);
    } else {
      edgesByTarget.set(edge.targetId, [edge]);
    }
  }

  return {
    nodes: Array.from(nodeSet),
    edgesBySource,
    edgesByTarget,
  };
}

// ============================================================================
// WEIGHTED PAGERANK (REVERSED GRAPH)
// ============================================================================

/**
 * Run weighted PageRank on the reversed graph.
 *
 * In the reversed graph:
 *   - "outbound" edges from node X = original edges where X is the TARGET
 *     (i.e., edgesByTarget.get(X))
 *   - When X distributes rank along these reversed-outbound edges,
 *     the rank flows to edge.sourceId (the original source becomes
 *     the reversed target — the recipient of rank)
 *
 * Each iteration:
 *   1. Every node distributes its score to neighbors via reversed edges,
 *      proportional to edge throughput.
 *   2. Each node's new score = damping * (sum of received rank)
 *                             + (1 - damping) / N
 *   3. Check convergence: if max score change < threshold, stop.
 *
 * Returns a Map of nodeId → PageRank score (sums to 1.0).
 */
function weightedPageRankReversed(graph: AdjacencyGraph): Map<string, number> {
  const { nodes, edgesByTarget } = graph;
  const N = nodes.length;
  const baseScore = 1 / N;
  const randomJump = (1 - DAMPING_FACTOR) / N;

  // Initialize: equal scores
  let scores = new Map<string, number>();
  for (const node of nodes) {
    scores.set(node, baseScore);
  }

  // Precompute total outbound throughput per node (in reversed direction)
  // Reversed outbound = original inbound = edgesByTarget
  const totalOutThroughput = new Map<string, number>();
  for (const node of nodes) {
    const outEdges = edgesByTarget.get(node) ?? [];
    let total = 0;
    for (const edge of outEdges) {
      total += edge.throughput;
    }
    totalOutThroughput.set(node, total);
  }

  // Iterate
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const nextScores = new Map<string, number>();

    // Initialize all next scores with the random jump component
    for (const node of nodes) {
      nextScores.set(node, randomJump);
    }

    // Distribute rank along reversed edges
    for (const node of nodes) {
      const currentScore = scores.get(node)!;
      const totalOut = totalOutThroughput.get(node)!;

      // Dangling node: no outbound edges in reversed graph.
      // Distribute rank equally to all nodes (standard PageRank convention).
      if (totalOut === 0) {
        const share = (DAMPING_FACTOR * currentScore) / N;
        for (const recipient of nodes) {
          nextScores.set(recipient, nextScores.get(recipient)! + share);
        }
        continue;
      }

      // Reversed outbound edges = original inbound = edgesByTarget
      const outEdges = edgesByTarget.get(node) ?? [];
      for (const edge of outEdges) {
        // In reversed graph, rank flows to edge.sourceId
        // (original source = reversed target = rank recipient)
        const recipient = edge.sourceId;
        const proportion = edge.throughput / totalOut;
        const rankTransfer = DAMPING_FACTOR * currentScore * proportion;
        nextScores.set(recipient, nextScores.get(recipient)! + rankTransfer);
      }
    }

    // Check convergence
    let maxDelta = 0;
    for (const node of nodes) {
      const delta = Math.abs(nextScores.get(node)! - scores.get(node)!);
      if (delta > maxDelta) maxDelta = delta;
    }

    scores = nextScores;

    if (maxDelta < CONVERGENCE_THRESHOLD) {
      console.log(
        `   - PageRank converged after ${iter + 1} iterations (maxΔ=${maxDelta.toExponential(2)})`,
      );
      break;
    }

    if (iter === MAX_ITERATIONS - 1) {
      console.log(
        `   - PageRank reached max iterations (${MAX_ITERATIONS}), maxΔ=${maxDelta.toExponential(2)}`,
      );
    }
  }

  return scores;
}

// ============================================================================
// EDGE PERSISTENCE MAPPING
// ============================================================================

/**
 * Map node PageRank scores to edge persistence values.
 *
 * Rule: persistence = (sourceScore + targetScore) / 2, normalized to 0–1.
 *
 * Normalized sum preserves information from both endpoints:
 * an edge touching anything important retains visibility,
 * unlike a product which would collapse edges where one side is weak.
 */
function mapScoresToEdges(
  edges: TopologicalEdge[],
  scores: Map<string, number>,
): TopologicalEdge[] {
  // First pass: compute raw persistence values
  const rawValues: number[] = [];
  for (const edge of edges) {
    const sourceScore = scores.get(edge.sourceId) ?? 0;
    const targetScore = scores.get(edge.targetId) ?? 0;
    rawValues.push((sourceScore + targetScore) / 2);
  }

  // Find min/max for normalization to 0–1
  let min = Infinity;
  let max = -Infinity;
  for (const val of rawValues) {
    if (val < min) min = val;
    if (val > max) max = val;
  }

  const range = max - min;

  // Second pass: normalize and assign
  return edges.map((edge, i) => ({
    ...edge,
    persistence: range > 0 ? (rawValues[i] - min) / range : 0,
  }));
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Normalize raw PageRank scores to 0–1 range.
 */
function normalizeScores(scores: Map<string, number>): Record<string, number> {
  let min = Infinity;
  let max = -Infinity;
  for (const val of scores.values()) {
    if (val < min) min = val;
    if (val > max) max = val;
  }

  const range = max - min;
  const normalized: Record<string, number> = {};

  for (const [nodeId, score] of scores) {
    normalized[nodeId] = range > 0 ? (score - min) / range : 0;
  }

  return normalized;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Compute persistence for all edges and nodes in the topology.
 *
 * Pure function: TopologicalEdge[] → { edges, nodeScores }
 *   - edges: same edges with persistence field populated (0–1)
 *   - nodeScores: per-node PageRank, normalized to 0–1
 */
export function computePersistence(
  edges: TopologicalEdge[],
): PersistenceResult {
  if (edges.length === 0) return { edges, nodeScores: {} };

  // Step 1: Build adjacency
  const graph = buildAdjacency(edges);
  console.log(
    `   - Built adjacency: ${graph.nodes.length} nodes, ${edges.length} edges`,
  );

  // Step 2: Run weighted PageRank on reversed graph
  const rawScores = weightedPageRankReversed(graph);

  // Step 3: Normalize node scores to 0–1
  const nodeScores = normalizeScores(rawScores);

  // Step 4: Map node scores → edge persistence (normalized sum)
  const annotatedEdges = mapScoresToEdges(edges, rawScores);

  // Log some stats
  const persistenceValues = annotatedEdges.map((e) => e.persistence);
  const avg =
    persistenceValues.reduce((a, b) => a + b, 0) / persistenceValues.length;
  const topNodes = Object.entries(nodeScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log(`   - Persistence range: 0.00–1.00, mean: ${avg.toFixed(3)}`);
  console.log(`   - Top 5 nodes by PageRank (normalized):`);
  for (const [nodeId, score] of topNodes) {
    console.log(`       ${nodeId}: ${score.toFixed(4)}`);
  }

  return { edges: annotatedEdges, nodeScores };
}
