/**
 * forceLayout.ts
 *
 * Creates and manages a D3 force simulation.
 * Wires tick updates to the provided node/link selections.
 * Attaches drag behavior to all nodes.
 * Integrates throttled recipe rotation via recipeRotation.ts.
 *
 * Returns a cleanup function to stop the simulation.
 */

import * as d3 from 'd3';
import type { GraphNode, GraphEdge } from '@/types';
import type { NodeSelection } from '../renderers/drawNodes';
import type { LinkSelection } from '../renderers/drawLinks';
import { createRotationUpdater, type RotationConfig } from './recipeRotation';

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
  /** Tuning knobs for alpha-gated recipe rotation. */
  rotationConfig?: Partial<RotationConfig>;
}

export interface ForceLayoutResult {
  simulation: d3.Simulation<GraphNode, GraphEdge>;
  /** Call to stop the simulation and clean up. */
  cleanup: () => void;
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
    rotationConfig,
  } = options;

  // --- Simulation ---
  const simulation = d3
    .forceSimulation<GraphNode>(nodes)
    .force(
      'link',
      d3
        .forceLink<GraphNode, GraphEdge>(links)
        .id((d) => d.id)
        .distance((d) => Math.min(d.weight * 50, 300)),
    )
    .force('charge', d3.forceManyBody().strength(-150))
    .force('center', d3.forceCenter(width / 2, height / 2));

  // --- Recipe rotation (alpha-gated) ---
  const rotationTick = createRotationUpdater(
    nodes,
    links,
    nodeSelection,
    () => simulation.alpha(),
    rotationConfig,
  );

  // --- Tick: update positions + rotation ---
  simulation.on('tick', () => {
    // Links: update endpoints
    linkSelection
      .attr('x1', (d) => (d.source as GraphNode).x!)
      .attr('y1', (d) => (d.source as GraphNode).y!)
      .attr('x2', (d) => (d.target as GraphNode).x!)
      .attr('y2', (d) => (d.target as GraphNode).y!);

    // Nodes: translate + throttled rotation (handled inside rotationTick)
    rotationTick();
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
