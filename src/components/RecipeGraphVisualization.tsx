import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type {
  CondensationGraph,
  CondensationNode,
  CondensationEdge,
} from '@/types';

interface Props {
  graph: CondensationGraph;
  onNodeClick?: (node: CondensationNode) => void;
}

export function RecipeGraphVisualization({ graph, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle responsive resize
  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      const { width, height } = containerRef.current!.getBoundingClientRect();
      setDimensions({ width, height: Math.max(height, 600) });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !graph.nodes.length) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const g = svg.append('g');

    // Zoom/Pan setup
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);

    // Simulation logic
    const simulation = d3
      .forceSimulation(graph.nodes as any)
      .force(
        'link',
        d3
          .forceLink(graph.edges)
          .id((d: any) => d.id)
          .distance(120),
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));

    // Arrowhead marker definition
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94a3b8');

    // Draw Edges
    const link = g
      .append('g')
      .selectAll('line')
      .data(graph.edges)
      .enter()
      .append('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrow)');

    // Draw Nodes
    const node = g
      .append('g')
      .selectAll('g')
      .data(graph.nodes)
      .enter()
      .append('g')
      .call(
        d3
          .drag<any, any>()
          .on('start', (e, d) => {
            if (!e.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on('end', (e, d) => {
            if (!e.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    // Node shape: Circle
    node
      .append('circle')
      .attr('r', (d) => (d.type === 'scc' ? 25 : 18))
      .attr(
        'fill',
        (d) => d.familyColor || (d.isCircular ? '#fca5a5' : '#60a5fa'),
      )
      .attr('stroke', (d) => (d.isCircular ? '#dc2626' : '#1e293b'))
      .attr('stroke-width', 2)
      .on('click', (_, d) => onNodeClick?.(d));

    // Simple Labels
    node
      .append('text')
      .text((d) =>
        d.type === 'scc' ? `SCC (${d.products?.length})` : d.name || 'Item',
      )
      .attr('dy', 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('class', 'select-none pointer-events-none');

    // Update positions
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graph, dimensions]);

  return (
    <div
      ref={containerRef}
      className='w-full h-full bg-slate-50 border rounded-lg overflow-hidden'
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}
