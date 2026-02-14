/**
 * drawLinks.ts
 *
 * Appends link <line> elements to the SVG.
 * Returns the selection for tick updates.
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
 * Draw all visible links into the given SVG <g> container.
 *
 * Focused links are styled with opacity and width scaled by throughput.
 * Unfocused links are faint hairlines.
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
    .attr('stroke-opacity', (d) =>
      d.focus ? LINK_STYLES.focusedOpacity : LINK_STYLES.unfocusedOpacity,
    )
    .attr('stroke-width', (d) =>
      d.focus ? Math.max(1, Math.log10(d.throughput + 1) * 2) : 0.5,
    );
}
