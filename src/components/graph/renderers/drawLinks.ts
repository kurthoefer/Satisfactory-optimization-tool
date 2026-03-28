/**
 * drawLinks.ts
 *
 * Appends link <line> elements to the SVG.
 * Returns the selection for tick updates.
 *
 * Stroke width scales with throughput — thicker lines
 * carry more material. This is the primary "feel the volume"
 * visual channel.
 *
 * Pure rendering — no layout or simulation logic.
 */

import * as d3 from 'd3';
import type { GraphNode, GraphEdge } from '@/types';
import { LINK_STYLES } from '../graphStyles';

// ============================================================================
// TYPES
// ============================================================================

export type LinkSelection = d3.Selection<
  SVGLineElement,
  GraphEdge,
  SVGGElement,
  unknown
>;

// ============================================================================
// MAIN
// ============================================================================

/**
 * Draw all links into the given SVG <g> container.
 *
 * Width scales with throughput (log scale to tame extremes).
 * All links are rendered — filtering happens upstream in the graph builder.
 */
export function drawLinks(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  links: GraphEdge[],
): LinkSelection {
  return container
    .append('g')
    .attr('class', 'links')
    .selectAll<SVGLineElement, GraphEdge>('line')
    .data(links)
    .join('line')
    .attr('stroke', LINK_STYLES.stroke)
    .attr('stroke-opacity', LINK_STYLES.Opacity)
    .attr('stroke-width', (d) => Math.max(1, Math.log10(d.throughput + 1) * 2));
}
