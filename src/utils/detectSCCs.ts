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
 * Returns two things over ONE run of Tarjan:
 *   groups        — true cycles only (>1 member, or a self-loop). Hull /
 *                   sccGroupId input. Singletons excluded.
 *   condensation  — the full partition (EVERY node, singletons included) plus
 *                   the DAG between super-nodes. Feeds computeSCCLevels.
 */

import type { TopologicalEdge } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Filtered result: each inner array is one strongly connected component —
 * a group of node IDs that form a cycle. (True cycles only.)
 */
export type SCCGroups = string[][];

/**
 * The condensation graph: every SCC collapsed to a single super-node.
 * Always a DAG — two super-nodes pointing at each other would be mutually
 * reachable, i.e. one SCC, a contradiction.
 */
export interface Condensation {
  /**
   * superId (array index) → member node ids.
   * FULL partition: every node in exactly one component, singletons included.
   *
   * ORDER IS MEANINGFUL. Members are in Tarjan's emission order, which is
   * reverse-topological (sinks first, sources last). computeSCCLevels relies
   * on this to layer the DAG without a separate topological sort.
   */
  members: string[][];
  /** superId → downstream superIds. The DAG's edges. No self-loops by construction. */
  adjacency: Map<number, Set<number>>;
}

export interface SCCResult {
  groups: SCCGroups;
  condensation: Condensation;
}

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
// CONDENSATION
// ============================================================================

/**
 * Collapse each SCC into a super-node and record the edges BETWEEN super-nodes.
 *
 * superId = index into `members` (the full Tarjan partition). Intra-component
 * edges and self-loops fall away naturally (su === sv). Every super-node is a
 * key, so sinks appear with an empty downstream set — mirroring how
 * buildForwardAdjacency guarantees every node is a key.
 */
function buildCondensation(
  members: string[][],
  edges: TopologicalEdge[],
): Condensation {
  // node id → its super-node index
  const nodeToSuper = new Map<string, number>();
  members.forEach((group, superId) => {
    for (const id of group) nodeToSuper.set(id, superId);
  });

  const adjacency = new Map<number, Set<number>>();
  for (let s = 0; s < members.length; s++) adjacency.set(s, new Set());

  for (const edge of edges) {
    const su = nodeToSuper.get(edge.sourceId);
    const sv = nodeToSuper.get(edge.targetId);
    if (su === undefined || sv === undefined) continue;
    if (su !== sv) adjacency.get(su)!.add(sv);
  }

  return { members, adjacency };
}

// ============================================================================
// TARJAN'S ALGORITHM
// ============================================================================

/**
 * Detect all strongly connected components in the edge set.
 * Returns hull `groups` (true cycles) and the `condensation` (full partition
 * + super-node DAG), both from a single Tarjan pass.
 */
export function detectSCCs(edges: TopologicalEdge[]): SCCResult {
  if (edges.length === 0) {
    return { groups: [], condensation: { members: [], adjacency: new Map() } };
  }

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

  // allSCCs is now the FULL partition — every node, singletons included, in
  // Tarjan emission order (reverse-topological). Two consumers read from it:

  // 1. Condensation — the super-node DAG. Feeds longest-path layering.
  const condensation = buildCondensation(allSCCs, edges);

  // 2. Groups — true cycles only, for hull membership (sccGroupId):
  //      - groups with more than one member (multi-node cycle)
  //      - single-node groups only if the node has a self-loop
  const groups = allSCCs.filter(
    (scc) => scc.length > 1 || (scc.length === 1 && selfLoops.has(scc[0])),
  );

  return { groups, condensation };
}
