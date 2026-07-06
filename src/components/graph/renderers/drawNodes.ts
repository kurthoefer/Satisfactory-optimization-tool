import * as d3 from 'd3';
import type { GraphNode } from '@/types';
import { NODE_STYLES } from '../graphStyles';

export type NodeSelection = d3.Selection<
  SVGGElement,
  GraphNode,
  SVGGElement,
  unknown
>;

/**
 * Draws node <g>s with a base shape (class 'node-shape'): circle for products,
 * rounded square for recipes. Emphasis — size + thumbnail for pinned/target —
 * is applied separately by createEmphasisPainter. Pure render.
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

  const p = NODE_STYLES.product;
  nodeGroups
    .filter((d) => d.payload.type === 'product')
    .append('circle')
    .attr('class', 'node-shape')
    .attr('r', p.radius)
    .attr('fill', p.fill)
    .attr('stroke', p.stroke)
    .attr('stroke-width', p.strokeWidth);

  const r = NODE_STYLES.recipe;
  nodeGroups
    .filter((d) => d.payload.type === 'recipe')
    .append('rect')
    .attr('class', 'node-shape')
    .attr('x', -r.size / 2)
    .attr('y', -r.size / 2)
    .attr('width', r.size)
    .attr('height', r.size)
    .attr('rx', r.rx)
    .attr('fill', r.fill)
    .attr('stroke', r.stroke)
    .attr('stroke-width', r.strokeWidth);

  return nodeGroups;
}
