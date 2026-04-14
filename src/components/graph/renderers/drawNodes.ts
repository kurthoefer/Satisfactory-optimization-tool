/**
 * drawNodes.ts
 *
 * Appends node <g> groups to the SVG, each containing the
 * appropriate shape: circle for products, vesica piscis for recipes.
 *
 * Returns the D3 selection so the caller can wire up tick updates,
 * drag behavior, and click handlers.
 *
 * Pure rendering — no layout or simulation logic.
 */

import * as d3 from 'd3';
import type { GraphNode } from '@/types';
import { NODE_STYLES, RECIPE_PATH } from '../graphStyles';

// ============================================================================
// TYPES
// ============================================================================

export type NodeSelection = d3.Selection<
  SVGGElement,
  GraphNode,
  SVGGElement,
  unknown
>;

// ============================================================================
// MAIN
// ============================================================================

/**
 * Draw all nodes into the given SVG <g> container.
 *
 * Products get <circle>, recipes get <path> (vesica piscis).
 */
export function drawNodes(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  nodes: GraphNode[],
): NodeSelection {
  const nodeGroups = container
    .append('g')
    .attr('class', 'nodes')
    .selectAll<SVGGElement, GraphNode>('g')
    .data(nodes)
    .join('g')
    .attr('class', 'node')
    .attr('cursor', 'pointer');

  // --- Products: circles ---
  nodeGroups
    .filter((d) => d.payload.type === 'product')
    .append('circle')
    .attr('r', NODE_STYLES.product.radius)
    .attr('fill', NODE_STYLES.product.fill)
    .attr('stroke', NODE_STYLES.product.stroke)
    .attr('stroke-width', NODE_STYLES.product.strokeWidth);

  // --- Recipes: vesica piscis ---
  nodeGroups
    .filter((d) => d.payload.type === 'recipe')
    .append('path')
    .attr('d', RECIPE_PATH)
    .attr('fill', NODE_STYLES.recipe.fill)
    .attr('stroke', NODE_STYLES.recipe.stroke)
    .attr('stroke-width', NODE_STYLES.recipe.strokeWidth);

  return nodeGroups;
}
