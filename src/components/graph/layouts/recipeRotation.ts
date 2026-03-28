/**
 * recipeRotation.ts
 *
 * Computes rotation angles for recipe (vesica piscis) nodes so their
 * tips align with the flow direction: ingredients enter one tip,
 * products exit the other.
 *
 * Three pieces:
 *   1. buildNeighborIndex  — one-time setup mapping each recipe to its
 *                            in-neighbor and out-neighbor node IDs.
 *   2. computeRecipeAngle  — pure math: given in/out centroids and the
 *                            node's own position, returns degrees.
 *   3. createRotationUpdater — alpha-gated: reads simulation energy to
 *                              throttle rotation recomputation.
 *                              High alpha (chaotic) = less frequent.
 *                              Low alpha (settled) = more frequent.
 */

import type { GraphNode, GraphEdge } from '@/types';
import type { NodeSelection } from '../renderers/drawNodes';

// ============================================================================
// TYPES
// ============================================================================

interface NeighborEntry {
  /** IDs of nodes whose edges point INTO this recipe (ingredients) */
  inIds: string[];
  /** IDs of nodes whose edges point OUT of this recipe (products) */
  outIds: string[];
}

// ============================================================================
// 1. NEIGHBOR INDEX
// ============================================================================

/**
 * Build a lookup from recipe node ID → { inIds, outIds }.
 *
 * Edge convention (bipartite):
 *   product → recipe  = ingredient flowing in
 *   recipe → product  = product flowing out
 *
 * Only recipe nodes get entries. Product nodes don't rotate.
 */
export function buildNeighborIndex(
  nodes: GraphNode[],
  links: GraphEdge[],
): Map<string, NeighborEntry> {
  const recipeIds = new Set(
    nodes.filter((n) => n.payload.type === 'recipe').map((n) => n.id),
  );

  const index = new Map<string, NeighborEntry>();

  for (const id of recipeIds) {
    index.set(id, { inIds: [], outIds: [] });
  }

  for (const link of links) {
    const sourceId =
      typeof link.source === 'string' ? link.source : link.source.id;
    const targetId =
      typeof link.target === 'string' ? link.target : link.target.id;

    // product → recipe: ingredient flowing in
    if (recipeIds.has(targetId)) {
      index.get(targetId)!.inIds.push(sourceId);
    }

    // recipe → product: product flowing out
    if (recipeIds.has(sourceId)) {
      index.get(sourceId)!.outIds.push(targetId);
    }
  }

  return index;
}

// ============================================================================
// 2. ANGLE COMPUTATION
// ============================================================================

/**
 * Compute the rotation angle (in degrees) for a recipe node.
 *
 * Finds the centroid of in-neighbors and out-neighbors,
 * then returns the angle of the vector from in-centroid to out-centroid.
 *
 * If only one side has neighbors, uses the vector from/to the node itself.
 * If no neighbors exist, returns 0.
 */
