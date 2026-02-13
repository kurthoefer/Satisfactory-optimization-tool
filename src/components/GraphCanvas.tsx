/**
 * GraphCanvas
 *
 * Rendering terminal for the force-directed graph.
 * Receives pre-tagged { nodes, links } and a viewMode.
 * Owns the D3 simulation lifecycle, zoom, and interaction events.
 *
 * Does NOT know about products, recipes, URLs, or traversal rules.
 * Data goes in, visuals come out, interactions bubble up.
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

import type { GraphNode, GraphEdge } from '@/types';
import type { ViewMode } from '@/hooks/useTraversalRules';

// ============================================================================
// STYLE CONSTANTS
// ============================================================================

const STYLE = {
  // Focused nodes
  product: {
    radius: 12,
    fill: '#3b82f6',
  },
  recipe: {
    radius: 8,
    fill: '#f59e0b',
  },

  // Unfocused nodes (big picture mode)
  unfocused: {
    radius: 4,
    fill: '#cbd5e1',
    opacity: 0.3,
  },

  // Links
  link: {
    stroke: '#94a3b8',
    focusedOpacity: 0.6,
    unfocusedOpacity: 0.1,
  },
} as const;

// ============================================================================
// PROPS
// ============================================================================

interface GraphCanvasProps {
  nodes: GraphNode[];
  links: GraphEdge[];
  viewMode: ViewMode;
  onNodeClick?: (nodeId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function GraphCanvas({
  nodes,
  links,
  viewMode,
  onNodeClick,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(
    null,
  );

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    // --- Semantic zoom group ---
    const g = svg.append('g');

    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.05, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        }),
    );

    // --- Filter data based on view mode ---
    const visibleNodes =
      viewMode === 'focused' ? nodes.filter((n) => n.focus) : nodes;

    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

    const visibleLinks = links.filter(
      (l) =>
        visibleNodeIds.has(
          typeof l.source === 'string' ? l.source : l.source.id,
        ) &&
        visibleNodeIds.has(
          typeof l.target === 'string' ? l.target : l.target.id,
        ),
    );

    // --- Simulation ---
    const simulation = d3
      .forceSimulation<GraphNode>(visibleNodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphEdge>(visibleLinks)
          .id((d) => d.id)
          .distance((d) => Math.min(d.weight * 50, 300)),
      )
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2));

    simulationRef.current = simulation;

    // --- Draw links ---
    const link = g
      .append('g')
      .selectAll('line')
      .data(visibleLinks)
      .join('line')
      .attr('stroke', STYLE.link.stroke)
      .attr('stroke-opacity', (d) =>
        d.focus ? STYLE.link.focusedOpacity : STYLE.link.unfocusedOpacity,
      )
      .attr('stroke-width', (d) =>
        d.focus ? Math.max(1, Math.log10(d.throughput + 1) * 2) : 0.5,
      );

    // --- Draw nodes ---
    const node = g
      .append('g')
      .selectAll('circle')
      .data(visibleNodes)
      .join('circle')
      .attr('r', (d) => {
        if (!d.focus) return STYLE.unfocused.radius;
        return d.payload.type === 'recipe'
          ? STYLE.recipe.radius
          : STYLE.product.radius;
      })
      .attr('fill', (d) => {
        if (!d.focus) return STYLE.unfocused.fill;
        return d.payload.type === 'recipe'
          ? STYLE.recipe.fill
          : STYLE.product.fill;
      })
      .attr('opacity', (d) => (d.focus ? 1 : STYLE.unfocused.opacity))
      .attr('stroke', (d) => (d.focus ? '#fff' : 'none'))
      .attr('stroke-width', (d) => (d.focus ? 1.5 : 0))
      .attr('cursor', (d) => (d.focus ? 'pointer' : 'default'));

    // --- Tooltips (focused nodes only) ---
    node
      .filter((d) => d.focus)
      .append('title')
      .text((d) => {
        const data = d.payload.data;
        if (!data) return d.id;
        return 'name' in data
          ? data.name
          : 'displayName' in data
            ? data.displayName
            : d.id;
      });

    // --- Click handler ---
    if (onNodeClick) {
      node
        .filter((d) => d.focus)
        .on('click', (_event, d) => {
          onNodeClick(d.id);
        });
    }

    // --- Drag behavior (focused nodes only) ---
    const drag = d3
      .drag<SVGCircleElement, GraphNode>()
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

    (
      node.filter((d) => d.focus) as d3.Selection<
        SVGCircleElement,
        GraphNode,
        SVGGElement,
        unknown
      >
    ).call(drag);

    // --- Tick ---
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x!)
        .attr('y1', (d) => (d.source as GraphNode).y!)
        .attr('x2', (d) => (d.target as GraphNode).x!)
        .attr('y2', (d) => (d.target as GraphNode).y!);

      node.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!);
    });

    // --- Cleanup ---
    return () => {
      simulation.stop();
      simulationRef.current = null;
    };
  }, [nodes, links, viewMode, onNodeClick]);

  return (
    <svg
      ref={svgRef}
      className='w-full h-full'
    />
  );
}
