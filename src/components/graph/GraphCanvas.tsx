import { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

import type { GraphNode, GraphEdge, Product } from '@/types';
import { appendGooFilter, drawHulls } from './renderers/drawHulls';
import { drawLinks } from './renderers/drawLinks';
import { drawNodes } from './renderers/drawNodes';
import { createEmphasisPainter } from './renderers/nodeEmphasis';
import { createForceLayout } from './layouts/forceLayout';
import { NodeTooltipContent } from './NodeTooltipContent';
import { pinnedStore } from '@/lib/pinned';
import { CursorTooltip } from '@/components/ui/CursorTooltip';

// ============================================================================
// HOVER STATE
// ============================================================================

interface HoverState {
  node: GraphNode;
  x: number;
  y: number;
}

// ============================================================================
// PROPS
// ============================================================================

interface GraphCanvasProps {
  nodes: GraphNode[];
  links: GraphEdge[];
  selectedProduct: Product | null;
  /** Optional extra hook fired alongside the pin toggle on node click. */
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
  const [hover, setHover] = useState<HoverState | null>(null);

  // Insulate the D3 effect from hover updates: handlers reach the latest setter
  // through a ref, so hover/coord changes never re-run the heavy effect.
  const setHoverRef = useRef(setHover);
  setHoverRef.current = setHover;

  const onEnter = useCallback((node: GraphNode, x: number, y: number) => {
    setHoverRef.current({ node, x, y });
  }, []);

  const onMove = useCallback((x: number, y: number) => {
    setHoverRef.current((prev) => (prev ? { ...prev, x, y } : prev));
  }, []);

  const onLeave = useCallback(() => {
    setHoverRef.current(null);
  }, []);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    appendGooFilter(svg);

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

    // --- Render (paint order: hulls behind, then links, then nodes) ---
    const hulls = drawHulls(g, nodes);
    const linkSelection = drawLinks(g, links);
    const nodeSelection = drawNodes(g, nodes);

    // --- Hover events ---
    nodeSelection
      .on('mouseenter', (event, d) => onEnter(d, event.clientX, event.clientY))
      .on('mousemove', (event) => onMove(event.clientX, event.clientY))
      .on('mouseleave', () => onLeave());

    // --- Layout: node click toggles pin membership ---
    const { simulation, cleanup } = createForceLayout({
      width,
      height,
      nodes,
      links,
      nodeSelection,
      linkSelection,
      onNodeClick: (id) => {
        pinnedStore.toggle(id);
        onNodeClick?.(id);
      },
    });

    cleanupRef.current = cleanup;

    simulation.on('tick.hulls', hulls.update);

    // --- Emphasis (target + pinned: enlarge + thumbnail) and flow classes ---
    const paintEmphasis = createEmphasisPainter(
      svg,
      nodeSelection,
      selectedProduct,
    );
    const repaint = () => {
      paintEmphasis();
      linkSelection.classed('flow', (d) => {
        const s = typeof d.source === 'string' ? d.source : d.source.id;
        const t = typeof d.target === 'string' ? d.target : d.target.id;
        return pinnedStore.has(s) || pinnedStore.has(t);
      });
    };
    repaint();
    const unsubPinned = pinnedStore.subscribe(repaint);

    return () => {
      unsubPinned();
      cleanup();
      cleanupRef.current = null;
    };
  }, [nodes, links, selectedProduct, onNodeClick, onEnter, onMove, onLeave]);

  return (
    <div className='absolute inset-0 overflow-hidden'>
      <svg
        ref={svgRef}
        className='w-full h-full'
      />
      <CursorTooltip
        active={!!hover}
        x={hover?.x ?? 0}
        y={hover?.y ?? 0}
      >
        {hover && <NodeTooltipContent node={hover.node} />}
      </CursorTooltip>
    </div>
  );
}
