import * as d3 from 'd3';
import type { GraphEdge } from '@/types';
import { LINK_STYLES } from '../graphStyles';

export type LinkSelection = d3.Selection<
  SVGLineElement,
  GraphEdge,
  SVGGElement,
  unknown
>;

/** Draws link <line>s; width encodes throughput (log-scaled). Pure render. */
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
    .attr('stroke-opacity', LINK_STYLES.opacity)
    .attr('stroke-width', (d) => Math.max(1, Math.log10(d.throughput + 1) * 2));
}
