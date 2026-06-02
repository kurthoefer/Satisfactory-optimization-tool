/**
 * GraphCanvas.tsx
 *
 * Rendering terminal for the graph visualization.
 * Receives pre-filtered { nodes, links } from the graph builder.
 *
 * Orchestrates:
 *   1. SVG setup and zoom
 *   2. Rendering (delegated to drawLinks + drawNodes)
 *   3. Layout (delegated to forceLayout, future: d3-dag)
 *   4. Hover tooltip (React panel, driven by D3 mouse events)
 *
 * Does NOT know about products, recipes, URLs, or traversal rules.
 * Data goes in, visuals come out, interactions bubble up.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

import type { GraphNode, GraphEdge, Product } from '@/types';
import { drawLinks } from './renderers/drawLinks';
import { drawNodes } from './renderers/drawNodes';
import { createForceLayout } from './layouts/forceLayout';

// ============================================================================
// PROPS
// ============================================================================

interface GraphCanvasProps {
  nodes: GraphNode[];
  links: GraphEdge[];
  selectedProduct: Product | null;
  onNodeClick?: (nodeId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function GraphCanvas({
  nodes,
  links,
  selectedProduct,
  onNodeClick,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Stable callback ref so the D3 effect doesn't re-run on hover changes
  const hoveredNodeRef = useRef(setHoveredNode);
  hoveredNodeRef.current = setHoveredNode;

  const onHover = useCallback((node: GraphNode | null) => {
    hoveredNodeRef.current(node);
  }, []);

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

    // --- Render (order matters: links behind nodes) ---
    const linkSelection = drawLinks(g, links);
    const nodeSelection = drawNodes(g, nodes, selectedProduct);

    // --- Hover events ---
    nodeSelection
      .on('mouseenter', (_event, d) => onHover(d))
      .on('mouseleave', () => onHover(null));

    // --- Layout ---
    const { cleanup } = createForceLayout({
      width,
      height,
      nodes,
      links,
      nodeSelection,
      linkSelection,
      onNodeClick,
    });

    cleanupRef.current = cleanup;

    return () => {
      cleanup();
      cleanupRef.current = null;
    };
  }, [nodes, links, onNodeClick, onHover]);

  return (
    <div className='absolute inset-0 overflow-hidden'>
      <svg
        ref={svgRef}
        className='w-full h-full'
      />
      {hoveredNode && <NodeInfoPanel node={hoveredNode} />}
    </div>
  );
}

// ============================================================================
// INFO PANEL
// ============================================================================

/** Clean up raw form strings like "RF_SOLID" → "Solid" */
function formatForm(form: string): string {
  return form
    .replace(/^RF_/, '')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function NodeInfoPanel({ node }: { node: GraphNode }) {
  const { type, data } = node.payload;

  if (!data) return null;

  if (type === 'product' && 'name' in data) {
    return (
      <div className='absolute bottom-4 left-4 z-10 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl text-sm border shadow-sm max-w-xs pointer-events-none'>
        <div className='font-semibold text-gray-900'>{data.name}</div>
        <div className='text-gray-500 text-xs mt-1'>
          {formatForm(data.form)} · {data.category}
        </div>
        <div className='font-mono text-[10px] text-gray-400 mt-1'>
          {node.id}
        </div>
      </div>
    );
  }

  if (type === 'recipe' && 'displayName' in data) {
    return (
      <div className='absolute bottom-4 left-4 z-10 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl text-sm border shadow-sm max-w-xs pointer-events-none'>
        <div className='font-semibold text-gray-900'>{data.displayName}</div>
        <div className='text-gray-500 text-xs mt-1'>
          {data.type} · {data.producedIn}
        </div>
        <div className='font-mono text-[10px] text-gray-400 mt-1'>
          {node.id}
        </div>
      </div>
    );
  }

  return null;
}