export function computeRecipeAngle(
  nodeX: number,
  nodeY: number,
  inPositions: Array<{ x: number; y: number }>,
  outPositions: Array<{ x: number; y: number }>,
): number {
  const inCentroid = centroid(inPositions);
  const outCentroid = centroid(outPositions);

  let dx: number;
  let dy: number;

  if (inCentroid && outCentroid) {
    // Full case: angle from in-centroid → out-centroid
    dx = outCentroid.x - inCentroid.x;
    dy = outCentroid.y - inCentroid.y;
  } else if (inCentroid) {
    // Only inputs: point away from them
    dx = nodeX - inCentroid.x;
    dy = nodeY - inCentroid.y;
  } else if (outCentroid) {
    // Only outputs: point toward them
    dx = outCentroid.x - nodeX;
    dy = outCentroid.y - nodeY;
  } else {
    return 0;
  }

  // atan2 gives radians from positive X axis; convert to degrees
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

function centroid(
  points: Array<{ x: number; y: number }>,
): { x: number; y: number } | null {
  if (points.length === 0) return null;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  return { x: sumX / points.length, y: sumY / points.length };
}

// ============================================================================
// 3. ALPHA-GATED ROTATION UPDATER
// ============================================================================

/**
 * Tuning knobs for rotation frequency at different simulation states.
 *
 * Alpha ranges from ~1.0 (chaotic) toward 0 (settled).
 */
export interface RotationConfig {
  /** Alpha above which the simulation is considered chaotic. Default: 0.3 */
  chaoticThreshold: number;

  /** Tick interval for rotation when simulation is calm. Default: 8 */
  calmInterval: number;

  /** Tick interval for rotation when simulation is chaotic. Default: 20 */
  chaoticInterval: number;
}

const DEFAULT_ROTATION_CONFIG: RotationConfig = {
  chaoticThreshold: 0.3,
  calmInterval: 8,
  chaoticInterval: 20,
};

/**
 * Creates an alpha-gated rotation function.
 *
 * Behavior by simulation state:
 *   - Chaotic (alpha > threshold): rotate less frequently (positions unstable)
 *   - Calm (alpha ≤ threshold): rotate more frequently (positions settling)
 *
 * visuallyHidden nodes are excluded from rotation computation
 * but still receive translate transforms for correct positioning.
 */
export function createRotationUpdater(
  nodes: GraphNode[],
  links: GraphEdge[],
  nodeSelection: NodeSelection,
  getAlpha: () => number,
  config: Partial<RotationConfig> = {},
) {
  const { chaoticThreshold, calmInterval, chaoticInterval } = {
    ...DEFAULT_ROTATION_CONFIG,
    ...config,
  };

  const neighborIndex = buildNeighborIndex(nodes, links);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Collect recipe IDs that are visible (not hidden)
  const visibleRecipeIds: string[] = [];
  for (const [recipeId] of neighborIndex) {
    const node = nodeById.get(recipeId);
    if (!node) continue;
    if (!node.visuallyHidden) {
      visibleRecipeIds.push(recipeId);
    }
  }

  // Cache of current angles per recipe — persists between ticks
  const angleCache = new Map<string, number>();

  let tickCount = 0;

  /**
   * Recompute angles for a subset of recipe IDs.
   */
  function updateAngles(recipeIds: string[]) {
    for (const recipeId of recipeIds) {
      const node = nodeById.get(recipeId);
      if (!node || node.x == null || node.y == null) continue;

      const neighbors = neighborIndex.get(recipeId)!;

      const inPositions = neighbors.inIds
        .map((id) => nodeById.get(id))
        .filter((n): n is GraphNode => n != null && n.x != null && n.y != null)
        .map((n) => ({ x: n.x!, y: n.y! }));

      const outPositions = neighbors.outIds
        .map((id) => nodeById.get(id))
        .filter((n): n is GraphNode => n != null && n.x != null && n.y != null)
        .map((n) => ({ x: n.x!, y: n.y! }));

      angleCache.set(
        recipeId,
        computeRecipeAngle(node.x, node.y, inPositions, outPositions),
      );
    }
  }

  /**
   * Call every tick. Reads alpha to decide rotation frequency.
   * Always applies translate + cached rotation to all nodes.
   */
  return function onTick() {
    tickCount++;
    const alpha = getAlpha();
    const isChaotic = alpha > chaoticThreshold;
    const interval = isChaotic ? chaoticInterval : calmInterval;

    if (tickCount % interval === 0) {
      updateAngles(visibleRecipeIds);
    }

    // Apply transform: translate + cached rotation
    nodeSelection.attr('transform', (d) => {
      const angle = angleCache.get(d.id);
      if (angle != null) {
        return `translate(${d.x},${d.y}) rotate(${angle})`;
      }
      return `translate(${d.x},${d.y})`;
    });
  };
}
