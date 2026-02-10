import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import {
  graphStratify,
  sugiyama,
  layeringLongestPath,
  decrossTwoLayer,
  coordQuad,
} from 'd3-dag';
import type { CondensationGraph, CondensationNode } from '@/types';
import { validateGraphIntegrity } from '@/utils/dagIntegrity';

interface Props {
  graph: CondensationGraph;
}

export function SugiyamaGraphVisualization({ graph }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !graph.nodes.length) return;

    validateGraphIntegrity(graph);

    // 1. Setup SVG and Zoom
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const g = svg.append('g');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);

    try {
      // 2. Map Parent Relationships for d3-dag
      // In our logic: Source (Producer) -> Target (Consumer)
      // d3-dag expects: node.parentIds = [the nodes that come BEFORE it]
      const parentMap = new Map<string, string[]>();
      graph.nodes.forEach((n) => parentMap.set(n.id, []));

      graph.edges.forEach((edge) => {
        const parents = parentMap.get(edge.target) || [];
        if (!parents.includes(edge.source)) parents.push(edge.source);
        parentMap.set(edge.target, parents);
      });

      const dagData = graph.nodes.map((node) => ({
        id: node.id,
        parentIds: parentMap.get(node.id) || [],
      }));

      // 3. Configure and Run Sugiyama Layout
      const stratify = graphStratify();
      // Diagnostic Check
      console.log('📊 DAG Connectivity Check:');
      const nodesWithParents = dagData.filter(
        (d) => d.parentIds.length > 0,
      ).length;
      console.log(
        `   Nodes: ${dagData.length}, Nodes with Parents: ${nodesWithParents}`,
      );

      if (nodesWithParents === 0) {
        console.warn('⚠️ ZERO dependencies found. Layout will be flat.');
      }
      // End Diagnosit
      const dag = stratify(dagData);

      const layout = sugiyama()
        .layering(layeringLongestPath())
        .decross(decrossTwoLayer())
        .coord(coordQuad())
        .nodeSize(() => [150, 100]); // [width, height] spacing

      const { width: lWidth, height: lHeight } = layout(dag);

      // 4. Draw Edges (Curved Paths)
      const line = d3
        .line<{ x: number; y: number }>()
        .x((d) => d.x)
        .y((d) => d.y)
        .curve(d3.curveBasis);

      svg
        .append('defs')
        .append('marker')
        .attr('id', 'sugi-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#94a3b8');

      g.append('g')
        .attr('class', 'links')
        .selectAll('path')
        .data(dag.links())
        .enter()
        .append('path')
        .attr('d', (d: any) => {
          // d3-dag stores routing points in d.points
          // We ensure they exist and pass them to the line generator
          const points = d.points;
          if (!points || points.length === 0) return null;
          return line(points);
        })
        .attr('fill', 'none')
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#sugi-arrow)');

      // 5. Draw Nodes
      const nodeDataMap = new Map(graph.nodes.map((n) => [n.id, n]));

      const nodes = g
        .append('g')
        .selectAll('g')
        .data(dag.nodes())
        .enter()
        .append('g')
        .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);

      nodes
        .append('rect')
        .attr('x', -60)
        .attr('y', -25)
        .attr('width', 120)
        .attr('height', 50)
        .attr('rx', 4)
        .attr('fill', (d: any) => {
          const original = nodeDataMap.get(d.data.id);
          return (
            original?.familyColor || (original?.isCircular ? '#fca5a5' : '#fff')
          );
        })
        .attr('stroke', (d: any) =>
          nodeDataMap.get(d.data.id)?.isCircular ? '#dc2626' : '#94a3b8',
        )
        .attr('stroke-width', 2);

      nodes
        .append('text')
        .text((d: any) => {
          const n = nodeDataMap.get(d.data.id);
          if (n?.type === 'scc') return `SCC (${n.products?.length})`;
          return n?.name || 'Unknown';
        })
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '10px')
        .attr('class', 'select-none pointer-events-none')
        .attr('fill', '#1e293b');

      // 6. Auto-fit to view
      const svgBox = svgRef.current.getBoundingClientRect();
      const scale =
        Math.min(svgBox.width / lWidth, svgBox.height / lHeight) * 0.8;
      g.attr(
        'transform',
        `translate(${(svgBox.width - lWidth * scale) / 2}, 50) scale(${scale})`,
      );
    } catch (e) {
      console.error('Sugiyama Layout Error:', e);
    }
  }, [graph]);

  return (
    <div className='w-full h-full bg-slate-50 border rounded-lg overflow-hidden'>
      <svg
        ref={svgRef}
        className='w-full h-full'
      />
    </div>
  );
}
