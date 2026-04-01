/**
 * detectSCCs
 *
 * Tarjan's algorithm for finding strongly connected components
 * in a directed graph represented as TopologicalEdge[].
 *
 * Pure function — no side effects, no framework dependencies.
 * Used at build time on the full edge set and at runtime on
 * filtered edge subsets.
 *
 * Returns only "true" SCCs — groups with more than one member,
 * or single nodes with a self-loop. Singleton nodes that aren't
 * in any cycle are excluded.
 */

import type { TopologicalEdge } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of SCC detection.
 * Each inner array is one strongly connected component —
 * a group of node IDs that form a cycle.
 */
export type SCCGroups = string[][];

// ============================================================================
// ADJACENCY
// ============================================================================

/**
 * Build a forward adjacency map from edges.
 * For each node, collect all nodes it has an edge pointing TO.
 *
 * This operates on the original edge direction:
 *   product → recipe (ingredient flows in)
 *   recipe → product (product flows out)
 */
function buildForwardAdjacency(
  edges: TopologicalEdge[],
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  // Ensure every node appears as a key, even with no outgoing edges
  for (const edge of edges) {
    if (!adjacency.has(edge.sourceId)) adjacency.set(edge.sourceId, []);
    if (!adjacency.has(edge.targetId)) adjacency.set(edge.targetId, []);
  }

  for (const edge of edges) {
    adjacency.get(edge.sourceId)!.push(edge.targetId);
  }

  return adjacency;
}

// ============================================================================
// SELF-LOOP DETECTION
// ============================================================================

/**
 * Check if a node has an edge pointing to itself.
 * Needed to identify single-node SCCs that are true cycles.
 */
function buildSelfLoopSet(edges: TopologicalEdge[]): Set<string> {
  const selfLoops = new Set<string>();
  for (const edge of edges) {
    if (edge.sourceId === edge.targetId) {
      selfLoops.add(edge.sourceId);
    }
  }
  return selfLoops;
}

// ============================================================================
// TARJAN'S ALGORITHM
// ============================================================================

/**
 * Detect all strongly connected components in the edge set.
 *
 * Returns groups with >1 member or single members with self-loops.
 * Singletons without self-loops are not cycles and are excluded.
 */
export function detectSCCs(edges: TopologicalEdge[]): SCCGroups {
  if (edges.length === 0) return [];

  const adjacency = buildForwardAdjacency(edges);
  const selfLoops = buildSelfLoopSet(edges);

  let index = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const allSCCs: string[][] = [];

  function strongConnect(nodeId: string) {
    indices.set(nodeId, index);
    lowLinks.set(nodeId, index);
    index++;
    stack.push(nodeId);
    onStack.add(nodeId);

    const successors = adjacency.get(nodeId) ?? [];
    for (const successor of successors) {
      if (!indices.has(successor)) {
        // Successor not yet visited — recurse
        strongConnect(successor);
        lowLinks.set(
          nodeId,
          Math.min(lowLinks.get(nodeId)!, lowLinks.get(successor)!),
        );
      } else if (onStack.has(successor)) {
        // Successor is on the stack — part of the current SCC
        lowLinks.set(
          nodeId,
          Math.min(lowLinks.get(nodeId)!, indices.get(successor)!),
        );
      }
    }

    // If nodeId is a root node of an SCC, pop the stack
    if (lowLinks.get(nodeId) === indices.get(nodeId)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== nodeId);
      allSCCs.push(scc);
    }
  }

  // Visit every node (handles disconnected components)
  for (const nodeId of adjacency.keys()) {
    if (!indices.has(nodeId)) {
      strongConnect(nodeId);
    }
  }

  // Filter to true cycles only:
  //   - Groups with more than one member (multi-node cycle)
  //   - Single-node groups only if the node has a self-loop
  return allSCCs.filter(
    (scc) => scc.length > 1 || (scc.length === 1 && selfLoops.has(scc[0])),
  );
}
