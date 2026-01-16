/**
 * RecipeGraphVisualization Component
 * Renders a condensation graph using D3 with DAG layout
 * Shows recipe relationships with interactive nodes and edges
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type {
  CondensationGraph,
  CondensationNode,
  CondensationEdge,
} from '@/utils/condensationGraph';

interface RecipeGraphVisualizationProps {
  graph: CondensationGraph;
  onNodeClick?: (node: CondensationNode) => void;
  onEdgeClick?: (edge: CondensationEdge) => void;
}

export function RecipeGraphVisualization({
  graph,
  onNodeClick,
  onEdgeClick,
}: RecipeGraphVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Handle responsive resize with debouncing
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    // Initial size
    updateDimensions();

    // Debounced resize handler
    let resizeTimeout: number | undefined;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(updateDimensions, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current || !graph.nodes.length) return;

    const { width, height } = dimensions;

    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove();

    // Create SVG with zoom/pan
    const svg = d3.select(svgRef.current);

    const g = svg.append('g').attr('class', 'graph-container');

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Initial transform (center view)
    svg.call(zoom.transform as any, d3.zoomIdentity.translate(50, 50));

    // Create hierarchical layout using force simulation
    // (We'll use a simple force layout for now, can upgrade to d3-dag later)
    const simulation = d3
      .forceSimulation(graph.nodes as any)
      .force(
        'link',
        d3
          .forceLink(graph.edges)
          .id((d: any) => d.id)
          .distance(150)
      )
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));

    // Create arrow marker for directed edges
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#999');

    // Draw edges
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graph.edges)
      .enter()
      .append('line')
      .attr('class', 'edge')
      .attr('stroke', (d) => (d.isMulti ? '#f59e0b' : '#94a3b8'))
      .attr('stroke-width', (d) => (d.isMulti ? 2 : 1))
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onEdgeClick?.(d);
      })
      .on('mouseenter', function () {
        d3.select(this).attr('stroke-opacity', 1);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke-opacity', 0.6);
      });

    // Draw nodes
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graph.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<any, CondensationNode>()
          .on('start', dragStarted)
          .on('drag', dragged)
          .on('end', dragEnded)
      );

    // Node circles
    node
      .append('circle')
      .attr('r', (d) => {
        // Size by recipe count
        if (d.type === 'scc') return 30;
        return 15 + Math.min(d.recipeCount * 2, 15);
      })
      .attr('fill', (d) => getNodeColor(d))
      .attr('stroke', (d) => (d.isCircular ? '#dc2626' : '#1e293b'))
      .attr('stroke-width', (d) => (d.isCircular ? 3 : 2))
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d.id);
        onNodeClick?.(d);
      })
      .on('mouseenter', (event, d) => {
        setHoveredNode(d.id);
        const baseRadius =
          d.type === 'scc' ? 30 : 15 + Math.min(d.recipeCount * 2, 15);
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('r', baseRadius * 1.2);
      })
      .on('mouseleave', (event, d) => {
        setHoveredNode(null);
        const baseRadius =
          d.type === 'scc' ? 30 : 15 + Math.min(d.recipeCount * 2, 15);
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('r', baseRadius);
      });

    // Node labels
    node
      .append('text')
      .text((d) => {
        if (d.type === 'scc') {
          return d.products && d.products.length > 3
            ? `${d.products.length} items`
            : d.productNames?.join(', ') || 'SCC';
        }
        return d.name || 'Unknown';
      })
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.type === 'scc' ? 45 : 35))
      .attr('font-size', '12px')
      .attr('fill', '#1e293b')
      .attr('pointer-events', 'none')
      .each(function (d) {
        // Wrap long text
        const text = d3.select(this);
        const words = (text.text() || '').split(/\s+/);
        if (words.length > 2) {
          text.text('');
          text
            .append('tspan')
            .attr('x', 0)
            .attr('dy', 0)
            .text(words.slice(0, 2).join(' '));
          text
            .append('tspan')
            .attr('x', 0)
            .attr('dy', '1.2em')
            .text(words.slice(2).join(' '));
        }
      });

    // Recipe count badge
    node
      .filter((d) => d.recipeCount > 1)
      .append('circle')
      .attr('cx', 20)
      .attr('cy', -20)
      .attr('r', 12)
      .attr('fill', '#3b82f6')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    node
      .filter((d) => d.recipeCount > 1)
      .append('text')
      .attr('x', 20)
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .attr('pointer-events', 'none')
      .text((d) => d.recipeCount);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragStarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [graph, dimensions, onNodeClick, onEdgeClick]);

  return (
    <div
      ref={containerRef}
      className='relative w-full h-full min-h-[600px]'
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className='border border-gray-300 rounded bg-gray-50'
      />

      {/* Legend */}
      <div className='absolute top-4 right-4 bg-white p-4 rounded shadow-lg border border-gray-200'>
        <h3 className='font-bold text-sm mb-2 text-gray-900'>Legend</h3>
        <div className='space-y-1 text-xs'>
          <div className='flex items-center gap-2'>
            <div className='w-4 h-4 rounded-full bg-blue-500 border-2 border-gray-800'></div>
            <span className='text-gray-700'>Product (1 recipe)</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-4 h-4 rounded-full bg-green-500 border-2 border-gray-800'></div>
            <span className='text-gray-700'>Product (2-3 recipes)</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-4 h-4 rounded-full bg-purple-500 border-2 border-gray-800'></div>
            <span className='text-gray-700'>Product (4+ recipes)</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-6 h-6 rounded-full bg-red-400 border-2 border-red-600'></div>
            <span className='text-gray-700'>Circular (SCC)</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-0.5 bg-orange-500'></div>
            <span className='text-gray-700'>Multiple recipes</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-0.5 bg-gray-400'></div>
            <span className='text-gray-700'>Single recipe</span>
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredNode && (
        <div className='absolute top-4 left-4 bg-white p-3 rounded shadow-lg border border-gray-200 max-w-xs'>
          {(() => {
            const node = graph.nodes.find((n) => n.id === hoveredNode);
            if (!node) return null;

            if (node.type === 'scc') {
              return (
                <>
                  <h4 className='font-bold text-sm text-gray-900'>
                    Circular Dependency
                  </h4>
                  <p className='text-xs mt-1 text-gray-700'>
                    {node.productNames?.join(', ')}
                  </p>
                  <p className='text-xs text-gray-500 mt-1'>
                    {node.recipeCount} total recipes
                  </p>
                </>
              );
            } else {
              return (
                <>
                  <h4 className='font-bold text-sm text-gray-900'>
                    {node.name}
                  </h4>
                  <p className='text-xs text-gray-500'>
                    {node.recipeCount} recipe{node.recipeCount !== 1 ? 's' : ''}
                  </p>
                </>
              );
            }
          })()}
        </div>
      )}
    </div>
  );
}

// Helper function to determine node color based on recipe count
function getNodeColor(node: CondensationNode): string {
  if (node.isCircular) return '#fca5a5'; // Light red for SCCs

  if (node.recipeCount === 0) return '#cbd5e1'; // Gray for raw resources
  if (node.recipeCount === 1) return '#60a5fa'; // Blue
  if (node.recipeCount <= 3) return '#4ade80'; // Green
  return '#a78bfa'; // Purple for many options
}
