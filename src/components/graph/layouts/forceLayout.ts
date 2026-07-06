/**
 * forceLayout.ts
 *
 * Creates and manages a D3 force simulation.
 * Nodes are stratified vertically by SCC level (the flow layout); x is a weak
 * leash. Link tuning is SCC-aware (tight intra, slack cross), and a gentle
 * centroid gravity coheres each SCC into a readable blob.
 *
 * Returns a cleanup function to stop the simulation.
 */

import * as d3 from 'd3';
import type { GraphNode, GraphEdge } from '@/types';
import type { NodeSelection } from '../renderers/drawNodes';
import type { LinkSelection } from '../renderers/drawLinks';

// ============================================================================
// TYPES
// ============================================================================

export interface ForceLayoutOptions {
  width: number;
  height: number;
  nodes: GraphNode[];
  links: GraphEdge[];
  nodeSelection: NodeSelection;
  linkSelection: LinkSelection;
  onNodeClick?: (nodeId: string) => void;
}

export interface ForceLayoutResult {
  simulation: d3.Simulation<GraphNode, GraphEdge>;
  /** Call to stop the simulation and clean up. */
  cleanup: () => void;
}

// ============================================================================
// TUNING KNOBS
// ============================================================================

const BAND_PADDING = 40;
const BAND_FLOOR = 0.35;

const LINK_DISTANCE_INTRA = 26;
const LINK_DISTANCE_CROSS_MAX = 380;
const LINK_STRENGTH_INTRA = 1.0; // x base
const LINK_STRENGTH_CROSS = 0.2; // x base

const CHARGE_STRENGTH = -150;
const FORCE_X_STRENGTH = 0.03;
const FORCE_Y_STRENGTH = 0.18;
const VELOCITY_DECAY = 0.45;

// Gentle by design — must not overpower external links (the outward pull that
// bulges a hull toward its interface with the chain is signal, not noise).
// Too loose a blob? raise toward ~0.12. Blob crushed to a dot / interface lost?
// lower. Cooperates with forceY: members share a band, so the centroid sits on
// it and this acts mostly horizontally.
const SCC_CENTROID_STRENGTH = 0.06;

// ============================================================================
// HELPERS
// ============================================================================

/** True when both endpoints belong to the same SCC (same non-null group). */
function isIntraSCC(edge: GraphEdge): boolean {
  const s = edge.source as GraphNode;
  const t = edge.target as GraphNode;
  return s.sccGroupId !== null && s.sccGroupId === t.sccGroupId;
}

/**
 * Intra-cluster centroid gravity. Groups members once at initialize, then each
 * tick pulls every member toward its group's live centroid. Alpha-scaled, so
 * it fades as the sim settles like every other force.
 */
function forceSCCCentroid(strength: number): d3.Force<GraphNode, GraphEdge> {
  let groups: GraphNode[][] = [];

  function force(alpha: number) {
    const k = strength * alpha;
    for (const members of groups) {
      let cx = 0;
      let cy = 0;
      for (const n of members) {
        cx += n.x ?? 0;
        cy += n.y ?? 0;
      }
      cx /= members.length;
      cy /= members.length;
      for (const n of members) {
        n.vx = (n.vx ?? 0) + (cx - (n.x ?? 0)) * k;
        n.vy = (n.vy ?? 0) + (cy - (n.y ?? 0)) * k;
      }
    }
  }

  force.initialize = (nodes: GraphNode[]) => {
    const byGroup = new Map<number, GraphNode[]>();
    for (const n of nodes) {
      if (n.sccGroupId === null) continue;
      const arr = byGroup.get(n.sccGroupId);
      if (arr) arr.push(n);
      else byGroup.set(n.sccGroupId, [n]);
    }
    groups = [...byGroup.values()];
  };

  return force;
}

// ============================================================================
// STRATIFICATION
// ============================================================================

function buildLevelToY(
  nodes: GraphNode[],
  height: number,
): (level: number) => number {
  const total = nodes.length || 1;

  let maxLevel = 0;
  const counts = new Map<number, number>();
  for (const n of nodes) {
    counts.set(n.sccLevel, (counts.get(n.sccLevel) ?? 0) + 1);
    if (n.sccLevel > maxLevel) maxLevel = n.sccLevel;
  }

  const bandCount = maxLevel + 1;
  const usable = Math.max(1, height - BAND_PADDING * 2);
  const floorPer = (usable * BAND_FLOOR) / bandCount;
  const popPool = usable * (1 - BAND_FLOOR);

  const centerByLevel = new Map<number, number>();
  let cursor = BAND_PADDING;
  for (let level = maxLevel; level >= 0; level--) {
    const slot = floorPer + popPool * ((counts.get(level) ?? 0) / total);
    centerByLevel.set(level, cursor + slot / 2);
    cursor += slot;
  }

  return (level) => centerByLevel.get(level) ?? height / 2;
}

// ============================================================================
// MAIN
// ============================================================================

export function createForceLayout(
  options: ForceLayoutOptions,
): ForceLayoutResult {
  const {
    width,
    height,
    nodes,
    links,
    nodeSelection,
    linkSelection,
    onNodeClick,
  } = options;

  const levelToY = buildLevelToY(nodes, height);

  // --- Simulation ---
  const simulation = d3
    .forceSimulation<GraphNode>(nodes)
    .velocityDecay(VELOCITY_DECAY)
    .force(
      'link',
      d3
        .forceLink<GraphNode, GraphEdge>(links)
        .id((d) => d.id)
        .distance((d) =>
          isIntraSCC(d)
            ? LINK_DISTANCE_INTRA
            : Math.min(d.weight * 60, LINK_DISTANCE_CROSS_MAX),
        )
        .strength((d) => {
          const s = d.source as GraphNode;
          const t = d.target as GraphNode;
          // Preserve D3's default hub stabilizer, then bias intra vs cross.
          const base = 1 / Math.min(s.degree || 1, t.degree || 1);
          return (
            base * (isIntraSCC(d) ? LINK_STRENGTH_INTRA : LINK_STRENGTH_CROSS)
          );
        }),
    )
    .force('charge', d3.forceManyBody().strength(CHARGE_STRENGTH))
    .force('x', d3.forceX(width / 2).strength(FORCE_X_STRENGTH))
    .force(
      'y',
      d3
        .forceY<GraphNode>((d) => levelToY(d.sccLevel))
        .strength(FORCE_Y_STRENGTH),
    )
    .force('sccCentroid', forceSCCCentroid(SCC_CENTROID_STRENGTH));

  // --- Tick: write positions to the SVG ---
  simulation.on('tick', () => {
    linkSelection
      .attr('x1', (d) => (d.source as GraphNode).x!)
      .attr('y1', (d) => (d.source as GraphNode).y!)
      .attr('x2', (d) => (d.target as GraphNode).x!)
      .attr('y2', (d) => (d.target as GraphNode).y!);

    nodeSelection.attr(
      'transform',
      (d) => `translate(${d.x ?? 0},${d.y ?? 0})`,
    );
  });

  // --- Click handler ---
  if (onNodeClick) {
    nodeSelection.on('click', (_event, d) => {
      onNodeClick(d.id);
    });
  }

  // --- Drag behavior ---
  const drag = d3
    .drag<SVGGElement, GraphNode>()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on('drag', (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });

  nodeSelection.call(drag);

  // --- Cleanup ---
  const cleanup = () => {
    simulation.stop();
  };

  return { simulation, cleanup };
}
