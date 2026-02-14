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
import {
  NODE_STYLES,
  RECIPE_PATH,
  RECIPE_PATH_UNFOCUSED,
} from '../graphStyles';

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
 * Draw all visible nodes into the given SVG <g> container.
 *
 * Each node is a <g> translated to (x, y) on tick.
 * Focused products get <circle>, focused recipes get <path>.
 * Unfocused nodes get a small shape at reduced opacity.
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
    .attr('class', 'node');

  // --- Focused products: circles ---
  nodeGroups
    .filter((d) => d.focus && d.payload.type === 'product')
    .append('circle')
    .attr('r', NODE_STYLES.product.radius)
    .attr('fill', NODE_STYLES.product.fill)
    .attr('stroke', NODE_STYLES.product.stroke)
    .attr('stroke-width', NODE_STYLES.product.strokeWidth);

  // --- Focused recipes: vesica piscis ---
  nodeGroups
    .filter((d) => d.focus && d.payload.type === 'recipe')
    .append('path')
    .attr('d', RECIPE_PATH)
    .attr('fill', NODE_STYLES.recipe.fill)
    .attr('stroke', NODE_STYLES.recipe.stroke)
    .attr('stroke-width', NODE_STYLES.recipe.strokeWidth);

  // --- Unfocused products: small circles ---
  nodeGroups
    .filter((d) => !d.focus && d.payload.type === 'product')
    .append('circle')
    .attr('r', NODE_STYLES.unfocused.radius)
    .attr('fill', NODE_STYLES.unfocused.fill)
    .attr('stroke', NODE_STYLES.unfocused.stroke)
    .attr('stroke-width', NODE_STYLES.unfocused.strokeWidth)
    .attr('opacity', NODE_STYLES.unfocused.opacity);

  // --- Unfocused recipes: small vesica piscis ---
  nodeGroups
    .filter((d) => !d.focus && d.payload.type === 'recipe')
    .append('path')
    .attr('d', RECIPE_PATH_UNFOCUSED)
    .attr('fill', NODE_STYLES.unfocused.fill)
    .attr('stroke', NODE_STYLES.unfocused.stroke)
    .attr('stroke-width', NODE_STYLES.unfocused.strokeWidth)
    .attr('opacity', NODE_STYLES.unfocused.opacity);

  // --- Cursor ---
  nodeGroups.attr('cursor', (d) => (d.focus ? 'pointer' : 'default'));

  return nodeGroups;
}
