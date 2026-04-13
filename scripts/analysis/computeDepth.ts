/**
 * computeDepth
 *
 * Multi-root BFS from all base resources to establish
 * production flow directionality across the graph.
 *
 * Every node gets a depth: its shortest distance (in hops)
 * from any raw resource. Depth 0 = base resource, depth
 * increases toward end products.
 *
 * Primary use: identifying feedback edges inside SCCs.
 * An edge inside an SCC that flows from higher depth to
 * lower depth is a feedback/recycling edge — it flows
 * against the primary production current.
 *
 * Build-time only. The resulting depth map is written to
 * topology.json and consumed at runtime as static data.
 */

import type { TopologicalEdge } from '../../src/types';

// ============================================================================
// TYPES
// ============================================================================

export interface DepthResult {
  /** Node className → shortest distance from any base resource */
  nodeDepths: Record<string, number>;
  /** Nodes that were unreachable from any base resource */
  unreachable: string[];
}

export interface DepthOptions {
  verbose?: boolean;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Compute depth for all nodes via multi-root BFS.
 *
 * Starts from all base resource classNames simultaneously at depth 0.
 * Traverses edges in both directions (product → recipe and recipe → product)
 * since depth represents distance in the undirected sense — how many
 * transformation steps separate this node from raw materials.
 *
 * @param edges - The full TopologicalEdge set
 * @param baseResourceClassNames - Set of classNames that are raw resources
 * @param options - Optional verbose logging
 */
export function computeDepth(
  edges: TopologicalEdge[],
  baseResourceClassNames: Set<string>,
  options: DepthOptions = {},
): DepthResult {
  const { verbose = false } = options;

  // Build undirected adjacency: for each node, all connected neighbors
  const adjacency = new Map<string, Set<string>>();

  function addEdge(a: string, b: string) {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  }

  for (const edge of edges) {
    addEdge(edge.sourceId, edge.targetId);
  }

  // Multi-root BFS: all base resources start at depth 0
  const depths = new Map<string, number>();
  const queue: string[] = [];

  for (const resourceId of baseResourceClassNames) {
    // Only include base resources that actually appear in the edge set
    if (adjacency.has(resourceId)) {
      depths.set(resourceId, 0);
      queue.push(resourceId);
    }
  }

  // BFS traversal
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths.get(current)!;

    const neighbors = adjacency.get(current) ?? new Set();
    for (const neighbor of neighbors) {
      if (!depths.has(neighbor)) {
        depths.set(neighbor, currentDepth + 1);
        queue.push(neighbor);
      }
    }
  }

  // Identify unreachable nodes (not connected to any base resource)
  const allNodes = new Set(adjacency.keys());
  const unreachable: string[] = [];
  for (const nodeId of allNodes) {
    if (!depths.has(nodeId)) {
      unreachable.push(nodeId);
    }
  }

  // Convert to Record for JSON serialization
  const nodeDepths: Record<string, number> = {};
  for (const [nodeId, depth] of depths) {
    nodeDepths[nodeId] = depth;
  }

  if (verbose) {
    const maxDepth = Math.max(...depths.values());
    const depthCounts = new Map<number, number>();
    for (const depth of depths.values()) {
      depthCounts.set(depth, (depthCounts.get(depth) ?? 0) + 1);
    }

    console.log(
      `   - Assigned depth to ${depths.size} nodes (max depth: ${maxDepth})`,
    );
    console.log(
      `   - ${unreachable.length} nodes unreachable from base resources`,
    );
    console.log(`   - Depth distribution:`);
    for (const [depth, count] of [...depthCounts.entries()].sort(
      (a, b) => a[0] - b[0],
    )) {
      console.log(`       depth ${depth}: ${count} nodes`);
    }
  }

  return { nodeDepths, unreachable };
}
